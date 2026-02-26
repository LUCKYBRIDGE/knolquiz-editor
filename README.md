# NOLQUIZ Jumpmap Editor

놀퀴즈 점프맵 에디터 레포 스캐폴드입니다.

## Local Run

```bash
cd /Users/baekjiyun/Desktop/WAN/knolquiz-editor
node scripts/jumpmap-local-serve.mjs
```

- editor: `http://127.0.0.1:5173/jumpmap-editor/`

## Main Scope

- `public/jumpmap-editor/` 에디터 + 테스트모드
- `save_map/` 제작 원본 맵
- `scripts/jumpmap-publish-runtime-map.mjs` 운영 맵 배포

## Publish Runtime Map (to runtime repo)

```bash
cd /Users/baekjiyun/Desktop/WAN/knolquiz-editor
node scripts/jumpmap-publish-runtime-map.mjs --runtime-repo ../knolquiz-runtime
```

## Operations Notes

- Repo/remote/publish 운영 메모: `docs/repo-operations.md`
