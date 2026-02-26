(function initJumpmapGameRuleAdapter() {
  const clamp = (value, min, max, fallback) => {
    const parsed = Number(value);
    const base = Number.isFinite(parsed) ? parsed : fallback;
    return Math.min(max, Math.max(min, base));
  };

  const asPositive = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  };

  const createJumpmapRuleAdapter = (options = {}) => {
    const min = Number.isFinite(Number(options.min)) ? Number(options.min) : 0;
    const max = Number.isFinite(Number(options.max)) ? Number(options.max) : 100;
    const initial = clamp(options.initial, min, max, max);
    const resourceKey = typeof options.resourceKey === 'string' && options.resourceKey.trim()
      ? options.resourceKey.trim()
      : 'gauge';

    const actionCost = {
      move: asPositive(options.moveCost, 4),
      jump: asPositive(options.jumpCost, 18),
      doubleJump: asPositive(options.doubleJumpCost, 18)
    };

    const quizReward = {
      correct: asPositive(options.correctReward, 32),
      wrong: asPositive(options.wrongReward, 0)
    };

    const wrongDelayMs = asPositive(options.wrongDelayMs, 3000);

    return {
      id: 'jumpmap',
      resourceKey,
      getResourceConfig: () => ({
        key: resourceKey,
        min,
        max,
        initial
      }),
      getActionCost: (action, context = {}) => {
        if (action === 'move') {
          const dt = Math.max(0, Number(context.dtSec ?? context.dt) || 0);
          return dt > 0 ? actionCost.move * dt : actionCost.move;
        }
        return actionCost[action] ?? 0;
      },
      getQuizReward: (result = {}) => (result.correct ? quizReward.correct : quizReward.wrong),
      getWrongDelayMs: (result = {}) => (result.correct ? 0 : wrongDelayMs)
    };
  };

  const createRuleAdapter = (modeId = 'jumpmap', options = {}) => {
    if (modeId === 'jumpmap') return createJumpmapRuleAdapter(options);
    return createJumpmapRuleAdapter(options);
  };

  window.JumpmapGameRuleAdapter = {
    createRuleAdapter
  };
})();
