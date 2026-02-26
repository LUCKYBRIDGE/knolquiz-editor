(function initJumpmapMapIOUtils() {
  const CURRENT_MAP_SCHEMA_VERSION = 2;
  const ALLOWED_GRID_SIZES = new Set([8, 16, 32, 64]);
  const OBJECT_GROUP_PRESET_NAME_MAX = 32;
  const SAVE_POINT_NAME_MAX = 24;
  const MAX_SAVE_POINTS = 64;
  const MAX_FLAT_ZONES = 128;
  const MIN_SLOPE_FACTOR = 0.2;
  const MAX_SLOPE_FACTOR = 2.0;
  const MIN_SLOPE_PROFILE_ROWS = 1;
  const MAX_SLOPE_PROFILE_ROWS = 24;
  const DEFAULT_WALKABLE_SLOPE_MAX_ANGLE = 75;
  const DEFAULT_SLOPE_FALL_START_ANGLE = 75;
  const DEFAULT_FLAT_INERTIA_PERCENT = 88;
  const DEFAULT_ICE_INERTIA_PERCENT = 96;
  const DEFAULT_ICE_CONTROL_PERCENT = 72;
  const DEFAULT_SLOPE_SPEED_PROFILE = [
    { minAngle: 0, maxAngle: 15, up: 1.0, down: 1.0 },
    { minAngle: 16, maxAngle: 30, up: 1.0, down: 1.0 },
    { minAngle: 31, maxAngle: 45, up: 1.0, down: 1.0 },
    { minAngle: 46, maxAngle: 60, up: 0.88, down: 1.12 },
    { minAngle: 61, maxAngle: 75, up: 0.72, down: 1.32 },
    { minAngle: 76, maxAngle: 90, up: 0.5, down: 1.62 }
  ];
  const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

  const toFiniteNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const clampNumber = (value, min, max, fallback) => {
    const num = toFiniteNumber(value, fallback);
    return Math.min(max, Math.max(min, num));
  };

  const sanitizeBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    return fallback;
  };

  const sanitizeHexColor = (value, fallback = null) => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return fallback;
  };

  const normalizeBackgroundImagePath = (value, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed;
    }
    if (trimmed.startsWith('/quiz_background/')) return `..${trimmed}`;
    if (trimmed.startsWith('/quiz_plate/')) return `..${trimmed}`;
    if (trimmed.startsWith('/quiz_sejong/')) return `..${trimmed}`;
    if (trimmed.startsWith('quiz_background/')) return `../${trimmed}`;
    if (trimmed.startsWith('quiz_plate/')) return `../${trimmed}`;
    if (trimmed.startsWith('quiz_sejong/')) return `../${trimmed}`;
    return trimmed;
  };

  const normalizeRotation = (value, fallback = 0) => {
    let deg = Math.round(toFiniteNumber(value, fallback));
    deg %= 360;
    if (deg < 0) deg += 360;
    return deg;
  };

  const clonePlain = (value) => {
    if (!isObject(value) && !Array.isArray(value)) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  };

  const sanitizeMapSize = (mapSize, currentMap) => {
    const width = Math.round(clampNumber(mapSize?.w, 800, 200000, currentMap.width));
    const height = Math.round(clampNumber(mapSize?.h, 1200, 400000, currentMap.height));
    return { width, height };
  };

  const sanitizeGrid = (grid, currentGrid) => {
    const size = ALLOWED_GRID_SIZES.has(Number(grid?.size)) ? Number(grid.size) : currentGrid.size;
    return {
      size,
      snap: sanitizeBoolean(grid?.snap, currentGrid.snap),
      visible: sanitizeBoolean(grid?.visible, currentGrid.visible)
    };
  };

  const sanitizeCamera = (camera, currentCamera) => ({
    yBias: clampNumber(camera?.yBias, 0, 1, currentCamera.yBias),
    smooth: clampNumber(camera?.smooth, 0, 1, currentCamera.smooth)
  });

  const sanitizeBackground = (background, currentBackground) => ({
    color: typeof background?.color === 'string' ? background.color : currentBackground.color,
    image: normalizeBackgroundImagePath(
      background?.image,
      normalizeBackgroundImagePath(currentBackground?.image, '')
    ),
    texture: typeof background?.texture === 'string' ? background.texture : currentBackground.texture,
    imageOpacity: clampNumber(background?.imageOpacity, 0, 1, clampNumber(currentBackground?.imageOpacity, 0, 1, 1))
  });

  const sanitizePlayerHitbox = (playerHitbox, currentPlayerHitbox) => {
    const width = Math.round(clampNumber(playerHitbox?.width, 20, 1000, currentPlayerHitbox.width));
    const height = Math.round(clampNumber(playerHitbox?.height, 20, 1400, currentPlayerHitbox.height));
    const footInset = Math.round(clampNumber(playerHitbox?.footInset, 0, Math.max(0, width / 2 - 1), currentPlayerHitbox.footInset));
    return { width, height, footInset };
  };

  const sanitizePlayerHitboxOffset = (offset, currentOffset) => ({
    x: Math.round(toFiniteNumber(offset?.x, currentOffset.x)),
    y: Math.round(toFiniteNumber(offset?.y, currentOffset.y))
  });

  const sanitizePlayerHitboxPolygon = (polygon, currentPolygon = null) => {
    const source = Array.isArray(polygon)
      ? polygon
      : (Array.isArray(polygon?.points) ? polygon.points : null);
    if (!Array.isArray(source) || source.length < 3) return currentPolygon ?? null;
    const points = source
      .map((point) => ({
        x: clampNumber(point?.x, 0, 1, NaN),
        y: clampNumber(point?.y, 0, 1, NaN)
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: Math.round(point.x * 1000) / 1000,
        y: Math.round(point.y * 1000) / 1000
      }));
    if (points.length < 3) return currentPolygon ?? null;
    return { points };
  };

  const sanitizePlayerCrop = (crop, currentCrop) => {
    if (!crop || typeof crop !== 'object') return currentCrop ?? null;
    const x = Math.max(0, Math.round(toFiniteNumber(crop.x, 0)));
    const y = Math.max(0, Math.round(toFiniteNumber(crop.y, 0)));
    const w = Math.max(1, Math.round(toFiniteNumber(crop.w, 80)));
    const h = Math.max(1, Math.round(toFiniteNumber(crop.h, 120)));
    return { x, y, w, h };
  };

  const cloneDefaultSlopeSpeedProfile = () =>
    DEFAULT_SLOPE_SPEED_PROFILE.map((entry) => ({ ...entry }));

  const sanitizeSlopeSpeedProfile = (profile, currentPhysics) => {
    const source = Array.isArray(profile) && profile.length
      ? profile
      : (Array.isArray(currentPhysics?.slopeSpeedProfile) && currentPhysics.slopeSpeedProfile.length
        ? currentPhysics.slopeSpeedProfile
        : cloneDefaultSlopeSpeedProfile());
    const sorted = source
      .slice(0, MAX_SLOPE_PROFILE_ROWS)
      .map((entry, index) => ({
        minAngle: Number(entry?.minAngle),
        maxAngle: Number(entry?.maxAngle),
        up: Number(entry?.up),
        down: Number(entry?.down),
        _idx: index
      }))
      .sort((a, b) => {
        const aMin = Number.isFinite(a.minAngle) ? a.minAngle : Number.POSITIVE_INFINITY;
        const bMin = Number.isFinite(b.minAngle) ? b.minAngle : Number.POSITIVE_INFINITY;
        if (aMin !== bMin) return aMin - bMin;
        const aMax = Number.isFinite(a.maxAngle) ? a.maxAngle : Number.POSITIVE_INFINITY;
        const bMax = Number.isFinite(b.maxAngle) ? b.maxAngle : Number.POSITIVE_INFINITY;
        if (aMax !== bMax) return aMax - bMax;
        return a._idx - b._idx;
      });
    const rowCount = Math.max(
      MIN_SLOPE_PROFILE_ROWS,
      Math.min(MAX_SLOPE_PROFILE_ROWS, sorted.length || DEFAULT_SLOPE_SPEED_PROFILE.length)
    );
    const normalized = [];
    let prevMaxAngle = -1;
    for (let i = 0; i < rowCount; i += 1) {
      const fallback = DEFAULT_SLOPE_SPEED_PROFILE[Math.min(i, DEFAULT_SLOPE_SPEED_PROFILE.length - 1)]
        || DEFAULT_SLOPE_SPEED_PROFILE[0];
      const raw = sorted[i] || fallback;
      const up = clampNumber(raw?.up, MIN_SLOPE_FACTOR, MAX_SLOPE_FACTOR, fallback.up);
      const down = clampNumber(raw?.down, MIN_SLOPE_FACTOR, MAX_SLOPE_FACTOR, fallback.down);
      const minAllowed = i === 0 ? 0 : prevMaxAngle + 1;
      const remainingRows = rowCount - i - 1;
      const maxAllowed = Math.max(minAllowed, 90 - remainingRows);
      let minAngle = Math.round(toFiniteNumber(raw?.minAngle, minAllowed));
      minAngle = Math.max(minAllowed, Math.min(maxAllowed, minAngle));
      let maxAngle;
      if (i === rowCount - 1) {
        minAngle = Math.max(minAllowed, Math.min(90, minAngle));
        maxAngle = 90;
      } else {
        const desiredMax = Math.round(toFiniteNumber(raw?.maxAngle, minAngle));
        maxAngle = Math.max(minAngle, Math.min(maxAllowed, desiredMax));
      }
      prevMaxAngle = maxAngle;
      normalized.push({
        minAngle,
        maxAngle,
        up: Number(up.toFixed(2)),
        down: Number(down.toFixed(2))
      });
    }
    if (normalized.length) {
      normalized[0].minAngle = 0;
      normalized[normalized.length - 1].maxAngle = 90;
    }
    return normalized;
  };

  const sanitizeFlatZones = (zones, map, fallbackZones = []) => {
    const mapWidth = Math.max(1, Math.round(toFiniteNumber(map?.width, 1)));
    const mapHeight = Math.max(1, Math.round(toFiniteNumber(map?.height, 1)));
    const source = Array.isArray(zones) ? zones : fallbackZones;
    if (!Array.isArray(source)) return [];
    const normalized = [];
    source.slice(0, MAX_FLAT_ZONES).forEach((zone) => {
      if (!zone || typeof zone !== 'object') return;
      const rawX = toFiniteNumber(zone.x, NaN);
      const rawY = toFiniteNumber(zone.y, NaN);
      const rawW = toFiniteNumber(zone.w, NaN);
      const rawH = toFiniteNumber(zone.h, NaN);
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawW) || !Number.isFinite(rawH)) return;
      const x1 = Math.max(0, Math.min(mapWidth, Math.round(Math.min(rawX, rawX + rawW))));
      const y1 = Math.max(0, Math.min(mapHeight, Math.round(Math.min(rawY, rawY + rawH))));
      const x2 = Math.max(0, Math.min(mapWidth, Math.round(Math.max(rawX, rawX + rawW))));
      const y2 = Math.max(0, Math.min(mapHeight, Math.round(Math.max(rawY, rawY + rawH))));
      const w = x2 - x1;
      const h = y2 - y1;
      if (w < 2 || h < 2) return;
      normalized.push({ x: x1, y: y1, w, h });
    });
    return normalized;
  };

  const sanitizePhysics = (physics, currentPhysics, map) => {
    const legacyFall = physics?.gravity;
    const legacyHeight = physics?.maxFallSpeed;
    const fallSpeed = clampNumber(
      physics?.fallSpeed ?? legacyFall,
      0,
      5000,
      currentPhysics.fallSpeed
    );
    const jumpSpeed = clampNumber(physics?.jumpSpeed, 0, 5000, currentPhysics.jumpSpeed);
    const jumpHeight = clampNumber(
      physics?.jumpHeight ?? legacyHeight,
      0,
      8000,
      currentPhysics.jumpHeight
    );
    const moveSpeed = clampNumber(
      physics?.moveSpeed,
      0,
      2000,
      Number.isFinite(currentPhysics?.moveSpeed) ? currentPhysics.moveSpeed : 220
    );
    const hasSlopeSlideEnabled = Object.prototype.hasOwnProperty.call(physics || {}, 'slopeSlideEnabled');
    const slopeSlideEnabled = hasSlopeSlideEnabled
      ? physics?.slopeSlideEnabled !== false
      : (currentPhysics?.slopeSlideEnabled !== false);
    const hasFlatInertiaEnabled = Object.prototype.hasOwnProperty.call(physics || {}, 'flatInertiaEnabled');
    const flatInertiaEnabled = hasFlatInertiaEnabled
      ? physics?.flatInertiaEnabled === true
      : (currentPhysics?.flatInertiaEnabled === true);
    const flatInertiaPercent = clampNumber(
      physics?.flatInertiaPercent,
      0,
      99,
      Number.isFinite(currentPhysics?.flatInertiaPercent)
        ? currentPhysics.flatInertiaPercent
        : DEFAULT_FLAT_INERTIA_PERCENT
    );
    const iceInertiaPercent = clampNumber(
      physics?.iceInertiaPercent,
      0,
      99,
      Number.isFinite(currentPhysics?.iceInertiaPercent)
        ? currentPhysics.iceInertiaPercent
        : DEFAULT_ICE_INERTIA_PERCENT
    );
    const iceControlPercent = clampNumber(
      physics?.iceControlPercent,
      20,
      100,
      Number.isFinite(currentPhysics?.iceControlPercent)
        ? currentPhysics.iceControlPercent
        : DEFAULT_ICE_CONTROL_PERCENT
    );
    const slopeSpeedProfile = sanitizeSlopeSpeedProfile(physics?.slopeSpeedProfile, currentPhysics);
    const walkableSlopeMaxAngle = clampNumber(
      physics?.walkableSlopeMaxAngle,
      0,
      90,
      Number.isFinite(currentPhysics?.walkableSlopeMaxAngle)
        ? currentPhysics.walkableSlopeMaxAngle
        : DEFAULT_WALKABLE_SLOPE_MAX_ANGLE
    );
    const rawFallStartAngle = clampNumber(
      physics?.slopeFallStartAngle,
      0,
      90,
      Number.isFinite(currentPhysics?.slopeFallStartAngle)
        ? currentPhysics.slopeFallStartAngle
        : DEFAULT_SLOPE_FALL_START_ANGLE
    );
    const slopeFallStartAngle = Math.max(walkableSlopeMaxAngle, rawFallStartAngle);
    const flatZones = sanitizeFlatZones(
      physics?.flatZones,
      map,
      Array.isArray(currentPhysics?.flatZones) ? currentPhysics.flatZones : []
    );
    return {
      fallSpeed,
      jumpSpeed,
      jumpHeight,
      moveSpeed,
      walkableSlopeMaxAngle,
      slopeFallStartAngle,
      slopeSlideEnabled,
      flatInertiaEnabled,
      flatInertiaPercent,
      iceSurfaceEnabled: physics?.iceSurfaceEnabled !== false,
      iceInertiaPercent,
      iceControlPercent,
      slopeSpeedProfile,
      flatZones
    };
  };

  const sanitizeStartPoint = (startPoint, currentStartPoint, map) => {
    if (!startPoint || typeof startPoint !== 'object') return currentStartPoint;
    const mapWidth = Math.max(0, Math.round(toFiniteNumber(map?.width, currentStartPoint?.x ?? 0)));
    const mapHeight = Math.max(0, Math.round(toFiniteNumber(map?.height, currentStartPoint?.y ?? 0)));
    const x = Math.round(toFiniteNumber(startPoint.x, currentStartPoint?.x ?? 0));
    const y = Math.round(toFiniteNumber(startPoint.y, currentStartPoint?.y ?? 0));
    return {
      x: Math.max(0, Math.min(mapWidth, x)),
      y: Math.max(0, Math.min(mapHeight, y))
    };
  };

  const sanitizeSavePointName = (value, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.slice(0, SAVE_POINT_NAME_MAX);
  };

  const sanitizeSavePoints = (savePoints, map, warnings = null) => {
    if (!Array.isArray(savePoints)) return [];
    const mapWidth = Math.max(0, Math.round(toFiniteNumber(map?.width, 0)));
    const mapHeight = Math.max(0, Math.round(toFiniteNumber(map?.height, 0)));
    const next = [];
    savePoints.slice(0, MAX_SAVE_POINTS).forEach((point, index) => {
      if (!point || typeof point !== 'object') return;
      const idRaw = typeof point.id === 'string' ? point.id.trim() : '';
      const id = idRaw || `sp_${index + 1}`;
      const xRaw = Math.round(toFiniteNumber(point.x, 0));
      const yRaw = Math.round(toFiniteNumber(point.y, 0));
      const x = Math.max(0, Math.min(mapWidth, xRaw));
      const y = Math.max(0, Math.min(mapHeight, yRaw));
      const nameFallback = `세이브포인트 ${index + 1}`;
      const name = sanitizeSavePointName(point.name, nameFallback) || nameFallback;
      if (warnings && (x !== xRaw || y !== yRaw)) {
        warnings.push(`savePoints[${index}] 좌표가 맵 범위를 벗어나 자동 보정되었습니다.`);
      }
      next.push({ id, name, x, y });
    });
    return next;
  };

  const sanitizeEditorOptions = (editorOptions, currentEditorOptions) => ({
    autoBasePlatform: sanitizeBoolean(editorOptions?.autoBasePlatform, currentEditorOptions.autoBasePlatform),
    autoScrollStart: sanitizeBoolean(editorOptions?.autoScrollStart, currentEditorOptions.autoScrollStart),
    autoSelectAfterPlace: sanitizeBoolean(editorOptions?.autoSelectAfterPlace, currentEditorOptions.autoSelectAfterPlace)
  });

  const sanitizeCrop = (crop) => {
    if (!crop || typeof crop !== 'object') return null;
    return {
      x: Math.max(0, Math.round(toFiniteNumber(crop.x, 0))),
      y: Math.max(0, Math.round(toFiniteNumber(crop.y, 0))),
      w: Math.max(1, Math.round(toFiniteNumber(crop.w, 1))),
      h: Math.max(1, Math.round(toFiniteNumber(crop.h, 1)))
    };
  };

  const sanitizePolygonPoints = (points) => {
    if (!Array.isArray(points)) return null;
    const normalized = points
      .map((point) => ({
        x: toFiniteNumber(point?.x, NaN),
        y: toFiniteNumber(point?.y, NaN)
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: Math.round(point.x * 1000) / 1000,
        y: Math.round(point.y * 1000) / 1000
      }));
    if (normalized.length < 3) return null;
    return normalized;
  };

  const sanitizePolygonEdgeSlip = (edgeSlip, pointCount) => {
    const count = Math.max(0, Number(pointCount) || 0);
    if (count < 3) return null;
    if (!Array.isArray(edgeSlip)) return null;
    const normalized = [];
    for (let i = 0; i < count; i += 1) {
      normalized.push(edgeSlip[i] !== false);
    }
    return normalized;
  };

  const sanitizeHitbox = (hitbox, warnings, contextLabel) => {
    if (!hitbox || typeof hitbox !== 'object') {
      warnings?.push(`${contextLabel}: 히트박스 형식이 올바르지 않아 제외되었습니다.`);
      return null;
    }
    const type = typeof hitbox.type === 'string' ? hitbox.type.trim().toLowerCase() : 'rect';
    if (type === 'polygon') {
      const points = sanitizePolygonPoints(hitbox.points);
      if (!points) {
        warnings?.push(`${contextLabel}: 다각형 점 데이터가 올바르지 않아 제외되었습니다.`);
        return null;
      }
      const edgeSlip = sanitizePolygonEdgeSlip(hitbox.edgeSlip, points.length);
      let x = Math.round(toFiniteNumber(hitbox.x, 0));
      let y = Math.round(toFiniteNumber(hitbox.y, 0));
      const hasFiniteOrigin =
        Number.isFinite(Number(hitbox.x)) &&
        Number.isFinite(Number(hitbox.y));
      const rawW = Math.max(1, Math.round(toFiniteNumber(hitbox.w, 1)));
      const rawH = Math.max(1, Math.round(toFiniteNumber(hitbox.h, 1)));
      const minX = Math.min(...points.map((point) => point.x));
      const minY = Math.min(...points.map((point) => point.y));
      const maxX = Math.max(...points.map((point) => point.x));
      const maxY = Math.max(...points.map((point) => point.y));
      const isWithinDeclared = (
        minX >= -1 &&
        minY >= -1 &&
        maxX <= rawW + 1 &&
        maxY <= rawH + 1
      );
      let normalizedPoints = points;
      // Compatibility: points may be stored in absolute local coordinates while x/y also exist.
      if (hasFiniteOrigin && !isWithinDeclared) {
        const looksAbsoluteByXY =
          minX >= x - 1 &&
          minY >= y - 1 &&
          maxX <= x + rawW + 1 &&
          maxY <= y + rawH + 1;
        if (!looksAbsoluteByXY) {
          // Keep as-is unless legacy absolute-by-xy shape is clearly detected.
        } else {
          const shifted = points.map((point) => ({
            x: Math.round((point.x - x) * 1000) / 1000,
            y: Math.round((point.y - y) * 1000) / 1000
          }));
        const sMinX = Math.min(...shifted.map((point) => point.x));
        const sMinY = Math.min(...shifted.map((point) => point.y));
        const sMaxX = Math.max(...shifted.map((point) => point.x));
        const sMaxY = Math.max(...shifted.map((point) => point.y));
        const shiftedWithin = (
          sMinX >= -1 &&
          sMinY >= -1 &&
          sMaxX <= rawW + 1 &&
          sMaxY <= rawH + 1
        );
        if (shiftedWithin) {
          normalizedPoints = shifted;
        }
        }
      }
      const nMinX = Math.min(...normalizedPoints.map((point) => point.x));
      const nMinY = Math.min(...normalizedPoints.map((point) => point.y));
      const nMaxX = Math.max(...normalizedPoints.map((point) => point.x));
      const nMaxY = Math.max(...normalizedPoints.map((point) => point.y));
      // Keep polygon bounds aligned with points to avoid stale oversized boxes.
      const w = Math.max(1, Math.ceil(nMaxX));
      const h = Math.max(1, Math.ceil(nMaxY));
      // If x/y is missing or malformed, treat points as absolute and rebase to local coordinates.
      if (!hasFiniteOrigin) {
        x = Math.round(nMinX);
        y = Math.round(nMinY);
        return {
          type: 'polygon',
          x,
          y,
          w: Math.max(1, Math.ceil(nMaxX - nMinX)),
          h: Math.max(1, Math.ceil(nMaxY - nMinY)),
          rotation: 0,
          locked: sanitizeBoolean(hitbox.locked, false),
          points: normalizedPoints.map((point) => ({
            x: Math.round((point.x - nMinX) * 1000) / 1000,
            y: Math.round((point.y - nMinY) * 1000) / 1000
          })),
          ...(edgeSlip ? { edgeSlip } : {}),
          ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
        };
      }
      return {
        type: 'polygon',
        x,
        y,
        w,
        h,
        rotation: 0,
        locked: sanitizeBoolean(hitbox.locked, false),
        points: normalizedPoints,
        ...(edgeSlip ? { edgeSlip } : {}),
        ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
      };
    }
    return {
      x: Math.round(toFiniteNumber(hitbox.x, 0)),
      y: Math.round(toFiniteNumber(hitbox.y, 0)),
      w: Math.max(1, Math.round(toFiniteNumber(hitbox.w, 1))),
      h: Math.max(1, Math.round(toFiniteNumber(hitbox.h, 1))),
      rotation: normalizeRotation(hitbox.rotation, 0),
      locked: sanitizeBoolean(hitbox.locked, false),
      ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
    };
  };

  const sanitizeObject = (obj, index, warnings) => {
    if (!obj || typeof obj !== 'object') {
      warnings.push(`objects[${index}]: 객체 형식이 올바르지 않아 제외되었습니다.`);
      return null;
    }
    const sprite = typeof obj.sprite === 'string' ? obj.sprite : null;
    if (!sprite) {
      warnings.push(`objects[${index}]: sprite 값이 없어 제외되었습니다.`);
      return null;
    }
    const hitboxes = Array.isArray(obj.hitboxes)
      ? obj.hitboxes
          .map((hitbox, hitboxIndex) =>
            sanitizeHitbox(hitbox, warnings, `objects[${index}].hitboxes[${hitboxIndex}]`)
          )
          .filter(Boolean)
      : [];
    if (!Array.isArray(obj.hitboxes)) {
      warnings.push(`objects[${index}]: 히트박스가 없어 기본 히트박스가 생성되었습니다.`);
    } else if (!hitboxes.length) {
      warnings.push(`objects[${index}]: 유효한 히트박스가 없어 기본 히트박스가 생성되었습니다.`);
    }
    const sanitized = {
      id: typeof obj.id === 'string' ? obj.id : `obj_import_${Date.now()}_${index}`,
      sprite,
      x: Math.round(toFiniteNumber(obj.x, 0)),
      y: Math.round(toFiniteNumber(obj.y, 0)),
      scale: clampNumber(obj.scale, 0.05, 20, 1),
      rotation: normalizeRotation(obj.rotation, 0),
      flipH: sanitizeBoolean(obj.flipH, false),
      flipV: sanitizeBoolean(obj.flipV, false),
      locked: sanitizeBoolean(obj.locked, false),
      crop: sanitizeCrop(obj.crop),
      hitboxes: hitboxes.length ? hitboxes : [{ x: 0, y: 0, w: 64, h: 64, rotation: 0, locked: false }]
    };
    if (obj.groupId) {
      sanitized.groupId = String(obj.groupId);
    }
    const textureColor = sanitizeHexColor(obj.textureColor, null);
    if (textureColor) {
      sanitized.textureColor = textureColor;
    }
    return sanitized;
  };

  const normalizeObjectGroupPresetName = (value, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.slice(0, OBJECT_GROUP_PRESET_NAME_MAX);
  };

  const sanitizeObjectGroupPresetObject = (obj, index, warnings) => {
    if (!obj || typeof obj !== 'object') {
      warnings?.push(`objectGroupPresets.objects[${index}]: 객체 형식이 올바르지 않아 제외되었습니다.`);
      return null;
    }
    const sprite = typeof obj.sprite === 'string' ? obj.sprite : null;
    if (!sprite) {
      warnings?.push(`objectGroupPresets.objects[${index}]: sprite 값이 없어 제외되었습니다.`);
      return null;
    }
    const hitboxes = Array.isArray(obj.hitboxes)
      ? obj.hitboxes
          .map((hitbox, hitboxIndex) =>
            sanitizeHitbox(hitbox, warnings, `objectGroupPresets.objects[${index}].hitboxes[${hitboxIndex}]`)
          )
          .filter(Boolean)
      : [];
    const sanitized = {
      id: typeof obj.id === 'string' ? obj.id : `obj_preset_item_${index}`,
      sprite,
      x: Math.round(toFiniteNumber(obj.x, 0)),
      y: Math.round(toFiniteNumber(obj.y, 0)),
      scale: clampNumber(obj.scale, 0.05, 20, 1),
      rotation: normalizeRotation(obj.rotation, 0),
      flipH: sanitizeBoolean(obj.flipH, false),
      flipV: sanitizeBoolean(obj.flipV, false),
      locked: sanitizeBoolean(obj.locked, false),
      crop: sanitizeCrop(obj.crop),
      hitboxes: hitboxes.length ? hitboxes : [{ x: 0, y: 0, w: 64, h: 64, rotation: 0, locked: false }]
    };
    if (obj.groupId) sanitized.groupId = String(obj.groupId);
    const textureColor = sanitizeHexColor(obj.textureColor, null);
    if (textureColor) sanitized.textureColor = textureColor;
    return sanitized;
  };

  const sanitizeObjectGroupPresetMap = (presetMap, warnings) => {
    if (!presetMap || typeof presetMap !== 'object') return {};
    const sanitized = {};
    Object.entries(presetMap).forEach(([presetId, preset], index) => {
      const id = typeof presetId === 'string' ? presetId.trim() : '';
      if (!id || !preset || typeof preset !== 'object') return;
      const objects = Array.isArray(preset.objects)
        ? preset.objects
            .map((obj, objIndex) =>
              sanitizeObjectGroupPresetObject(obj, objIndex, warnings)
            )
            .filter(Boolean)
        : [];
      if (!objects.length) {
        warnings?.push(`objectGroupPresets.${id}: 유효한 오브젝트가 없어 제외되었습니다.`);
        return;
      }
      const fallbackName = `묶음 ${index + 1}`;
      const name = normalizeObjectGroupPresetName(preset.name, fallbackName) || fallbackName;
      sanitized[id] = {
        name,
        savedAt: typeof preset.savedAt === 'string' ? preset.savedAt : null,
        objects
      };
    });
    return sanitized;
  };

  const migrateObjectV0ToV1 = (obj, index, warnings) => {
    if (!isObject(obj)) return obj;
    const migrated = { ...obj };
    if (!migrated.sprite && typeof migrated.spriteName === 'string') {
      migrated.sprite = migrated.spriteName;
      warnings.push(`objects[${index}]: spriteName을 sprite로 변환했습니다.`);
    }
    if (!Array.isArray(migrated.hitboxes)) {
      if (isObject(migrated.hitbox)) {
        migrated.hitboxes = [migrated.hitbox];
        warnings.push(`objects[${index}]: hitbox를 hitboxes 배열로 변환했습니다.`);
      } else if (Array.isArray(migrated.colliderBoxes)) {
        migrated.hitboxes = migrated.colliderBoxes;
        warnings.push(`objects[${index}]: colliderBoxes를 hitboxes 배열로 변환했습니다.`);
      }
    }
    if (migrated.scale === undefined && migrated.defaultScale !== undefined) {
      migrated.scale = migrated.defaultScale;
      warnings.push(`objects[${index}]: defaultScale을 scale로 변환했습니다.`);
    }
    if (!migrated.crop && isObject(migrated.cropRect)) {
      migrated.crop = migrated.cropRect;
      warnings.push(`objects[${index}]: cropRect를 crop으로 변환했습니다.`);
    }
    return migrated;
  };

  const migratePayloadV0ToV1 = (payload, warnings) => {
    if (!isObject(payload)) return { version: 1 };
    const migrated = { ...payload };
    if (!migrated.mapSize) {
      const map = isObject(migrated.map) ? migrated.map : {};
      const width = map.w ?? map.width ?? migrated.width;
      const height = map.h ?? map.height ?? migrated.height;
      if (width !== undefined || height !== undefined) {
        migrated.mapSize = { w: width, h: height };
        warnings.push('레거시 맵 크기 필드를 mapSize로 변환했습니다.');
      }
    }
    if (!migrated.startPoint && isObject(migrated.start)) {
      migrated.startPoint = { x: migrated.start.x, y: migrated.start.y };
      warnings.push('start 필드를 startPoint로 변환했습니다.');
    }
    if (isObject(migrated.player)) {
      if (!migrated.playerHitbox && isObject(migrated.player.hitbox)) {
        migrated.playerHitbox = migrated.player.hitbox;
        warnings.push('player.hitbox를 playerHitbox로 변환했습니다.');
      }
      if (migrated.playerScale === undefined && migrated.player.scale !== undefined) {
        migrated.playerScale = migrated.player.scale;
        warnings.push('player.scale을 playerScale로 변환했습니다.');
      }
      if (!migrated.playerCrop && isObject(migrated.player.crop)) {
        migrated.playerCrop = migrated.player.crop;
        warnings.push('player.crop을 playerCrop으로 변환했습니다.');
      }
    }
    if (Array.isArray(migrated.objects)) {
      migrated.objects = migrated.objects.map((obj, index) => migrateObjectV0ToV1(obj, index, warnings));
    }
    migrated.version = 1;
    return migrated;
  };

  const migratePayloadV1ToV2 = (payload, warnings) => {
    if (!isObject(payload)) return { version: 2 };
    const migrated = { ...payload };
    if (!isObject(migrated.spriteProfiles) && isObject(migrated.spriteProfileMap)) {
      migrated.spriteProfiles = migrated.spriteProfileMap;
      warnings.push('spriteProfileMap을 spriteProfiles로 변환했습니다.');
    }
    if (!isObject(migrated.hitboxPresets) && isObject(migrated.hitboxProfileMap)) {
      migrated.hitboxPresets = migrated.hitboxProfileMap;
      warnings.push('hitboxProfileMap을 hitboxPresets로 변환했습니다.');
    }
    if (isObject(migrated.editorOptions) && migrated.editorOptions.autoSelectAfterPlace === undefined) {
      if (migrated.editorOptions.autoSelectPlaced !== undefined) {
        migrated.editorOptions.autoSelectAfterPlace = !!migrated.editorOptions.autoSelectPlaced;
        warnings.push('editorOptions.autoSelectPlaced를 autoSelectAfterPlace로 변환했습니다.');
      }
    }
    if (!isObject(migrated.objectGroupPresets) && isObject(migrated.objectGroupPresetMap)) {
      migrated.objectGroupPresets = migrated.objectGroupPresetMap;
      warnings.push('objectGroupPresetMap을 objectGroupPresets로 변환했습니다.');
    }
    migrated.version = 2;
    return migrated;
  };

  const migratePayloadToCurrent = (payload, warnings) => {
    let migrated = clonePlain(payload);
    let workingVersion = Number(migrated?.version);
    if (!Number.isFinite(workingVersion)) {
      workingVersion = 0;
      warnings.push('버전 정보가 없어 레거시 포맷(v0)으로 처리했습니다.');
    }
    const sourceVersion = workingVersion;
    if (workingVersion > CURRENT_MAP_SCHEMA_VERSION) {
      warnings.push(
        `현재 지원 버전(${CURRENT_MAP_SCHEMA_VERSION})보다 높은 버전(${workingVersion}) 파일입니다. 가능한 필드만 불러옵니다.`
      );
      return { payload: isObject(migrated) ? migrated : {}, sourceVersion };
    }

    while (workingVersion < CURRENT_MAP_SCHEMA_VERSION) {
      if (workingVersion === 0) {
        migrated = migratePayloadV0ToV1(migrated, warnings);
        workingVersion = 1;
        continue;
      }
      if (workingVersion === 1) {
        migrated = migratePayloadV1ToV2(migrated, warnings);
        workingVersion = 2;
        continue;
      }
      break;
    }

    if (!isObject(migrated)) migrated = {};
    migrated.version = CURRENT_MAP_SCHEMA_VERSION;
    return { payload: migrated, sourceVersion };
  };

  const sanitizeHitboxPresets = (hitboxPresets, warnings) => {
    if (!hitboxPresets || typeof hitboxPresets !== 'object') return {};
    const sanitized = {};
    Object.entries(hitboxPresets).forEach(([sprite, list]) => {
      if (typeof sprite !== 'string' || !Array.isArray(list)) return;
      const hitboxes = list
        .map((hitbox, hitboxIndex) =>
          sanitizeHitbox(hitbox, warnings, `hitboxPresets.${sprite}[${hitboxIndex}]`)
        )
        .filter(Boolean);
      if (hitboxes.length) sanitized[sprite] = hitboxes;
    });
    return sanitized;
  };

  const sanitizeSpriteDefaults = (spriteDefaults) => {
    if (!spriteDefaults || typeof spriteDefaults !== 'object') return {};
    const sanitized = {};
    Object.entries(spriteDefaults).forEach(([sprite, data]) => {
      if (typeof sprite !== 'string' || !data || typeof data !== 'object') return;
      sanitized[sprite] = {
        scale: clampNumber(data.scale, 0.05, 20, 1)
      };
    });
    return sanitized;
  };

  const sanitizeSpriteProfiles = (spriteProfiles, warnings) => {
    if (!spriteProfiles || typeof spriteProfiles !== 'object') return {};
    const sanitized = {};
    Object.entries(spriteProfiles).forEach(([sprite, data]) => {
      if (typeof sprite !== 'string' || !data || typeof data !== 'object') return;
      const profile = {};
      const scale = clampNumber(data.scale ?? data.defaultScale, 0.05, 20, 1);
      if (Number.isFinite(scale) && scale > 0) profile.scale = scale;
      const crop = sanitizeCrop(data.crop);
      if (crop) profile.crop = crop;
      const hitboxes = Array.isArray(data.hitboxes)
        ? data.hitboxes
            .map((hitbox, hitboxIndex) =>
              sanitizeHitbox(hitbox, warnings, `spriteProfiles.${sprite}.hitboxes[${hitboxIndex}]`)
            )
            .filter(Boolean)
        : [];
      if (hitboxes.length) profile.hitboxes = hitboxes;
      if (typeof data.source === 'string') profile.source = data.source;
      if (Object.keys(profile).length) {
        sanitized[sprite] = profile;
      }
    });
    return sanitized;
  };

  const mergeLegacyIntoProfiles = (spriteProfiles, hitboxPresets, spriteDefaults) => {
    const merged = { ...spriteProfiles };
    const names = new Set([
      ...Object.keys(hitboxPresets || {}),
      ...Object.keys(spriteDefaults || {})
    ]);
    names.forEach((sprite) => {
      const current = merged[sprite] && typeof merged[sprite] === 'object' ? merged[sprite] : {};
      if (!Number.isFinite(current.scale) && Number.isFinite(spriteDefaults?.[sprite]?.scale)) {
        current.scale = clampNumber(spriteDefaults[sprite].scale, 0.05, 20, 1);
      }
      if (!Array.isArray(current.hitboxes) || !current.hitboxes.length) {
        const legacyHitboxes = hitboxPresets?.[sprite];
        if (Array.isArray(legacyHitboxes) && legacyHitboxes.length) {
          current.hitboxes = legacyHitboxes;
        }
      }
      if (Object.keys(current).length) {
        merged[sprite] = current;
      }
    });
    return merged;
  };

  const buildSavePayload = (state) => ({
    version: CURRENT_MAP_SCHEMA_VERSION,
    schema: 'jumpmap-editor-map',
    savedAt: new Date().toISOString(),
    mapSize: { w: state.map.width, h: state.map.height },
    grid: state.grid,
    camera: state.camera,
    background: {
      ...state.background,
      image: normalizeBackgroundImagePath(state?.background?.image, '')
    },
    playerHitbox: state.playerHitbox,
    playerHitboxOffset: state.playerHitboxOffset,
    playerHitboxPolygon: state.playerHitboxPolygon ?? null,
    playerScale: state.playerScale,
    playerCrop: state.playerCrop,
    playerLocked: sanitizeBoolean(state.playerLocked, false),
    physics: state.physics,
    startPoint: state.startPoint,
    savePoints: sanitizeSavePoints(state.savePoints, state.map),
    editorOptions: state.editorOptions,
    spriteProfiles: state.spriteProfiles,
    objectGroupPresets: sanitizeObjectGroupPresetMap(state.objectGroupPresets || {}),
    hitboxPresets: state.hitboxPresets,
    objects: state.objects,
    spriteDefaults: state.spriteDefaults
  });

  const parseLoadedMapData = (raw, currentState) => {
    let parsed;
    const warnings = [];
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      return { ok: false, error: 'JSON 파싱에 실패했습니다.' };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: '맵 파일 형식이 올바르지 않습니다.' };
    }
    const candidate = isObject(parsed?.payload) ? parsed.payload : parsed;
    const migratedResult = migratePayloadToCurrent(candidate, warnings);
    const migrated = migratedResult.payload;
    const sourceVersion = migratedResult.sourceVersion;

    const map = sanitizeMapSize(migrated.mapSize || {}, currentState.map);
    if (migrated.mapSize && (map.width !== Number(migrated.mapSize.w) || map.height !== Number(migrated.mapSize.h))) {
      warnings.push('맵 크기 값이 범위를 벗어나거나 비정상이라 자동 보정되었습니다.');
    }
    const grid = sanitizeGrid(migrated.grid || {}, currentState.grid);
    if (migrated.grid && Number(migrated.grid.size) !== grid.size) {
      warnings.push('격자 크기가 허용값(8/16/32/64)으로 보정되었습니다.');
    }
    const camera = sanitizeCamera(migrated.camera || {}, currentState.camera);
    const background = sanitizeBackground(migrated.background || {}, currentState.background);
    const playerHitbox = sanitizePlayerHitbox(migrated.playerHitbox || {}, currentState.playerHitbox);
    const playerHitboxOffset = sanitizePlayerHitboxOffset(migrated.playerHitboxOffset || {}, currentState.playerHitboxOffset || { x: 0, y: 0 });
    const playerHitboxPolygon = sanitizePlayerHitboxPolygon(
      migrated.playerHitboxPolygon,
      currentState.playerHitboxPolygon ?? null
    );
    const playerScale = clampNumber(migrated.playerScale, 0.2, 3, currentState.playerScale || 1);
    const playerCrop = sanitizePlayerCrop(migrated.playerCrop, currentState.playerCrop ?? null);
    const playerLocked = sanitizeBoolean(migrated.playerLocked, sanitizeBoolean(currentState.playerLocked, false));
    const physics = sanitizePhysics(migrated.physics || {}, currentState.physics, map);
    if (migrated.physics && (Object.prototype.hasOwnProperty.call(migrated.physics, 'gravity') || Object.prototype.hasOwnProperty.call(migrated.physics, 'maxFallSpeed'))) {
      warnings.push('레거시 물리 필드(gravity/maxFallSpeed)를 현재 필드로 변환했습니다.');
    }
    const startPoint = sanitizeStartPoint(
      migrated.startPoint,
      currentState.startPoint || { x: 0, y: map.height - 200 },
      map
    );
    if (migrated.startPoint && (
      startPoint.x !== Math.round(toFiniteNumber(migrated.startPoint.x, startPoint.x))
      || startPoint.y !== Math.round(toFiniteNumber(migrated.startPoint.y, startPoint.y))
    )) {
      warnings.push('시작 지점이 맵 범위를 벗어나 자동 보정되었습니다.');
    }
    const editorOptions = sanitizeEditorOptions(migrated.editorOptions || {}, currentState.editorOptions);
    const savePoints = sanitizeSavePoints(migrated.savePoints, map, warnings);
    const hitboxPresets = sanitizeHitboxPresets(migrated.hitboxPresets || {}, warnings);
    const objects = Array.isArray(migrated.objects)
      ? migrated.objects.map((obj, index) => sanitizeObject(obj, index, warnings)).filter(Boolean)
      : [];
    if (Array.isArray(migrated.objects) && objects.length !== migrated.objects.length) {
      warnings.push(`유효하지 않은 오브젝트 ${migrated.objects.length - objects.length}개가 제외되었습니다.`);
    }
    const spriteDefaults = sanitizeSpriteDefaults(migrated.spriteDefaults || {});
    const spriteProfiles = mergeLegacyIntoProfiles(
      sanitizeSpriteProfiles(migrated.spriteProfiles || {}, warnings),
      hitboxPresets,
      spriteDefaults
    );
    const objectGroupPresets = sanitizeObjectGroupPresetMap(
      migrated.objectGroupPresets || {},
      warnings
    );

    return {
      ok: true,
      warnings,
      payload: {
        version: CURRENT_MAP_SCHEMA_VERSION,
        map,
        grid,
        camera,
        background,
        playerHitbox,
        playerHitboxOffset,
        playerHitboxPolygon,
        playerScale,
        playerCrop,
        playerLocked,
        physics,
        startPoint,
        savePoints,
        editorOptions,
        spriteProfiles,
        objectGroupPresets,
        hitboxPresets,
        objects,
        spriteDefaults
      },
      sourceVersion
    };
  };

  window.JumpmapMapIOUtils = {
    CURRENT_MAP_SCHEMA_VERSION,
    buildSavePayload,
    parseLoadedMapData
  };
})();
