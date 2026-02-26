# Jumpmap Local Workflow

Date: 2026-02-07  
Scope: 로컬 제작/검증/맵 보관

## 1) 로컬 서버 실행
프로젝트 루트(`math-net-master-quiz`)에서 실행:

```bash
node scripts/jumpmap-local-serve.mjs
```

접속:
- `http://127.0.0.1:5173/jumpmap-editor/`

`quiz_plate` 자동 반영:
- 로컬 서버는 `GET /__jumpmap/plates.json`에서 `quiz_plate` 폴더의 PNG 목록을 자동 제공
- 에디터의 `갱신` 버튼을 누르면 해당 목록을 읽어 팔레트를 갱신
- 브라우저 `showDirectoryPicker`가 막혀도 로컬 서버 경로에서는 반영 가능

옵션:

```bash
node scripts/jumpmap-local-serve.mjs --port=4173 --host=0.0.0.0
```

## 2) 자동 안정성 검증
편집 전/후에 실행:

```bash
node scripts/jumpmap-phase6-validate.mjs
```

기준:
- `pass=33, fail=0`

## 2-1) `plates.json` 파일 동기화(선택)
`quiz_plate`의 PNG 목록을 `public/jumpmap-editor/data/plates.json`에 반영:

```bash
node scripts/jumpmap-sync-plates.mjs
```

미리보기만 하려면:

```bash
node scripts/jumpmap-sync-plates.mjs --dry-run --verbose
```

실행 시 기존 `plates.json` 백업은 자동 생성:
- `public/jumpmap-editor/data/_backup/plates.YYYYMMDDHHMMSS.json`

## 3) 맵 제작 저장 규칙
- 에디터 `저장` 버튼으로 내려받는 파일명은 자동 타임스탬프:
  - `jumpmap-YYYYMMDD-HHMMSS.json`
- 제작 맵은 별도 보관 폴더에 버전별 저장:
  - `public/jumpmap-editor/maps/`
- 에디터는 로컬 임시저장(draft)을 자동 유지:
  - key: `jumpmap-editor-draft`
  - 코드 수정/새로고침 후에도 직전 작업 상태를 자동 복원

권장:
- 하루 작업 단위로 `v1, v2` 같은 수동 suffix를 붙여 보관
- 실사용 투입 전, `phase6-checklist` 수동 검증 1회 수행

## 4) 브라우저 운영 반영
1. 로컬에서 맵 제작/테스트
2. 저장 JSON 보관
3. 운영 브라우저에서 `불러오기`로 적용

이 흐름을 기본 운영 방식으로 사용하면, 에디터 수정과 운영 반영을 분리할 수 있어 안정적이다.
