# nolquiz-editor Repo Operations (R7)

Date: 2026-02-26

## 목적

- `nolquiz-editor` 운영/작업 레포에서 맵 제작 원본 관리와 runtime 맵 publish 절차를 고정한다.
- remote URL, 배포 여부 등 레포별 설정값을 후속 작업 시 빠르게 채울 수 있도록 체크 항목을 남긴다.

## Remote Setup Memo

- [ ] `origin` remote 설정
- [ ] 기본 브랜치 확인 (`main`)
- [ ] 보호 브랜치/PR 규칙 적용 여부 확인

기록용:
- `origin`: (TBD)
- 배포 방식: 직접 배포 없음 (editor authoring repo)

## 핵심 역할 (Source of Truth)

- 점프맵 제작 원본: `save_map/*.json`
- 에디터/테스트모드 코드: `public/jumpmap-editor/`
- runtime 맵 배포 스크립트: `scripts/jumpmap-publish-runtime-map.mjs`

## 표준 작업 흐름 (Editor -> Runtime)

1. 에디터에서 맵 수정 (`save_map/jumpmap-01.json` 등)
2. runtime 레포 대상 dry-run 확인
3. runtime 레포로 publish 실행
4. runtime 쪽 검증 실행(권장: monorepo `verify-split`)

### Publish 예시

```bash
cd /Users/baekjiyun/Desktop/WAN/nolquiz-editor
node scripts/jumpmap-publish-runtime-map.mjs --runtime-repo ../nolquiz-runtime --dry-run
node scripts/jumpmap-publish-runtime-map.mjs --runtime-repo ../nolquiz-runtime
```

기본 runtime 타깃:
- `../nolquiz-runtime/public/shared/maps/jumpmap-01.json`

## 검증 메모 (권장)

monorepo가 있는 경우(권장 기준선):

```bash
cd /Users/baekjiyun/Desktop/WAN/math-net-master-quiz
node scripts/jumpmap-split-repos.mjs --apply --force-merge
node scripts/jumpmap-verify-split.mjs --skip-smoke
node scripts/jumpmap-verify-split.mjs --skip-smoke --with-browser-e2e --browser-e2e-timeout-ms 30000
```

## Handoff 최소 기록 항목

- publish 실행 명령
- runtime 타깃 경로
- 검증 명령 + `pass/fail`
- 남은 리스크(있으면 1~3줄)
