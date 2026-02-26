# 점프맵-퀴즈 브리지 이벤트 계약 (현재 기준)

작성일: 2026-02-22  
상태: 계약 초안 (분리 전 기준선)  
적용 코드: `public/jumpmap-editor/integration-bridge.js`, `public/jumpmap-editor/test-runtime.js`

---

## 1) 목적

이 문서는 `점프맵 런타임`과 `퀴즈코어(또는 퀴즈 게이트웨이)` 사이의 통신 계약을 고정한다.

분리 후 목표:
- 에디터 테스트모드와 운영 런타임이 같은 브리지 계약을 사용
- 퀴즈코어는 점프맵 전용 규칙(게이지 소모/회복)을 직접 모름
- 모드 어댑터 교체만으로 다른 게임 모드 확장 가능

---

## 2) 구현 기준 (현재 코드)

브리지 팩토리:
- `window.JumpmapIntegrationBridge.createBridge(options)`

핵심 옵션:
- `modeId`
- `strictContract` (기본 `true`)
- `ruleAdapter` 또는 `ruleOptions`
- `quizGateway` (`requestQuiz(payload)` 구현체)

브리지가 관리하는 기본 자원:
- 기본 `resourceKey = "gauge"` (점프맵 기준)

---

## 3) 공통 필수 필드 (계약 필드)

현재 `strictContract=true`일 때, `requestQuiz(payload)`에 대해 아래 필드가 필수이다.

- `playerId`
- `zoneId`
- `timestamp`
- `source`

누락 시 동작:
- 요청 drop
- `console.warn`
- 브리지 내부 카운터 증가 (`bridgeDroppedEvents`)
- 이벤트 발생:
  - `bridge:contract:dropped`

주의:
- 현재 구현상 `ensureContract(...)`는 `requestQuiz(...)` 경로에 직접 적용되어 있다.
- 런타임에서 `integration.emit(...)`로 직접 보내는 이벤트는 자동 계약검사를 거치지 않으므로, 런타임 쪽에서 동일 규칙을 지켜야 한다.

---

## 4) 브리지 공개 API 계약 (현재)

반환 객체 주요 메서드:

- `on(listener)`
- `emit(event, payload)`
- `snapshot()`
- `snapshotForPlayer(playerId)`
- `getGauge(playerId?)`
- `getPlayerGauge(playerId)`
- `getResourceKey()`
- `getModeId()`
- `getBridgeDroppedEvents()`
- `setGauge(value, meta?)`
- `setPlayerGauge(playerId, value, meta?)`
- `consumeGauge(amount, meta?)`
- `refillGauge(amount, meta?)`
- `consumeAction(action, context?, meta?)`
- `applyQuizOutcome(quizResult, context?, meta?)`
- `requestQuiz(payload)`
- `setQuizGateway(nextGateway)`
- `getRuleAdapter()`

---

## 5) 주요 요청/응답 계약

## 5.1 런타임 -> 브리지: 퀴즈 요청 (`requestQuiz`)

현재 테스트 런타임 예시 payload:

```js
{
  playerId: "player-1",
  playerIndex: 0,
  zoneId: "zone-1",
  reason: "manual_quiz_button",
  source: "jumpmap-test-runtime",
  timestamp: Date.now()
}
```

필수 필드(계약):
- `playerId: string`
- `zoneId: string`
- `source: string`
- `timestamp: number`

권장 필드:
- `playerIndex`
- `reason`
- 추후 `modeId`, `resourceKey`

## 5.2 브리지 -> 런타임: 퀴즈 요청 응답 (`requestQuiz` 반환값)

성공 응답(현재 기대):

```js
{
  accepted: true,
  question: { ... }
}
```

실패 응답 예시:

```js
{ accepted: false, reason: "quiz_gateway_not_connected" }
{ accepted: false, reason: "quiz_request_timeout" }
{ accepted: false, reason: "contract_missing_fields", missing: [...] }
```

---

## 6) 브리지 내부/외부 이벤트 계약 (주요 이벤트)

브리지 이벤트 버스(`on(listener)`)로 관측 가능한 이벤트들 (현재 구현 기준):

### 6.1 계약/오류/상태 이벤트
- `bridge:contract:dropped`
  - payload:
    - `event`
    - `missing: string[]`
    - `bridgeDroppedEvents`
- `quiz:failed`
  - payload:
    - `message`

### 6.2 자원(게이지) 관련 이벤트
- `resource:changed`
- `gauge:changed`
- `resource:empty`
- `gauge:empty`

공통 payload(예시):
- `prev`, `next`
- `mode` (`consume` | `refill` 등)
- `resourceKey`
- `playerId`
- `zoneId`
- `source`
- `timestamp`

주의:
- 현재 점프맵은 `gauge:*`와 `resource:*`를 동시에 발행한다.
- 다른 게임 모드 확장 시에는 `resource:*`를 우선 계약으로 보고, `gauge:*`는 점프맵 호환 alias로 유지하는 것을 권장한다.

### 6.3 퀴즈 관련 이벤트
- `quiz:requested`
- `quiz:resolved`
- `quiz:rewarded`
- `quiz:close` (런타임에서 `emit`)

현재 `quiz:close` 예시 payload (`test-runtime`):

```js
{
  playerId: "player-1",
  zoneId: "zone-1",
  next: "PLAYING",
  source: "jumpmap-test-runtime",
  timestamp: Date.now()
}
```

---

## 7) 룰 어댑터 계약 (모드별 정책)

브리지는 룰 어댑터를 통해 점프맵 전용 규칙을 분리한다.

현재 기대 메서드:
- `getResourceConfig()`
  - `{ key, min, max, initial }`
- `getActionCost(action, context)`
- `getQuizReward(quizResult, context)`
- `getWrongDelayMs(quizResult, context)`

점프맵 기본 의미:
- `resourceKey = "gauge"`
- `action = "move" | "jump" | "doubleJump"`

확장 원칙:
- 다른 게임 모드는 `resourceKey`와 정책만 교체
- 퀴즈코어는 여전히 문제/채점만 담당

---

## 8) 분리 후 고정 권장 사항 (중요)

레포 분리 전/직후 아래를 고정하는 것을 권장한다.

1. 모든 브리지 이벤트 payload에 공통 메타 필드 유지
- `playerId`, `zoneId`, `source`, `timestamp`

2. 이벤트 이름 namespace 유지
- `quiz:*`, `resource:*`, `bridge:*`

3. 점프맵 전용 alias 이벤트는 점진 축소
- `gauge:*`는 호환용으로 유지 가능
- 신규 모드는 `resource:*` 중심으로 구현

4. 브리지 계약 버전 필드 도입 (후속)
- 현재 미도입
- 분리 직후 `bridgeContractVersion` 추가 권장

---

## 9) 테스트/검증 포인트

- `requestQuiz`에서 필수 필드 누락 시 `bridge:contract:dropped` 발생하는가
- 멀티플레이에서 `playerId` 기준 게이지/퀴즈 상태가 섞이지 않는가
- 정답/오답 후 `applyQuizOutcome` 결과가 플레이어별로 다르게 반영되는가
- 다른 모드 어댑터로 교체 시 퀴즈코어 코드 변경 없이 동작하는가

