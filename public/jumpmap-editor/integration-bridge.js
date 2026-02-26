(function initJumpmapIntegrationBridge() {
  const clamp = (value, min, max, fallback) => {
    const num = Number(value);
    const base = Number.isFinite(num) ? num : fallback;
    return Math.min(max, Math.max(min, base));
  };

  const createEventBus = () => {
    const listeners = new Set();

    const emit = (event, payload = {}) => {
      listeners.forEach((listener) => {
        try {
          listener({ event, payload, at: Date.now() });
        } catch (error) {
          console.error('[JumpmapBridge listener error]', error);
        }
      });
    };

    const on = (listener) => {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    return { emit, on };
  };

  const createNoopQuizGateway = () => ({
    requestQuiz: async () => ({
      accepted: false,
      reason: 'quiz_gateway_not_connected'
    })
  });

  const requiredContractFields = ['playerId', 'zoneId', 'timestamp', 'source'];

  const normalizeRuleAdapter = (options = {}) => {
    const raw = options.ruleAdapter;
    if (raw && typeof raw.getResourceConfig === 'function') return raw;
    const factory = window.JumpmapGameRuleAdapter?.createRuleAdapter;
    if (typeof factory === 'function') {
      return factory(options.modeId || 'jumpmap', options.ruleOptions || {});
    }
    return {
      id: 'jumpmap',
      resourceKey: 'gauge',
      getResourceConfig: () => ({
        key: 'gauge',
        min: Number.isFinite(Number(options.minGauge)) ? Number(options.minGauge) : 0,
        max: Number.isFinite(Number(options.maxGauge)) ? Number(options.maxGauge) : 100,
        initial: Number.isFinite(Number(options.initialGauge)) ? Number(options.initialGauge) : 100
      }),
      getActionCost: () => 0,
      getQuizReward: () => 0,
      getWrongDelayMs: () => 0
    };
  };

  const createBridge = (options = {}) => {
    const ruleAdapter = normalizeRuleAdapter(options);
    const resourceConfig = ruleAdapter.getResourceConfig();
    const resourceKey = resourceConfig?.key || ruleAdapter.resourceKey || 'gauge';
    const minGauge = Number.isFinite(Number(resourceConfig?.min))
      ? Number(resourceConfig.min)
      : (Number.isFinite(Number(options.minGauge)) ? Number(options.minGauge) : 0);
    const maxGauge = Number.isFinite(Number(resourceConfig?.max))
      ? Number(resourceConfig.max)
      : (Number.isFinite(Number(options.maxGauge)) ? Number(options.maxGauge) : 100);
    const DEFAULT_PLAYER_KEY = '__default__';
    const playerResources = new Map();
    const normalizePlayerKey = (playerId) => (
      playerId == null || playerId === '' ? DEFAULT_PLAYER_KEY : String(playerId)
    );
    const ensurePlayerResource = (playerId) => {
      const key = normalizePlayerKey(playerId);
      if (!playerResources.has(key)) {
        playerResources.set(key, {
          gauge: clamp(resourceConfig?.initial, minGauge, maxGauge, maxGauge)
        });
      }
      return { key, state: playerResources.get(key) };
    };
    const getPlayerGaugeValue = (playerId) => ensurePlayerResource(playerId).state.gauge;
    let quizGateway = options.quizGateway && typeof options.quizGateway.requestQuiz === 'function'
      ? options.quizGateway
      : createNoopQuizGateway();
    const { emit, on } = createEventBus();
    const strictContract = options.strictContract !== false;
    let bridgeDroppedEvents = 0;

    const snapshotForPlayer = (playerId) => ({
      gauge: getPlayerGaugeValue(playerId),
      minGauge,
      maxGauge,
      resourceKey,
      modeId: ruleAdapter.id || options.modeId || 'jumpmap',
      bridgeDroppedEvents,
      playerId: normalizePlayerKey(playerId)
    });

    const snapshot = () => snapshotForPlayer(DEFAULT_PLAYER_KEY);

    const getMissingContractFields = (payload = {}) => requiredContractFields.filter((field) => {
      const value = payload[field];
      return value == null || value === '';
    });

    const dropContractEvent = (event, payload = {}) => {
      const missing = getMissingContractFields(payload);
      bridgeDroppedEvents += 1;
      console.warn(`[JumpmapBridge] dropped event "${event}" due to missing fields: ${missing.join(', ')}`);
      emit('bridge:contract:dropped', {
        event,
        missing,
        bridgeDroppedEvents
      });
      return {
        accepted: false,
        reason: 'contract_missing_fields',
        missing,
        bridgeDroppedEvents
      };
    };

    const ensureContract = (event, payload = {}) => {
      if (!strictContract) return { ok: true, payload };
      const missing = getMissingContractFields(payload);
      if (!missing.length) return { ok: true, payload };
      return { ok: false, result: dropContractEvent(event, payload) };
    };

    const setGauge = (value, meta = {}) => {
      const { key, state: playerState } = ensurePlayerResource(meta.playerId);
      const next = clamp(value, minGauge, maxGauge, playerState.gauge);
      if (next === playerState.gauge) return snapshotForPlayer(key);
      const prev = playerState.gauge;
      playerState.gauge = next;
      emit('resource:changed', { prev, next, resourceKey, ...meta });
      emit('gauge:changed', { prev, next, ...meta });
      return snapshotForPlayer(key);
    };

    const consumeGauge = (amount, meta = {}) => {
      const { key, state: playerState } = ensurePlayerResource(meta.playerId);
      const next = clamp(
        playerState.gauge - Math.max(0, Number(amount) || 0),
        minGauge,
        maxGauge,
        playerState.gauge
      );
      const changed = next !== playerState.gauge;
      const prev = playerState.gauge;
      playerState.gauge = next;
      if (changed) {
        emit('resource:changed', { prev, next, mode: 'consume', resourceKey, ...meta });
        emit('gauge:changed', { prev, next, mode: 'consume', ...meta });
      }
      if (playerState.gauge <= minGauge + 1e-6) {
        emit('resource:empty', { resourceKey, ...meta });
        emit('gauge:empty', { ...meta });
      }
      return {
        allowed: playerState.gauge > minGauge + 1e-6,
        ...snapshotForPlayer(key)
      };
    };

    const refillGauge = (amount, meta = {}) => {
      const { key, state: playerState } = ensurePlayerResource(meta.playerId);
      const next = clamp(
        playerState.gauge + Math.max(0, Number(amount) || 0),
        minGauge,
        maxGauge,
        playerState.gauge
      );
      const prev = playerState.gauge;
      playerState.gauge = next;
      if (next !== prev) {
        emit('resource:changed', { prev, next, mode: 'refill', resourceKey, ...meta });
        emit('gauge:changed', { prev, next, mode: 'refill', ...meta });
      }
      return snapshotForPlayer(key);
    };

    const consumeAction = (action, context = {}, meta = {}) => {
      const cost = Math.max(0, Number(ruleAdapter.getActionCost?.(action, context)) || 0);
      const result = consumeGauge(cost, { ...meta, action, resourceKey });
      return { cost, ...result };
    };

    const applyQuizOutcome = (quizResult = {}, context = {}, meta = {}) => {
      const refill = Math.max(0, Number(ruleAdapter.getQuizReward?.(quizResult, context)) || 0);
      const wrongDelayMs = Math.max(0, Number(ruleAdapter.getWrongDelayMs?.(quizResult, context)) || 0);
      const snapshotState = refillGauge(refill, { ...meta, mode: 'quiz_reward', resourceKey });
      const result = {
        refillAmount: refill,
        wrongDelayMs,
        ...snapshotState
      };
      emit('quiz:rewarded', result);
      return result;
    };

    const setQuizGateway = (nextGateway) => {
      if (nextGateway && typeof nextGateway.requestQuiz === 'function') {
        quizGateway = nextGateway;
      }
      return quizGateway;
    };

    const requestQuiz = async (payload = {}) => {
      const contract = ensureContract('quiz:requested', payload);
      if (!contract.ok) return contract.result;
      emit('quiz:requested', payload);
      try {
        const result = await quizGateway.requestQuiz(payload);
        emit('quiz:resolved', result || {});
        return result;
      } catch (error) {
        emit('quiz:failed', { message: error?.message || 'unknown_error' });
        return { accepted: false, reason: 'quiz_gateway_error' };
      }
    };

    return {
      on,
      emit,
      snapshot,
      snapshotForPlayer,
      getGauge: (playerId) => getPlayerGaugeValue(playerId),
      getPlayerGauge: (playerId) => getPlayerGaugeValue(playerId),
      getResourceKey: () => resourceKey,
      getModeId: () => ruleAdapter.id || options.modeId || 'jumpmap',
      getBridgeDroppedEvents: () => bridgeDroppedEvents,
      setGauge,
      setPlayerGauge: (playerId, value, meta = {}) => setGauge(value, { ...meta, playerId }),
      consumeGauge,
      refillGauge,
      consumeAction,
      applyQuizOutcome,
      requestQuiz,
      setQuizGateway,
      getRuleAdapter: () => ruleAdapter
    };
  };

  window.JumpmapIntegrationBridge = {
    createBridge,
    createNoopQuizGateway
  };
})();
