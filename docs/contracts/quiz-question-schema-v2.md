# Quiz Question Schema v2 (Draft)

작성일: 2026-02-26  
상태: Draft (P0)  
범위: `public/quiz` 문제 스키마 확장 (`choice` + `structured` 공존)

## 1) 목적

기존 이미지/선택형 문제 스키마(v1)를 유지하면서, 자릿값 기반 영역모델/과정 제출형 문제를 위한 구조화 입력 스키마(v2)를 추가한다.

핵심 목표:
- 기존 `choices + answer(string)` 문제와 호환 유지
- 신규 `structured` 문제의 입력 필드/정답 구조/채점 옵션을 명시 가능

## 2) 공존 전략

- v1 (기존)
  - `schemaVersion` 생략 가능
  - 선택형 문제
- v2 (신규)
  - `schemaVersion: 2` 필수
  - `interactionKind: "structured"` 또는 향후 `"choice"` 확장 가능

validator 정책(초기):
- `schemaVersion === 2` 또는 `interactionKind === "structured"`이면 v2 검증
- 그 외는 v1 검증

## 3) v1 (기존) 최소 필수 필드

- `id: string`
- `type: string`
- `prompt: string`
- `question: string`
- `choices: string[]` (2개 이상)
- `answer: string` (`choices` 내 값)

## 4) v2 공통 필드 (신규)

- `id: string`
- `schemaVersion: 2`
- `type: string`
- `prompt: string`
- `interactionKind: "structured"`
- `questionKind: string`
- `taskKind: string`
- `difficulty?: string`
- `tags?: string[]`

표시용 문제 본문(둘 중 하나 이상):
- `question: string` (간단 텍스트 본문)
- `stem: object` (구조화 문제 본문)

## 5) v2 structured 필드

### 5-1) `answerSpec`

사용자가 입력해야 하는 필드를 정의한다.

```json
{
  "answerSpec": {
    "inputs": [
      {
        "id": "cell_r0c0",
        "kind": "integer",
        "solutionKey": "cell_r0c0",
        "solutionPath": "cells.cell_r0c0"
      }
    ]
  }
}
```

필드 설명:
- `id` (필수): 입력 필드 식별자
- `kind` (선택): 초기 버전은 `"integer"` 권장
- `solutionKey` (선택): `solution` leaf key 매핑
- `solutionPath` (선택): `solution` nested path 매핑 (`a.b.c`)

매핑 우선순위(초기 구현):
1. `solution.inputs[inputId]`
2. `solutionPath`
3. `solutionKey`
4. `solution` 내 leaf key = `input.id`
5. `solution[input.id]` (top-level)

### 5-2) `solution`

정답 구조. 초기 버전에서는 JSON 직렬화 가능한 값만 허용.

권장 패턴:
- `solution.cells`
- `solution.rowSums`
- `solution.colSums`
- `solution.total`
- (선택) `solution.inputs` (input ID 직접 매핑용)

예:

```json
{
  "solution": {
    "cells": {
      "cell_r0c0": 600,
      "cell_r0c1": 120,
      "cell_r1c0": 140,
      "cell_r1c1": 28
    },
    "total": 888
  }
}
```

### 5-3) `grading`

초기 버전은 exact match 기반.

```json
{
  "grading": {
    "mode": "exact",
    "allowWhitespace": true,
    "normalizeIntegerString": true
  }
}
```

초기 구현 규칙:
- `integer` 필드는 `"0600"`, `" 600 "`을 `600`으로 정규화 가능
- 부분점수 없음 (전부 일치 시 정답)

## 6) 자릿값 기반 영역모델 문제 타입 규약 (초안)

`questionKind: "place_value_area_model"`

권장 `taskKind`:
- `final_product`
- `decompose_factors`
- `partial_cells`
- `partial_sums`
- `mixed_process`

권장 `stem` 구조:

```json
{
  "stem": {
    "operator": "multiply",
    "factors": [37, 24],
    "decomposition": {
      "a": [30, 7],
      "b": [20, 4]
    }
  }
}
```

## 7) 엔진/채점 연동 계약 (초기)

- 엔진 `submitAnswer(answerInput)`는 문제 타입에 따라 입력을 해석한다.
- v1 선택형:
  - `answerInput: string`
- v2 structured:
  - `answerInput: object`
  - key는 `answerSpec.inputs[].id`

엔진 결과 payload 확장(초기):
- `answerKind: "choice" | "structured"`
- structured 오답 시:
  - `wrongFields: string[]`
  - `graderErrors?: string[]`

## 8) 예시 (자릿값 영역모델, 과정 제출)

```json
{
  "id": "pvam-37x24-mixed-001",
  "schemaVersion": 2,
  "type": "arithmetic",
  "questionKind": "place_value_area_model",
  "interactionKind": "structured",
  "taskKind": "mixed_process",
  "prompt": "빈 칸을 채워 계산 과정을 완성하세요.",
  "question": "37 x 24",
  "stem": {
    "operator": "multiply",
    "factors": [37, 24],
    "decomposition": {
      "a": [30, 7],
      "b": [20, 4]
    }
  },
  "answerSpec": {
    "inputs": [
      { "id": "cell_r0c1", "kind": "integer", "solutionPath": "cells.cell_r0c1" },
      { "id": "cell_r1c0", "kind": "integer", "solutionPath": "cells.cell_r1c0" },
      { "id": "total", "kind": "integer", "solutionKey": "total" }
    ]
  },
  "solution": {
    "cells": {
      "cell_r0c0": 600,
      "cell_r0c1": 120,
      "cell_r1c0": 140,
      "cell_r1c1": 28
    },
    "rowSums": [720, 168],
    "colSums": [740, 148],
    "total": 888
  },
  "grading": {
    "mode": "exact",
    "allowWhitespace": true,
    "normalizeIntegerString": true
  }
}
```

## 9) 초기 검증 기준 (P0/P1)

- validator가 v1/v2를 모두 통과시킬 수 있어야 한다.
- engine이 v2 structured 정답/오답을 최소 exact match로 채점할 수 있어야 한다.
- 기존 v1 선택형 동작/점수 계산 흐름에 회귀가 없어야 한다.

