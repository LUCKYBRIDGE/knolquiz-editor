# 로컬 기록(IndexedDB) 스키마 계약 (현재 기준)

작성일: 2026-02-22  
상태: 계약 초안 (분리 전 기준선)  
적용 코드: `public/shared/local-game-records.js`

---

## 1) 목적

이 문서는 사용자/학생 플레이 기록을 로컬에 저장하는 구조를 고정하기 위한 기준이다.

대상:
- 점프맵 플레이 기록
- 기본 퀴즈 플레이 기록
- 플레이어 누적 통계
- 오답 문항 모음

핵심 원칙:
- 서버/DB 없이 로컬만으로 동작
- 플레이어명만으로 충돌하지 않도록 `학생번호(tag)`를 함께 사용할 수 있음
- 점프맵/퀴즈 공통 저장소를 사용하되 모드별 세션 데이터는 분리 저장

---

## 2) 저장소 구현 기준

현재 구현:
- IndexedDB 사용
- DB 이름: `math-net-master-local-records`
- DB 버전: `1`

Object Stores:
- `sessions`
- `players`
- `wrongAnswers`

인덱스:
- `sessions`
  - `byCreatedAt`
  - `byMode`
- `players`
  - `byUpdatedAt`
  - `byName`
- `wrongAnswers`
  - `byCreatedAt`
  - `byPlayerId`
  - `byQuestionId`

---

## 3) 플레이어 식별자 계약 (중요)

현재 플레이어 식별자는 이름 + 학생번호(tag) 조합으로 생성된다.

규칙:
- 학생번호(tag)가 있으면:
  - `player:{name}:{tag}`
- 학생번호(tag)가 없으면:
  - `player:{name}`

예:
- `player:민수:3-12`
- `player:사용자1`

의미:
- 같은 이름이라도 학생번호(tag)가 다르면 기록이 분리됨

주의:
- 이름/태그 정규화 정책(공백/대소문자/특수문자)은 현재 최소 수준이다.
- 분리 후 운영 안정화를 위해 `player identity normalization` 규칙 강화는 후속 과제다.

---

## 4) `sessions` 스토어 계약

`sessions`는 플레이 세션 단위 로그를 저장한다.

공통 필드 (현재 사용)
- `id: string`
- `mode: "jumpmap" | "basic-quiz"`
- `source: string`
- `createdAt: ISO string`
- `playerCount: number`
- `launcherQuizPresetId: string | null`
- `players: Array<...>`

### 4.1 기본 퀴즈 세션 (`mode = "basic-quiz"`)

추가 필드:
- `settingsSummary`
  - `playerCount`
  - `quizEndMode`
  - `quizTimeLimitSec`
  - `timeLimitSec`
  - `wrongDelaySec`
  - `rankingEnabled`
  - `questionTypeSummary: [{ key, count }]`
- `questionSummary`
  - `questionIds: string[]`
  - `questionTypes: string[]`

`players[]` 각 항목:
- `id`
- `name`
- `tag`
- `summary`
  - `totalScore`
  - `correctCount`
  - `totalCount`
  - `accuracy`

### 4.2 점프맵 세션 (`mode = "jumpmap"`)

추가 필드:
- `settingsSummary`
  - `playerCount`
  - `moveSpeed`
  - `jumpHeight`
  - `jumpSpeed`
  - `fallSpeed`
- `mapSummary`
  - `width`
  - `height`
  - `objectCount`
  - `savePointCount`
  - `backgroundImage`

`players[]` 각 항목:
- `id`
- `name`
- `tag`
- `summary`
  - `currentHeightPx`
  - `bestHeightPx`
  - `gauge`
  - `quizAttempts`
  - `quizCorrect`
  - `quizWrong`
  - `jumps`
  - `doubleJumps`

---

## 5) `players` 스토어 계약 (누적 통계)

`players`는 세션 로그의 집계 결과를 플레이어별로 누적 저장한다.

공통 필드:
- `id: string` (플레이어 식별자)
- `name: string`
- `tag?: string`
- `createdAt: ISO string`
- `updatedAt: ISO string`

### 5.1 기본 퀴즈 누적 통계 (`stats`)
- `quizRuns`
- `totalQuestions`
- `correctAnswers`
- `totalScore`
- `bestScore`
- `accuracy`
- `lastPlayedAt`

### 5.2 점프맵 누적 통계 (`jumpmapStats`)
- `runs`
- `bestHeightPx`
- `lastHeightPx`
- `totalQuizAttempts`
- `totalQuizCorrect`
- `totalQuizWrong`
- `totalJumps`
- `totalDoubleJumps`
- `lastPlayedAt`

주의:
- 한 플레이어 레코드 안에 `stats`와 `jumpmapStats`가 함께 존재할 수 있다.
- 즉, 동일 플레이어가 퀴즈/점프맵 모두 플레이하면 같은 `players` 레코드에 누적됨.

---

## 6) `wrongAnswers` 스토어 계약 (오답문항 모음)

현재 기본 퀴즈 오답만 저장한다 (`mode = "basic-quiz"`).

필드:
- `id`
- `createdAt`
- `sessionId`
- `mode` (`"basic-quiz"`)
- `playerId`
- `playerName`
- `playerTag`
- `questionId`
- `type`
- `prompt`
- `question`
- `selectedChoice`
- `correctChoice`
- `choices: any[]`

용도:
- 오답문제 모음 조회
- 추후 A4 활동지 출력 데이터 생성의 원본

---

## 7) 공개 계약으로서의 규칙 (레포 분리 관점)

### 7.1 Runtime 레포에서 유지해야 할 것
- DB 이름/스토어 이름/핵심 필드 이름 유지
- 플레이어 식별자 생성 규칙(`name + tag`)
- `mode` 값 (`jumpmap`, `basic-quiz`)

### 7.2 Editor 레포와의 관계
- 에디터는 기록 저장소에 직접 의존하지 않아도 됨
- 단, 에디터 테스트모드에서 저장되는 점프맵 기록이 운영 런타임과 같은 스키마를 유지하는 것이 바람직함

---

## 8) 현재 스키마의 한계 (분리 전에 알아야 할 점)

현재 구조는 실용적이지만, “계약”으로 보기엔 아직 명시성이 부족한 부분이 있다.

1. 레코드별 `schemaVersion` 필드 없음
- 현재는 DB 전체 `DB_VERSION`만 존재
- 향후 필드 변경 시 개별 레코드 migration이 어려워질 수 있음

2. `wrongAnswers`는 현재 기본 퀴즈 중심
- 점프맵 퀴즈 오답 저장 정책을 통합할지 별도 모드로 둘지 후속 결정 필요

3. 플레이어 식별자 정규화 강화 필요
- 이름 공백/표기 차이로 다른 사람처럼 저장될 가능성 있음

권장 후속:
- `recordSchemaVersion` 도입
- `identity normalization` 규칙 문서화
- 오답 출력용 뷰 모델 계약 추가

---

## 9) 분리 직후 검증 체크리스트

- 같은 이름이더라도 다른 학생번호(tag)면 기록이 분리되는가
- 점프맵 세션 저장 후 `players.jumpmapStats` 누적되는가
- 기본 퀴즈 세션 저장 후 `stats`, `wrongAnswers` 누적되는가
- `play/records` 화면에서 기존 로컬 기록을 계속 읽을 수 있는가

