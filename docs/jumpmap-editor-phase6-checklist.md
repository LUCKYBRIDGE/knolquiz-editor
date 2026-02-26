# Jumpmap Editor Phase 6 Checklist

Date: 2026-02-06  
Scope: `public/jumpmap-editor/*`

## 0) 레포 분리 R6 종료 준비 상태 (2026-02-26 업데이트)

이 문서는 원래 에디터 Phase 6 수동 점검표이지만, 현재는 레포 분리 `R6` 종료 직전 상태를 함께 기록한다.

### 0-1) 자동검증으로 완료된 항목 (R6)
- [x] `nolquiz-runtime` split에서 `public/jumpmap-editor` 제거 컷오버 적용
- [x] runtime legacy compat 기본 경로가 `runtime-owned source + asset-base`로 동작
- [x] `editor fallback` 요청(`legacyCompatTarget=0`, `legacyCompatSource=editor`, `legacyCompatAssetBase=editor`)의 split runtime auto-recovery 동작 확인
- [x] `legacy compat` helper/inject/pipeline 자동검증 체인 통합
- [x] 브라우저 E2E(Playwright) 1차 통합 및 상호작용 케이스 검증
  - 범위: `legacy` 기본 진입, fallback auto-recovery, compat editor query auto-recovery, `auto-start test mode -> restart -> quiz panel roundtrip`
- [x] hidden dependency 보강 및 계약 감사 추가
  - `quiz/data`, `quiz/nets`가 runtime compat mirror/split 검증에 포함됨
  - `docs/contracts/legacy-compat-asset-audit.json`에 동적 의존 계약(snapshot) 기록

### 0-2) 최신 자동검증 기준선 (R6)
- `node scripts/jumpmap-verify-split.mjs --skip-smoke` → `pass=37, fail=0`
- `node scripts/jumpmap-verify-split.mjs --skip-smoke --with-browser-e2e --browser-e2e-timeout-ms 30000` → `pass=38, fail=0`
- `node scripts/jumpmap-verify-split.mjs --with-browser-e2e` → `pass=66, fail=0`
- `node scripts/jumpmap-verify-split.mjs --with-browser-e2e --browser-e2e-headed --browser-e2e-timeout-ms 30000` → `pass=66, fail=0` (2026-02-26, GUI 환경 확인)

### 0-3) 남은 수동 확인 항목 (R6 종료 전)
- [x] 로컬 GUI 환경에서 headed browser E2E 1회 실행
  - 예: `node scripts/jumpmap-verify-split.mjs --with-browser-e2e --browser-e2e-headed --browser-e2e-timeout-ms 30000`
- [x] `legacy` host 패널 UX 확인 (`compat-mode-row`, telemetry 문구, fallback 안내 문구)
  - Playwright E2E로 대체 검증: `compat-mode-row`, `compat-event-row`, `compat-events-row(debug)`, `fallback-row/link` assert 추가
- [x] 필요 시 운영 시나리오 1회 수동 확인 (런처 → 점프맵 → legacy/compat 진입)
  - 이번 `R6` 종료 기준에서는 생략(waive): headed browser E2E(`cases=4`) + host 패널 UX E2E assert로 대체 검증
  - 실제 운영 동선 spot-check는 `R7`/운영 이관 체크에서 재수행 권장

### 0-4) 종료 기준 (R6)
- 위 `0-3` 수동 항목을 확인한 뒤, 결과를 `docs/jumpmap-editor-status.md`에 기록하고 R6 종료/다음 단계로 이관한다.
- 2026-02-26: `0-3` 항목 정리 완료(1개 항목은 `필요 시` 조건에 따라 waive). `R6` 종료 준비 기준 충족.

## 1) 준비
1. `node scripts/jumpmap-local-serve.mjs`로 로컬 서버 실행
2. `http://127.0.0.1:5173/jumpmap-editor/` 접속
3. 브라우저 콘솔 에러가 없는지 확인

## 1-1) 자동 검증
1. 프로젝트 루트에서 `node scripts/jumpmap-phase6-validate.mjs` 실행
2. `pass=33, fail=0` 확인

