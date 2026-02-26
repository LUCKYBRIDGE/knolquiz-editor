# 점프맵 맵 JSON 스키마 계약 (v2)

작성일: 2026-02-22  
상태: 계약 초안 (분리 전 기준선)  
적용 코드: `public/jumpmap-editor/map-io-utils.js`

---

## 1) 목적

이 문서는 다음 두 환경이 **같은 맵 JSON 계약**을 사용하도록 고정하기 위한 기준이다.

- 에디터 레포 (맵 제작/저장/불러오기)
- 런타임 레포 (점프맵 플레이에서 배포용 맵 로드)

핵심 원칙:
- 맵 포맷은 `version: 2`를 유지한다.
- 런타임 세션 상태(게이지, 퀴즈 진행, 플레이어 현재 위치)는 맵 JSON에 저장하지 않는다.

---

## 2) 현재 저장 포맷 (Top-level)

에디터 저장 payload는 `buildSavePayload(state)` 기준으로 생성된다.

필수/핵심 필드:

- `version: number`  
  현재 값: `2`
- `schema: string`  
  현재 값: `"jumpmap-editor-map"`
- `savedAt: string`  
  ISO datetime 문자열
- `mapSize: { w: number, h: number }`
- `grid: { size, snap, visible }`
- `camera: { yBias, smooth }`
- `background: { color, image, texture, imageOpacity }`
- `playerHitbox`
- `playerHitboxOffset`
- `playerHitboxPolygon` (`null` 또는 polygon)
- `playerScale`
- `playerCrop`
- `playerLocked`
- `physics`
- `startPoint`
- `savePoints`
- `editorOptions`
- `spriteProfiles`
- `objectGroupPresets`
- `hitboxPresets`
- `objects`
- `spriteDefaults`

참고:
- 로딩 시 `payload` 래퍼가 있으면 `payload` 내부를 사용한다.
  - 즉, `parseLoadedMapData(raw)`는 `{ payload: ... }`도 허용함.

---

## 3) 값 정규화/보정 규칙 (현재 코드 기준)

로딩 시 `parseLoadedMapData()`가 정규화한다. 주요 보정 규칙:

### 3.1 맵/그리드/카메라
- `mapSize.w`: `800 ~ 200000`
- `mapSize.h`: `1200 ~ 400000`
- `grid.size`: 허용값만 사용 (`8 / 16 / 32 / 64`)
- `camera.yBias`, `camera.smooth`: `0 ~ 1`

### 3.2 배경
- `background.image`는 경로 정규화 수행
  - `/quiz_background/...` -> `../quiz_background/...`
  - `/quiz_plate/...` -> `../quiz_plate/...`
  - `/quiz_sejong/...` -> `../quiz_sejong/...`
- `imageOpacity`: `0 ~ 1`

### 3.3 플레이어 관련
- `playerScale`: `0.2 ~ 3`
- `playerHitboxPolygon`: 유효하지 않으면 `null`
- `playerLocked`: boolean으로 정규화

### 3.4 물리/시작지점/세이브포인트
- 물리 필드는 `sanitizePhysics(...)` 기준으로 보정
- 시작지점은 맵 범위 밖이면 자동 보정
- 세이브포인트는 `sanitizeSavePoints(...)` 기준으로 필터링/보정

### 3.5 오브젝트/히트박스/프로파일
- `objects[]`는 개별 sanitize 후 유효한 것만 유지
- 잘못된 오브젝트는 제거되고 warning 기록
- `spriteProfiles`, `hitboxPresets`, `objectGroupPresets`, `spriteDefaults`는 각각 sanitize

---

## 4) 버전 호환 및 마이그레이션 규칙

현재 코드 기준 버전:
- `CURRENT_MAP_SCHEMA_VERSION = 2`

지원 마이그레이션:
- `v0 -> v1`
- `v1 -> v2`

로딩 규칙:
- `version` 없으면 `v0`로 간주하고 migration 시도
- 더 높은 버전 파일(`>2`)은 가능한 필드만 읽고 warning 기록

### 4.1 주요 레거시 변환 예시
- `start` -> `startPoint`
- `player.hitbox` -> `playerHitbox`
- `player.scale` -> `playerScale`
- `player.crop` -> `playerCrop`
- `spriteProfileMap` -> `spriteProfiles`
- `hitboxProfileMap` -> `hitboxPresets`
- `objectGroupPresetMap` -> `objectGroupPresets`

---

## 5) 오브젝트 계약 (요약)

`objects[]`의 각 오브젝트는 최소한 아래 의미를 가진다.

- `id: string`
- `sprite: string` (이미지 경로/스프라이트 키)
- `x, y: number` (월드 좌표)
- `scale: number`
- `rotation: number`
- `flipH, flipV: boolean`
- `locked: boolean`
- `crop: {x,y,w,h} | null`
- `hitboxes: Hitbox[]`

### 5.1 Hitbox 계약 (현재 혼합 지원)
- 사각형 hitbox
  - `{ x, y, w, h, rotation?, locked?, groupId? }`
- 다각형 hitbox
  - `type: "polygon"`
  - `points: [{x,y}, ...]`
  - (선분별 미끄러짐 등 확장 필드 존재 가능)

주의:
- 현재 런타임/에디터는 사각형/다각형 혼합 상태를 지원한다.
- 최종적으로 "오브젝트당 다각형 히트박스 중심"으로 가더라도, **이전 저장맵 호환을 위해 사각형 지원은 당분간 유지**한다.

---

## 6) Runtime 레포에서의 사용 규칙

### 6.1 허용 경로 (운영/배포)
- `public/shared/maps/*.json` (배포용 확정 맵)

예:
- `public/shared/maps/jumpmap-01.json`

### 6.2 금지/비권장 경로 (운영 런타임)
- `save_map/*.json` 직접 참조
  - 이유: 로컬 전용 편집 원본이며 배포 경로가 아님

### 6.3 Editor 레포 워크플로우
- `save_map/jumpmap-01.json` (편집 원본)
- publish/export로 `runtime` 레포의 `public/shared/maps/jumpmap-01.json` 갱신

---

## 7) 최소 예시 (구조 예시)

```json
{
  "version": 2,
  "schema": "jumpmap-editor-map",
  "savedAt": "2026-02-22T12:00:00.000Z",
  "mapSize": { "w": 2400, "h": 12000 },
  "grid": { "size": 32, "snap": true, "visible": true },
  "camera": { "yBias": 0.46, "smooth": 0.18 },
  "background": { "color": "#ffffff", "image": "../quiz_background/Geumgangjeondo.jpg", "texture": "", "imageOpacity": 1 },
  "startPoint": { "x": 100, "y": 11800 },
  "savePoints": [],
  "objects": []
}
```

참고:
- 실제 payload에는 `physics`, `player*`, `spriteProfiles`, `hitboxPresets` 등 추가 필드가 포함된다.

---

## 8) 분리 전/후 검증 포인트

- 같은 `jumpmap-01.json`을 에디터와 런타임 모두 정상 로드하는가
- 배경 이미지 경로가 로컬/배포에서 동일하게 보이는가
- 히트박스/크롭/시작지점이 위치 밀림 없이 유지되는가
- migration warning만 있고 치명적 로드 실패가 없는가

