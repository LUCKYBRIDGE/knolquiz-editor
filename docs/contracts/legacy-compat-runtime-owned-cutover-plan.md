# Legacy Compat Runtime-Owned Cutover Plan (V1)

Date: 2026-02-26
Phase: R6 (runtime cutover prep)

## 목적

`/jumpmap-runtime/legacy/` 기본 경로가 이미 compat target을 사용하도록 전환된 상태에서,
다음 컷오버 단계(`runtime` split에서 `public/jumpmap-editor` 제거)를 준비하기 위한
"최소 의존 세트"와 "1차 복제 목록"을 고정한다.

이 문서는 `docs/contracts/legacy-compat-asset-audit.json` snapshot을 기준으로 작성한다.

## 입력 Snapshot (기준선)

- source: `docs/contracts/legacy-compat-asset-audit.json`
- summary:
  - `html=9`
  - `js=16`
  - `css=0`
  - `prefixHints=6`
  - `uniqueTargets=19`
  - `missing=0`

Top-level buckets:

- `public/jumpmap-editor = 11`
- `public/quiz = 5`
- `public/shared = 2`
- `public/quiz_background = 1`

## 분류 (컷오버 관점)

### 1) 이미 Runtime-Owned (유지 대상)

현재 audit 기준으로 `compat` 실행에 필요하지만 이미 runtime 쪽 자산으로 보는 항목들:

- `public/quiz/core/engine.js`
- `public/quiz/core/bank.js`
- `public/quiz/core/selection.js`
- `public/quiz/core/scoring.js`
- `public/quiz/core/events.js`
- `public/shared/local-game-records.js`
- `public/shared/maps/jumpmap-01.json`
- `public/quiz_background/Geumgangjeondo.jpg`

의미:

- `public/jumpmap-editor` 제거 컷오버 시에도 위 항목들은 runtime repo에 남겨야 한다.
- `compat` target 이관 작업에서 새로 복제할 대상이 아니라, 경로 안정성/참조 정합성 확인 대상이다.

### 2) Editor Path 결합 (이관 후보 1차, 파일 단위)

`compat`가 현재 editor HTML을 fetch/inject 하면서 직접 필요로 하는 editor 경로 자산(정적 audit 기준):

- `public/jumpmap-editor` (디렉터리 root path 참조)
- `public/jumpmap-editor/editor.css`
- `public/jumpmap-editor/editor.js`
- `public/jumpmap-editor/game-rule-adapter.js`
- `public/jumpmap-editor/geometry-utils.js`
- `public/jumpmap-editor/hitbox-utils.js`
- `public/jumpmap-editor/integration-bridge.js`
- `public/jumpmap-editor/map-io-utils.js`
- `public/jumpmap-editor/test-physics-utils.js`
- `public/jumpmap-editor/test-runtime.js`
- `public/jumpmap-editor/data/plates.json`

의미:

- `public/jumpmap-editor` 제거 전에 최소한 위 항목들과 동등 기능/경로가 runtime-owned 경로에 존재해야 한다.
- 1차 컷오버는 "파일 복제 + `<base href>`/target 경로 전환" 방식이 가장 작은 변경이다.

### 3) Prefix Hint (숨은 디렉터리 의존 가능성)

정적 audit가 파일을 직접 확정하지 못했지만, 문자열 prefix로 확인된 경로:

- `public/jumpmap-editor/textures/` (from `editor.js`, `test-runtime.js`)
- `public/quiz_plate/` (from `editor.js`)
- `public/quiz_sejong/` (from `editor.js`)
- `./` (from `test-runtime.js`, base-aware helper/fallback 맥락)

의미:

- 파일 단위 audit 결과만 복제하면 런타임 플레이에서 누락될 수 있다.
- 실제 runtime-owned 이관 1차에서는 최소한 아래 디렉터리를 "디렉터리 단위"로 포함하는 보수적 접근이 안전하다:
  - `public/jumpmap-editor/textures/`
  - `public/quiz_plate/`
  - `public/quiz_sejong/`

## 1차 복제 목록 (권장, 보수적 컷오버)

목표: `compat` target이 `public/jumpmap-editor` 없이도 동작하도록 runtime 내부 경로에 최소 자산 세트를 준비.

### A. Runtime-Owned 경로에 새로 준비할 대상 (editor-origin)

파일:

- `public/jumpmap-editor/editor.css`
- `public/jumpmap-editor/editor.js`
- `public/jumpmap-editor/game-rule-adapter.js`
- `public/jumpmap-editor/geometry-utils.js`
- `public/jumpmap-editor/hitbox-utils.js`
- `public/jumpmap-editor/integration-bridge.js`
- `public/jumpmap-editor/map-io-utils.js`
- `public/jumpmap-editor/test-physics-utils.js`
- `public/jumpmap-editor/test-runtime.js`
- `public/jumpmap-editor/data/plates.json`

디렉터리:

- `public/jumpmap-editor/textures/`
- `public/quiz_plate/`
- `public/quiz_sejong/`

문서(HTML shell):

- `public/jumpmap-editor/index.html`의 runtime compat용 사본 또는 재구성본
  - 목적: `compat/app.js`가 더 이상 `../../jumpmap-editor/index.html`를 fetch하지 않게 하기 위함

### B. Runtime에 이미 있는 것으로 간주하고 유지할 대상

- `public/quiz/core/*` (audit 기준 5 files)
- `public/shared/local-game-records.js`
- `public/shared/maps/jumpmap-01.json`
- `public/quiz_background/Geumgangjeondo.jpg`

## 구현 순서 (다음 컷오버용)

1. runtime 내부 compat source 경로(예: `public/jumpmap-runtime/legacy/runtime-owned/`) 생성
2. 위 "A" 항목 복제(파일 + 디렉터리)
3. `public/jumpmap-runtime/legacy/compat/app.js`에서 fetch 대상 URL을 runtime-owned index로 canary 분기 추가
4. 수동 검증:
   - 기본 compat
   - `legacyCompatTarget=0` fallback
   - `legacyCompatDebug=1` telemetry 확인
5. 안정화 후 기본 compat fetch 대상을 runtime-owned index로 전환
6. 마지막에 `scripts/jumpmap-split-repos.mjs`에서 runtime 복제 대상 `public/jumpmap-editor` 제거

## 컷오버 후 fallback 정책 (운영 기준)

- `runtime` split(`knolquiz-runtime`)에서는 `public/jumpmap-editor`가 제거되므로 아래 query는 "개발/monorepo 호환용"으로 취급한다:
  - `legacyCompatTarget=0` (direct fallback)
  - `legacyCompatSource=editor`
  - `legacyCompatAssetBase=editor`
- 실제 split runtime에서는 위 query가 들어와도 runtime-owned compat 경로로 자동 복귀(auto-recovery)하도록 유지한다.
- host panel/telemetry에서 requested/effective mode mismatch를 표시해 자동 복귀 여부를 확인할 수 있게 한다.

## 주의사항

- 이 문서는 "정적 감사 기반 1차 설계"다.
- 런타임 플레이 중 동적 생성 경로(예: 템플릿 문자열 기반 fetch)는 audit에서 `dynamic-template`로 분리되므로,
  실제 수동 검증 결과와 함께 컷오버 전 최종 확인이 필요하다.
- 현재 `dynamic-template` skip 예시는 `editor.js`의 cache-busting fetch 패턴이다.