Expected:
- `editor/map-io/runtime` 관련 스크립트 구문 오류 없음
- map-io의 정상/레거시/오류 JSON 처리 및 라운드트립 유지 확인
- 점프 물리 핵심 회귀(지상점프/공중점프/낙하점프금지/착지리셋) 확인

## 2) 프로파일 저장/적용 검증
1. 발판 1개 배치
2. 오브젝트 `scale`, `crop`, `hitboxes`를 모두 수정
3. `프로파일 저장` 클릭
4. 같은 스프라이트를 새로 배치
5. 새 오브젝트가 저장한 `scale/crop/hitboxes`와 동일한지 확인

Expected:
- 새 배치 오브젝트에 프로파일이 즉시 반영
- 팔레트 카드에 `PF` 배지 표시

## 3) 레거시 맵 호환 검증
1. `spriteProfiles` 없는 레거시 맵(JSON) 준비
2. `불러오기`로 로드
3. 경고 알림/콘솔 메시지 확인
4. 같은 스프라이트 재배치

Expected:
- 로드 실패 없이 자동 보정
- 레거시 `hitboxPresets/spriteDefaults`가 프로파일로 병합 반영

## 4) 선택/편집 핵심 동작 검증
1. 오브젝트/히트박스/캐릭터 선택 대상을 번갈아 전환
2. 각각 `이동/크기/자르기/잠금` 수행
3. `되돌리기` 실행

Expected:
- 선택 대상 간 간섭 없이 독립 동작
- `되돌리기` 시 `playerCrop` 포함 상태 복원

## 5) 테스트 모드 검증
1. 테스트 모드 진입
2. 1인, 2인, 6인 분할 전환
3. 이동/점프/착지/카메라 추적 확인
4. 테스트 종료 후 에디터로 복귀

Expected:
- 분할 수 변경 시 정상 렌더
- 입력 반응 정상
- 복귀 후 에디터 상태 유지

## 6) 성능 체크(대량 오브젝트)
1. 오브젝트 100개 이상 배치
2. 드래그 이동/히트박스 표시 전환/미니맵 이동

Expected:
- 프레임 저하가 있더라도 조작 불가 상태는 없어야 함
- 드래그 종료 후 선택/속성 패널 불일치 없음

## 7) 저장/복원 일치성
1. 맵 저장
2. 페이지 새로고침
3. 저장 파일 재불러오기

Expected:
- 오브젝트, 프로파일, 시작지점, 물리값, 배경값이 동일 복원

## 8) 게이지 시스템 검증 (런타임 소유)
1. 게이지를 0에 가깝게 설정
2. 지상에서 이동키 입력
3. 지상에서 점프키 입력
4. 공중 상태에서 이동키 입력
5. 공중 상태에서 더블점프 입력

Expected:
- 지상 이동/점프는 게이지 규칙대로 소모/차단
- 공중 이동은 게이지 0이어도 작동
- 더블점프는 게이지 부족 시 차단

## 9) 퀴즈 브리지 루프 검증 (OFF/MOCK/LIVE)
1. 테스트모드에서 퀴즈 버튼으로 문제 진입
2. 1문제 풀이 후 결과 확인
3. `다음 문제` 선택
4. 다시 1문제 풀이 후 `맵으로 복귀` 선택

Expected:
- 브리지 이벤트 기반으로 진입/복귀가 정상 동작
- 결과에 따라 게이지 회복량 반영
- 복귀 후 캐릭터 상태가 고착되지 않음

## 10) 멀티플레이 분리 검증 (2~6인)
1. 2인/3인/6인 모드 각각 진입
2. 플레이어 A만 퀴즈 진입
3. 플레이어 B~N은 맵 이동 지속
4. 플레이어별 게이지 변화를 비교

Expected:
- 플레이어별 입력/게이지/퀴즈 세션이 독립
- 한 플레이어의 퀴즈 진입이 타 플레이어 상태를 오염시키지 않음

## 11) 통합 회귀 검증 (기존 맵 호환)
1. `/save_map/jumpmap-20260219-164307.json` 로드
2. 테스트모드 진입 후 퀴즈 루프 2회 반복
3. 저장/새로고침/재로드 후 동일 반복

Expected:
- 로드 실패/좌표 밀림/히트박스 어긋남 없음
- 퀴즈 통합 기능 추가 후에도 기존 맵 데이터가 그대로 동작
