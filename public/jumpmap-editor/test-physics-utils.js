(function initJumpmapTestPhysicsUtils() {
  const EPS = 1e-6;
  const DEFAULT_SLOPE_SPEED_PROFILE = [
    { minAngle: 0, maxAngle: 15, up: 1.0, down: 1.0 },
    { minAngle: 16, maxAngle: 30, up: 1.0, down: 1.0 },
    { minAngle: 31, maxAngle: 45, up: 1.0, down: 1.0 },
    { minAngle: 46, maxAngle: 60, up: 0.88, down: 1.12 },
    { minAngle: 61, maxAngle: 75, up: 0.72, down: 1.32 },
    { minAngle: 76, maxAngle: 90, up: 0.5, down: 1.62 }
  ];
  const DEFAULT_WALKABLE_SLOPE_MAX_ANGLE = 75;
  const DEFAULT_SLOPE_FALL_START_ANGLE = 75;
  const DEFAULT_FLAT_INERTIA_PERCENT = 88;
  const DEFAULT_ICE_INERTIA_PERCENT = 96;
  const DEFAULT_ICE_CONTROL_PERCENT = 72;
  const MAX_FLAT_INERTIA_PERCENT = 99;
  const DEFAULT_GROUND_SAMPLE_SPACING = 6;
  const HORIZONTAL_CONTACT_SKIN = 0.75;
  const HORIZONTAL_COLLISION_TRIM = 2;
  const MAX_FLAT_ZONES = 128;
  const MIN_GROUND_SUPPORT_SAMPLES = 2;
  const MIN_GROUND_SUPPORT_SPAN_RATIO = 0.22;
  const GROUND_SUPPORT_Y_TOLERANCE = 1.5;
  const MIN_SLOPE_FACTOR = 0.2;
  const MAX_SLOPE_FACTOR = 2.0;
  const MAX_SLOPE_PROFILE_ROWS = 24;
  const COYOTE_TIME_SEC = 0.12;
  const OBSTACLE_CELL_SIZE = 96;

  const createPlayerState = () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    jumpsUsed: 0,
    jumpedFromGround: false,
    jumping: false,
    jumpTargetY: 0,
    coyoteTimer: 0,
    walkTimer: 0,
    input: { left: false, right: false, jumpQueued: false, jumpHeld: false, jumpLock: false }
  });

  const getSpawnPosition = (map, startPoint, metrics, offset) => {
    const x = Math.max(0, Math.min(map.width - metrics.width, startPoint.x - metrics.width / 2 + offset.x));
    const y = Math.max(0, Math.min(map.height - metrics.height, startPoint.y - metrics.height + offset.y));
    return { x, y };
  };

  const buildObstacleSpatialIndex = (list, cellSize = OBSTACLE_CELL_SIZE) => {
    const buckets = new Map();
    const safeCell = Math.max(24, Math.round(Number(cellSize) || OBSTACLE_CELL_SIZE));
    list.forEach((box, index) => {
      const minCx = Math.floor(box.x1 / safeCell);
      const maxCx = Math.floor((box.x2 - EPS) / safeCell);
      const minCy = Math.floor(box.y1 / safeCell);
      const maxCy = Math.floor((box.y2 - EPS) / safeCell);
      for (let cx = minCx; cx <= maxCx; cx += 1) {
        for (let cy = minCy; cy <= maxCy; cy += 1) {
          const key = `${cx}:${cy}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(index);
        }
      }
    });
    return { cellSize: safeCell, buckets };
  };

  const getObstacleList = (obstacles) => (
    Array.isArray(obstacles)
      ? obstacles
      : (Array.isArray(obstacles?.list) ? obstacles.list : [])
  );

  const getObstacleCandidates = (obstacles, x1, y1, x2, y2) => {
    const list = getObstacleList(obstacles);
    const index = obstacles?.index;
    if (!index?.buckets || !index.cellSize || !list.length) return list;
    const safeX1 = Math.min(x1, x2);
    const safeX2 = Math.max(x1, x2);
    const safeY1 = Math.min(y1, y2);
    const safeY2 = Math.max(y1, y2);
    const minCx = Math.floor(safeX1 / index.cellSize);
    const maxCx = Math.floor((safeX2 - EPS) / index.cellSize);
    const minCy = Math.floor(safeY1 / index.cellSize);
    const maxCy = Math.floor((safeY2 - EPS) / index.cellSize);
    const hitIndices = new Set();
    for (let cx = minCx; cx <= maxCx; cx += 1) {
      for (let cy = minCy; cy <= maxCy; cy += 1) {
        const key = `${cx}:${cy}`;
        const bucket = index.buckets.get(key);
        if (!bucket) continue;
        bucket.forEach((idx) => hitIndices.add(idx));
      }
    }
    if (!hitIndices.size) return [];
    const candidates = [];
    hitIndices.forEach((idx) => {
      const box = list[idx];
      if (box) candidates.push(box);
    });
    return candidates;
  };

  const collectObstacleBounds = ({ objects, localPointToWorld }) => {
    const bounds = [];
    objects.forEach((obj) => {
      const surfaceKind = getSurfaceKindFromSprite(obj?.sprite);
      const cropX = obj?.crop ? Math.max(0, Number(obj.crop.x) || 0) : 0;
      const cropY = obj?.crop ? Math.max(0, Number(obj.crop.y) || 0) : 0;
      const list = Array.isArray(obj?.hitboxes) ? obj.hitboxes : [];
      list.forEach((hb) => {
        if (hb?.type === 'polygon' && Array.isArray(hb.points) && hb.points.length >= 3) {
          const hbx = (Number(hb.x) || 0) - cropX;
          const hby = (Number(hb.y) || 0) - cropY;
          const localPoints = hb.points
            .map((point) => ({
              x: hbx + (Number(point?.x) || 0),
              y: hby + (Number(point?.y) || 0)
            }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
          if (localPoints.length >= 3) {
            const corners = localPoints.map((point) => localPointToWorld(point.x, point.y, obj));
            const xs = corners.map((p) => p.x);
            const ys = corners.map((p) => p.y);
            const rawEdgeSlip = Array.isArray(hb.edgeSlip) ? hb.edgeSlip : null;
            const edgeSlip = rawEdgeSlip
              ? corners.map((_, edgeIndex) => rawEdgeSlip[edgeIndex] !== false)
              : null;
            bounds.push({
              points: corners,
              surfaceKind,
              ...(edgeSlip ? { edgeSlip } : {}),
              x1: Math.min(...xs),
              y1: Math.min(...ys),
              x2: Math.max(...xs),
              y2: Math.max(...ys)
            });
          }
          return;
        }
        const hbx = hb.x - cropX;
        const hby = hb.y - cropY;
        const w = Math.max(1, Number(hb.w) || 1);
        const h = Math.max(1, Number(hb.h) || 1);
        let hitboxRotation = Math.round(Number(hb.rotation) || 0);
        hitboxRotation %= 360;
        if (hitboxRotation < 0) hitboxRotation += 360;
        const cx = hbx + w / 2;
        const cy = hby + h / 2;
        const rad = (hitboxRotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotateLocalCorner = (x, y) => {
          if (!hitboxRotation) return { x, y };
          const dx = x - cx;
          const dy = y - cy;
          return {
            x: cx + dx * cos - dy * sin,
            y: cy + dx * sin + dy * cos
          };
        };
        const corners = [
          rotateLocalCorner(hbx, hby),
          rotateLocalCorner(hbx + w, hby),
          rotateLocalCorner(hbx + w, hby + h),
          rotateLocalCorner(hbx, hby + h)
        ].map((corner) => localPointToWorld(corner.x, corner.y, obj));
        const xs = corners.map((p) => p.x);
        const ys = corners.map((p) => p.y);
        bounds.push({
          points: corners,
          surfaceKind,
          x1: Math.min(...xs),
          y1: Math.min(...ys),
          x2: Math.max(...xs),
          y2: Math.max(...ys)
        });
      });
    });
    return {
      list: bounds,
      index: buildObstacleSpatialIndex(bounds, OBSTACLE_CELL_SIZE)
    };
  };

  const hasHorizontalOverlap = (x, w, box) => (x + w) > (box.x1 + EPS) && x < (box.x2 - EPS);
  const hasVerticalOverlap = (y, h, box) => (y + h) > (box.y1 + EPS) && y < (box.y2 - EPS);
  const hasAabbOverlap = (x, y, w, h, box) =>
    hasHorizontalOverlap(x, w, box) && hasVerticalOverlap(y, h, box);

  const rectToPolygon = (x, y, w, h) => ([
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h }
  ]);

  const normalizePlayerHitboxPolygon = (polygon) => {
    const source = Array.isArray(polygon?.points)
      ? polygon.points
      : (Array.isArray(polygon) ? polygon : null);
    if (!Array.isArray(source) || source.length < 3) return null;
    const points = source
      .map((point) => ({
        x: Number(point?.x),
        y: Number(point?.y)
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: Math.max(0, Math.min(1, point.x)),
        y: Math.max(0, Math.min(1, point.y))
      }));
    if (points.length < 3) return null;
    return { points };
  };

  const buildPlayerPolygonAt = (x, y, width, height, playerHitboxPolygon = null) => {
    const normalized = normalizePlayerHitboxPolygon(playerHitboxPolygon);
    if (!normalized) return rectToPolygon(x, y, width, height);
    return normalized.points.map((point) => ({
      x: x + point.x * width,
      y: y + point.y * height
    }));
  };

  const getPolygonBounds = (points) => {
    if (!Array.isArray(points) || points.length < 3) return null;
    const xs = points.map((point) => Number(point?.x));
    const ys = points.map((point) => Number(point?.y));
    if (xs.some((value) => !Number.isFinite(value)) || ys.some((value) => !Number.isFinite(value))) {
      return null;
    }
    const x1 = Math.min(...xs);
    const y1 = Math.min(...ys);
    const x2 = Math.max(...xs);
    const y2 = Math.max(...ys);
    return { x1, y1, x2, y2, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
  };

  const cross2D = (a, b, c) => (
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  );

  const pointOnSegment = (point, a, b) => {
    const minX = Math.min(a.x, b.x) - EPS;
    const maxX = Math.max(a.x, b.x) + EPS;
    const minY = Math.min(a.y, b.y) - EPS;
    const maxY = Math.max(a.y, b.y) + EPS;
    if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) return false;
    return Math.abs(cross2D(a, b, point)) <= EPS;
  };

  const segmentsIntersect = (a1, a2, b1, b2) => {
    const aMinX = Math.min(a1.x, a2.x) - EPS;
    const aMaxX = Math.max(a1.x, a2.x) + EPS;
    const aMinY = Math.min(a1.y, a2.y) - EPS;
    const aMaxY = Math.max(a1.y, a2.y) + EPS;
    const bMinX = Math.min(b1.x, b2.x) - EPS;
    const bMaxX = Math.max(b1.x, b2.x) + EPS;
    const bMinY = Math.min(b1.y, b2.y) - EPS;
    const bMaxY = Math.max(b1.y, b2.y) + EPS;
    if (aMaxX < bMinX || bMaxX < aMinX || aMaxY < bMinY || bMaxY < aMinY) return false;

    const d1 = cross2D(a1, a2, b1);
    const d2 = cross2D(a1, a2, b2);
    const d3 = cross2D(b1, b2, a1);
    const d4 = cross2D(b1, b2, a2);

    const proper =
      ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS))
      && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
    if (proper) return true;

    if (Math.abs(d1) <= EPS && pointOnSegment(b1, a1, a2)) return true;
    if (Math.abs(d2) <= EPS && pointOnSegment(b2, a1, a2)) return true;
    if (Math.abs(d3) <= EPS && pointOnSegment(a1, b1, b2)) return true;
    if (Math.abs(d4) <= EPS && pointOnSegment(a2, b1, b2)) return true;
    return false;
  };

  const pointInPolygon = (point, polygon) => {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[j];
      const b = polygon[i];
      if (pointOnSegment(point, a, b)) return true;
      const intersects =
        ((a.y > point.y) !== (b.y > point.y))
        && (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || EPS) + a.x);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  // Strict variant: boundary touch does not count as "inside".
  const pointInPolygonStrict = (point, polygon) => {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      if (pointOnSegment(point, polygon[j], polygon[i])) return false;
    }
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[j];
      const b = polygon[i];
      const intersects =
        ((a.y > point.y) !== (b.y > point.y))
        && (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || EPS) + a.x);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const segmentsProperlyIntersect = (a1, a2, b1, b2) => {
    const aMinX = Math.min(a1.x, a2.x) - EPS;
    const aMaxX = Math.max(a1.x, a2.x) + EPS;
    const aMinY = Math.min(a1.y, a2.y) - EPS;
    const aMaxY = Math.max(a1.y, a2.y) + EPS;
    const bMinX = Math.min(b1.x, b2.x) - EPS;
    const bMaxX = Math.max(b1.x, b2.x) + EPS;
    const bMinY = Math.min(b1.y, b2.y) - EPS;
    const bMaxY = Math.max(b1.y, b2.y) + EPS;
    if (aMaxX < bMinX || bMaxX < aMinX || aMaxY < bMinY || bMaxY < aMinY) return false;

    const d1 = cross2D(a1, a2, b1);
    const d2 = cross2D(a1, a2, b2);
    const d3 = cross2D(b1, b2, a1);
    const d4 = cross2D(b1, b2, a2);

    return (
      ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS))
      && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))
    );
  };

  const polygonsIntersect = (aPoints, bPoints) => {
    if (!Array.isArray(aPoints) || !Array.isArray(bPoints)) return false;
    if (aPoints.length < 3 || bPoints.length < 3) return false;

    for (let i = 0; i < aPoints.length; i += 1) {
      const a1 = aPoints[i];
      const a2 = aPoints[(i + 1) % aPoints.length];
      for (let j = 0; j < bPoints.length; j += 1) {
        const b1 = bPoints[j];
        const b2 = bPoints[(j + 1) % bPoints.length];
        if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
      }
    }

    for (let i = 0; i < aPoints.length; i += 1) {
      if (pointInPolygonStrict(aPoints[i], bPoints)) return true;
    }
    for (let i = 0; i < bPoints.length; i += 1) {
      if (pointInPolygonStrict(bPoints[i], aPoints)) return true;
    }
    return false;
  };

  const normalizeSlopeSpeedProfile = (physics = {}) => {
    const raw = Array.isArray(physics.slopeSpeedProfile) ? physics.slopeSpeedProfile : null;
    if (!raw || !raw.length) return DEFAULT_SLOPE_SPEED_PROFILE;
    const normalizedBase = raw
      .slice(0, MAX_SLOPE_PROFILE_ROWS)
      .map((entry) => ({
        minAngle: Number(entry?.minAngle),
        maxAngle: Math.max(0, Math.min(90, Number(entry?.maxAngle))),
        up: Math.max(MIN_SLOPE_FACTOR, Math.min(MAX_SLOPE_FACTOR, Number(entry?.up))),
        down: Math.max(MIN_SLOPE_FACTOR, Math.min(MAX_SLOPE_FACTOR, Number(entry?.down)))
      }))
      .filter((entry) =>
        Number.isFinite(entry.maxAngle) &&
        Number.isFinite(entry.up) &&
        Number.isFinite(entry.down)
      )
      .sort((a, b) => {
        const aMin = Number.isFinite(a.minAngle) ? a.minAngle : Number.POSITIVE_INFINITY;
        const bMin = Number.isFinite(b.minAngle) ? b.minAngle : Number.POSITIVE_INFINITY;
        if (aMin !== bMin) return aMin - bMin;
        return a.maxAngle - b.maxAngle;
      });
    if (!normalizedBase.length) return DEFAULT_SLOPE_SPEED_PROFILE;
    const normalized = [];
    let prevMax = -1;
    normalizedBase.forEach((entry, index) => {
      const isLast = index === normalizedBase.length - 1;
      const minAllowed = index === 0 ? 0 : prevMax + 1;
      let minAngle = Number.isFinite(entry.minAngle) ? Math.round(entry.minAngle) : minAllowed;
      minAngle = Math.max(minAllowed, Math.min(90, minAngle));
      let maxAngle = Math.round(entry.maxAngle);
      if (isLast) {
        maxAngle = 90;
      } else {
        maxAngle = Math.max(minAngle + 1, Math.min(89, maxAngle));
      }
      prevMax = maxAngle;
      normalized.push({
        minAngle,
        maxAngle,
        up: entry.up,
        down: entry.down
      });
    });
    return normalized;
  };

  const getSlopeProfileEntry = (physics, angleDeg) => {
    const profile = normalizeSlopeSpeedProfile(physics);
    const angle = Math.max(0, Math.min(90, Number(angleDeg) || 0));
    const matched = profile.find((entry) => {
      const min = Number.isFinite(entry.minAngle) ? entry.minAngle : 0;
      return angle >= min && angle <= entry.maxAngle;
    });
    if (matched) return matched;
    if (angle < (Number.isFinite(profile[0]?.minAngle) ? profile[0].minAngle : 0)) return profile[0];
    return profile[profile.length - 1];
  };

  const getSlopeSpeedFactor = (physics, angleDeg, uphill) => {
    const selected = getSlopeProfileEntry(physics, angleDeg);
    const factor = uphill ? selected.up : selected.down;
    return Math.max(MIN_SLOPE_FACTOR, Math.min(MAX_SLOPE_FACTOR, factor));
  };

  const getSlopeSlideDriftFactor = (physics, angleDeg, uphillInput = false) => {
    const selected = getSlopeProfileEntry(physics, angleDeg);
    const diff = Math.max(0, selected.down - selected.up);
    const angleNorm = Math.max(0, Math.min(1, ((Number(angleDeg) || 0) - 4) / 56));
    const base = diff * (uphillInput ? 0.56 : 0.34);
    const scaled = base * (0.5 + angleNorm * 0.5);
    return Math.max(0, Math.min(0.95, scaled));
  };

  const normalizeGroundSampleSpacing = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_GROUND_SAMPLE_SPACING;
    return Math.max(2, Math.min(32, Math.round(n)));
  };

  const normalizeWalkableSlopeMaxAngle = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_WALKABLE_SLOPE_MAX_ANGLE;
    return Math.max(0, Math.min(90, n));
  };

  const normalizeSlopeFallStartAngle = (value, walkableSlopeMaxAngle) => {
    const n = Number(value);
    const base = Number.isFinite(n) ? Math.max(0, Math.min(90, n)) : DEFAULT_SLOPE_FALL_START_ANGLE;
    return Math.max(walkableSlopeMaxAngle, base);
  };

  const normalizeFlatInertiaKeepFactor = (value) => {
    const n = Number(value);
    const percent = Number.isFinite(n)
      ? Math.max(0, Math.min(MAX_FLAT_INERTIA_PERCENT, n))
      : DEFAULT_FLAT_INERTIA_PERCENT;
    return percent / 100;
  };

  const normalizeIceInertiaKeepFactor = (value) => {
    const n = Number(value);
    const percent = Number.isFinite(n)
      ? Math.max(0, Math.min(MAX_FLAT_INERTIA_PERCENT, n))
      : DEFAULT_ICE_INERTIA_PERCENT;
    return percent / 100;
  };

  const normalizeIceControlFactor = (value) => {
    const n = Number(value);
    const percent = Number.isFinite(n)
      ? Math.max(20, Math.min(100, n))
      : DEFAULT_ICE_CONTROL_PERCENT;
    return percent / 100;
  };

  const getSurfaceKindFromSprite = (sprite) => (
    typeof sprite === 'string' && /ice/i.test(sprite) ? 'ice' : 'default'
  );

  const normalizeFlatZonesForPhysics = (zones, map) => {
    if (!Array.isArray(zones) || !zones.length) return [];
    const mapWidth = Number.isFinite(Number(map?.width)) ? Math.max(1, Number(map.width)) : Infinity;
    const mapHeight = Number.isFinite(Number(map?.height)) ? Math.max(1, Number(map.height)) : Infinity;
    const normalized = [];
    zones.slice(0, MAX_FLAT_ZONES).forEach((zone) => {
      if (!zone || typeof zone !== 'object') return;
      const rawX = Number(zone.x);
      const rawY = Number(zone.y);
      const rawW = Number(zone.w);
      const rawH = Number(zone.h);
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawW) || !Number.isFinite(rawH)) return;
      const x1 = Math.max(0, Math.min(mapWidth, Math.min(rawX, rawX + rawW)));
      const y1 = Math.max(0, Math.min(mapHeight, Math.min(rawY, rawY + rawH)));
      const x2 = Math.max(0, Math.min(mapWidth, Math.max(rawX, rawX + rawW)));
      const y2 = Math.max(0, Math.min(mapHeight, Math.max(rawY, rawY + rawH)));
      const w = x2 - x1;
      const h = y2 - y1;
      if (w < 2 || h < 2) return;
      normalized.push({
        x: Math.round(x1),
        y: Math.round(y1),
        w: Math.round(w),
        h: Math.round(h)
      });
    });
    return normalized;
  };

  const isPlayerFootInFlatZone = (playerState, metrics, flatZones) => {
    if (!Array.isArray(flatZones) || !flatZones.length) return false;
    const footY = playerState.y + metrics.height;
    const leftX = playerState.x + 1;
    const centerX = playerState.x + metrics.width * 0.5;
    const rightX = playerState.x + metrics.width - 1;
    const samples = [leftX, centerX, rightX];
    return flatZones.some((zone) => {
      const x1 = zone.x;
      const y1 = zone.y;
      const x2 = zone.x + zone.w;
      const y2 = zone.y + zone.h;
      if (footY < y1 - EPS || footY > y2 + EPS) return false;
      return samples.some((sx) => sx >= x1 - EPS && sx <= x2 + EPS);
    });
  };

  const buildGroundSampleXs = (x, width, options = {}) => {
    const direction = Number(options.direction) || 0;
    const sampleSpacing = normalizeGroundSampleSpacing(options.sampleSpacing);
    const left = x + 1;
    const right = x + width - 1;
    if (right <= left + EPS) return [x + width * 0.5];
    const sampleXs = [];
    for (let sx = left; sx <= right + EPS; sx += sampleSpacing) {
      sampleXs.push(Math.min(right, sx));
    }
    sampleXs.push(x + width * 0.5);
    if (direction > EPS) sampleXs.push(right);
    else if (direction < -EPS) sampleXs.push(left);
    sampleXs.sort((a, b) => a - b);
    const uniqueXs = [];
    sampleXs.forEach((sx) => {
      if (!uniqueXs.length || Math.abs(uniqueXs[uniqueXs.length - 1] - sx) > 0.25) {
        uniqueXs.push(sx);
      }
    });
    return uniqueXs;
  };

  const getPolygonTopHitAtX = (points, x, edgeSlip = null, options = {}) => {
    const maxAbsSlope = Number.isFinite(options?.maxAbsSlope)
      ? Math.max(0, Number(options.maxAbsSlope))
      : Number.POSITIVE_INFINITY;
    const endpointMarginPx = Number.isFinite(options?.endpointMarginPx)
      ? Math.max(0, Number(options.endpointMarginPx))
      : 0;
    const candidates = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      if (x < minX - EPS || x > maxX + EPS) continue;
      const dx = b.x - a.x;
      if (Math.abs(dx) <= EPS) {
        // Vertical edge should never be treated as a "walkable top".
        continue;
      }
      const t = (x - a.x) / dx;
      if (t < -EPS || t > 1 + EPS) continue;
      const endpointMarginT = endpointMarginPx > EPS
        ? Math.min(0.49, endpointMarginPx / Math.abs(dx))
        : 0;
      if (endpointMarginT > EPS && (t <= endpointMarginT || t >= 1 - endpointMarginT)) {
        // Ignore segment endpoints to avoid hanging on corner-only contact.
        continue;
      }
      const slope = (b.y - a.y) / dx;
      if (Number.isFinite(maxAbsSlope) && Math.abs(slope) > maxAbsSlope + EPS) continue;
      candidates.push({
        y: a.y + (b.y - a.y) * t,
        edgeIndex: i,
        slope,
        edgeSlipEnabled: Array.isArray(edgeSlip) ? edgeSlip[i] !== false : true
      });
    }
    if (!candidates.length) return null;
    let top = candidates[0];
    for (let i = 1; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (candidate.y < top.y - EPS) {
        top = candidate;
      } else if (Math.abs(candidate.y - top.y) <= EPS) {
        const topAbsSlope = Number.isFinite(top.slope) ? Math.abs(top.slope) : Number.POSITIVE_INFINITY;
        const candidateAbsSlope = Number.isFinite(candidate.slope) ? Math.abs(candidate.slope) : Number.POSITIVE_INFINITY;
        if (candidateAbsSlope < topAbsSlope) top = candidate;
      }
    }
    return top;
  };

  const getPolygonTopYAtX = (points, x, edgeSlip = null, options = {}) => {
    const hit = getPolygonTopHitAtX(points, x, edgeSlip, options);
    return hit ? hit.y : null;
  };

  const collidesAt = (x, y, width, height, obstacles, playerHitboxPolygon = null) => {
    const playerPoly = buildPlayerPolygonAt(x, y, width, height, playerHitboxPolygon);
    const playerBounds = getPolygonBounds(playerPoly) || { x1: x, y1: y, x2: x + width, y2: y + height, w: width, h: height };
    const candidates = getObstacleCandidates(
      obstacles,
      playerBounds.x1,
      playerBounds.y1,
      playerBounds.x2,
      playerBounds.y2
    );
    for (const box of candidates) {
      if (!hasAabbOverlap(playerBounds.x1, playerBounds.y1, playerBounds.w, playerBounds.h, box)) continue;
      if (polygonsIntersect(playerPoly, box.points)) return true;
    }
    return false;
  };

  const findGroundSnapTopY = (x, y, width, height, obstacles, options = {}) => {
    const maxUp = Math.max(0, Number(options.maxUp) || 0);
    const maxDown = Math.max(0, Number(options.maxDown) || 0);
    const direction = Number(options.direction) || 0;
    const maxGroundAngle = Number(options.maxGroundAngle);
    const clampedGroundAngle = Number.isFinite(maxGroundAngle)
      ? Math.max(0, Math.min(89.9, maxGroundAngle))
      : 89.9;
    const maxAbsSlope = Math.tan((clampedGroundAngle * Math.PI) / 180);
    const endpointMarginPx = Number.isFinite(Number(options.endpointMarginPx))
      ? Math.max(0, Number(options.endpointMarginPx))
      : 0.75;
    const sampleXs = buildGroundSampleXs(x, width, {
      direction,
      sampleSpacing: options.sampleSpacing
    });
    let bestY = null;
    let bestScore = Infinity;
    let bestHit = null;
    const topCandidates = [];

    const queryTopYMin = y - maxUp + height - 4;
    const queryTopYMax = y + maxDown + height + 4;
    for (const sampleX of sampleXs) {
      const candidates = getObstacleCandidates(
        obstacles,
        sampleX - 2,
        queryTopYMin - 8,
        sampleX + 2,
        queryTopYMax + 8
      );
      for (const box of candidates) {
        if (sampleX < box.x1 - EPS || sampleX > box.x2 + EPS) continue;
        const topHit = getPolygonTopHitAtX(box.points, sampleX, box.edgeSlip, {
          maxAbsSlope,
          endpointMarginPx
        });
        if (!topHit) continue;
        const candidateY = topHit.y - height;
        const dy = candidateY - y;
        if (dy < -maxUp - EPS || dy > maxDown + EPS) continue;
        if (collidesAt(x, candidateY, width, height, obstacles, options.playerHitboxPolygon)) continue;
        const score = Math.abs(dy);
        topCandidates.push({
          sampleX,
          candidateY,
          score,
          hit: {
            ...topHit,
            surfaceKind: box.surfaceKind || 'default'
          }
        });
        if (score < bestScore || (score === bestScore && (bestY == null || candidateY < bestY))) {
          bestScore = score;
          bestY = candidateY;
          bestHit = {
            ...topHit,
            surfaceKind: box.surfaceKind || 'default'
          };
        }
      }
    }
    if (topCandidates.length) {
      const minSupportSamples = Math.max(
        1,
        Math.round(Number(options.minSupportSamples) || MIN_GROUND_SUPPORT_SAMPLES)
      );
      const minSupportSpanPx = Math.max(
        0,
        Number.isFinite(Number(options.minSupportSpanPx))
          ? Number(options.minSupportSpanPx)
          : Math.max(4, width * MIN_GROUND_SUPPORT_SPAN_RATIO)
      );
      const supportTolerance = Math.max(
        0.25,
        Number.isFinite(Number(options.supportYTolerance))
          ? Number(options.supportYTolerance)
          : GROUND_SUPPORT_Y_TOLERANCE
      );
      const sorted = topCandidates
        .slice()
        .sort((a, b) => (a.score - b.score) || (a.candidateY - b.candidateY));
      let supported = null;
      for (let i = 0; i < sorted.length; i += 1) {
        const candidate = sorted[i];
        const aligned = sorted.filter((entry) => Math.abs(entry.candidateY - candidate.candidateY) <= supportTolerance);
        const uniqueXs = Array.from(
          new Set(aligned.map((entry) => Math.round(entry.sampleX * 100) / 100))
        ).sort((a, b) => a - b);
        const spanPx = uniqueXs.length > 1 ? (uniqueXs[uniqueXs.length - 1] - uniqueXs[0]) : 0;
        const hasEnoughSupport = (
          uniqueXs.length >= minSupportSamples ||
          spanPx >= minSupportSpanPx
        );
        if (!hasEnoughSupport) continue;
        supported = candidate;
        break;
      }
      if (supported) {
        bestY = supported.candidateY;
        bestScore = supported.score;
        bestHit = supported.hit;
      } else {
        bestY = null;
        bestScore = Infinity;
        bestHit = null;
      }
    }
    if (options.includeHit) {
      return {
        y: bestY,
        hit: bestHit
      };
    }
    return bestY;
  };

  const estimateGroundSlope = ({
    x,
    y,
    width,
    height,
    obstacles,
    sampleSpacing,
    playerHitboxPolygon,
    maxGroundAngle
  }) => {
    const probe = Math.max(6, Math.min(24, Math.round(width * 0.18)));
    const leftX = x - probe;
    const rightX = x + probe;
    const leftTop = findGroundSnapTopY(leftX, y, width, height, obstacles, {
      maxUp: 32,
      maxDown: 32,
      direction: -1,
      sampleSpacing,
      playerHitboxPolygon,
      maxGroundAngle
    });
    const rightTop = findGroundSnapTopY(rightX, y, width, height, obstacles, {
      maxUp: 32,
      maxDown: 32,
      direction: 1,
      sampleSpacing,
      playerHitboxPolygon,
      maxGroundAngle
    });
    if (leftTop == null || rightTop == null) return null;
    const dx = rightX - leftX;
    if (Math.abs(dx) <= EPS) return null;
    return (rightTop - leftTop) / dx;
  };

  const detectGroundSupport = (playerState, metrics, obstacles, options = {}) => {
    const width = metrics.width;
    const height = metrics.height;
    const direction = Number(options.direction) || 0;
    const attempts = [];
    const pushAttempt = (dir) => {
      if (!Number.isFinite(dir)) return;
      if (attempts.some((item) => Math.abs(item - dir) <= EPS)) return;
      attempts.push(dir);
    };
    // 1) requested direction
    pushAttempt(direction);
    // 2) neutral sampling
    pushAttempt(0);
    // 3) opposite direction fallback
    if (direction > EPS) pushAttempt(-1);
    else if (direction < -EPS) pushAttempt(1);

    let bestTopY = null;
    let bestScore = Infinity;
    for (const dir of attempts) {
      const topY = findGroundSnapTopY(
        playerState.x,
        playerState.y,
        width,
        height,
        obstacles,
        {
          ...options,
          direction: dir
        }
      );
      if (topY == null) continue;
      const score = Math.abs(topY - playerState.y);
      if (score < bestScore) {
        bestScore = score;
        bestTopY = topY;
      }
    }
    if (bestTopY == null) {
      const strictTopY = findGroundSnapTopY(
        playerState.x,
        playerState.y,
        width,
        height,
        obstacles,
        {
          ...options,
          direction: 0,
          sampleSpacing: 2,
          maxUp: Math.max(4, Number(options.maxUp) || 0),
          maxDown: Math.max(12, Number(options.maxDown) || 0)
        }
      );
      if (strictTopY == null) return null;
      return strictTopY + height;
    }
    return bestTopY + height;
  };

  const resolveHorizontal = (playerState, nextX, metrics, obstacles, options = {}) => {
    const width = metrics.width;
    const height = metrics.height;
    const y = playerState.y;
    const currentX = playerState.x;
    const stepHeight = Math.max(0, Number(options.stepHeight) || 0);
    const sampleSpacing = normalizeGroundSampleSpacing(options.sampleSpacing);
    const allowStepUp = !!options.allowStepUp && stepHeight > EPS;
    if (Math.abs(playerState.vx) < EPS) return { x: nextX, y, blocked: false, stepped: false };
    // Ignore tiny floor-touch overlaps during horizontal solve so near-flat edges
    // do not become one-way blockers.
    const skinY = allowStepUp ? (y - HORIZONTAL_CONTACT_SKIN) : y;
    const bodyTrim = Math.max(0, Math.min(8, Number(HORIZONTAL_COLLISION_TRIM) || 0));
    const bodyH = Math.max(6, height - bodyTrim * 2);
    const collidesHorizontalAt = (testX, testY = y) => collidesAt(
      testX,
      (allowStepUp ? (testY - HORIZONTAL_CONTACT_SKIN) : testY) + bodyTrim,
      width,
      bodyH,
      obstacles,
      options.playerHitboxPolygon
    );
    const collidedAtTarget = collidesHorizontalAt(nextX, y);
    if (!collidedAtTarget) {
      return { x: nextX, y, blocked: false, stepped: false };
    }

    if (allowStepUp) {
      const directSlopeTop = findGroundSnapTopY(
        nextX,
        y,
        width,
        height,
          obstacles,
          {
            maxUp: stepHeight,
            maxDown: Math.max(2, stepHeight),
            direction: playerState.vx,
            sampleSpacing,
            maxGroundAngle: options.maxGroundAngle
          }
      );
      if (directSlopeTop != null) {
        return { x: nextX, y: directSlopeTop, blocked: false, stepped: true };
      }

      for (let lift = 1; lift <= stepHeight; lift += 1) {
        const steppedY = y - lift;
        if (collidesHorizontalAt(nextX, steppedY)) continue;
        const snapped = findGroundSnapTopY(
          nextX,
          steppedY,
          width,
          height,
          obstacles,
          {
            maxUp: 2,
            maxDown: 6,
            direction: playerState.vx,
            sampleSpacing,
            maxGroundAngle: options.maxGroundAngle
          }
        );
        return { x: nextX, y: snapped != null ? snapped : steppedY, blocked: false, stepped: true };
      }
    }

    let safeX = currentX;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i += 1) {
      const mid = (lo + hi) / 2;
      const testX = currentX + (nextX - currentX) * mid;
      if (collidesHorizontalAt(testX, y)) {
        hi = mid;
      } else {
        safeX = testX;
        lo = mid;
      }
    }
    // If strict collision blocked movement on a slope-like surface, try short incremental
    // traversal with ground snapping so tiny alpha-mask seams do not hard-stop movement.
    if (allowStepUp && Math.abs(nextX - currentX) > EPS) {
      const distance = nextX - currentX;
      const stepPx = Math.max(1, Math.min(8, Math.round(width * 0.08)));
      const samples = Math.max(1, Math.ceil(Math.abs(distance) / stepPx));
      let walkX = currentX;
      let walkY = y;
      let advanced = false;
      let fullyReached = false;
      const upLimit = Math.max(2, stepHeight);
      const downLimit = Math.max(6, stepHeight + 10);
      for (let i = 1; i <= samples; i += 1) {
        const ratio = i / samples;
        const testX = currentX + distance * ratio;
        const snappedY = findGroundSnapTopY(
          testX,
          walkY,
          width,
          height,
          obstacles,
          {
            maxUp: upLimit,
            maxDown: downLimit,
            direction: distance,
            sampleSpacing,
            maxGroundAngle: options.maxGroundAngle
          }
        );
        if (
          snappedY != null &&
          !collidesHorizontalAt(testX, snappedY)
        ) {
          walkX = testX;
          walkY = snappedY;
          advanced = true;
          fullyReached = i === samples;
          continue;
        }
        if (!collidesHorizontalAt(testX, walkY)) {
          walkX = testX;
          advanced = true;
          fullyReached = i === samples;
          continue;
        }
        break;
      }
      if (advanced) {
        return { x: walkX, y: walkY, blocked: !fullyReached, stepped: true };
      }
    }
    return { x: safeX, y, blocked: true, stepped: false };
  };

  const resolveVertical = (playerState, nextY, metrics, obstacles, options = {}) => {
    const width = metrics.width;
    const height = metrics.height;
    const x = playerState.x;
    const currentY = playerState.y;
    if (Math.abs(playerState.vy) < EPS || Math.abs(nextY - currentY) < EPS) {
      return { y: nextY, landed: false, hitCeiling: false };
    }
    if (!collidesAt(x, nextY, width, height, obstacles, options.playerHitboxPolygon)) {
      return { y: nextY, landed: false, hitCeiling: false };
    }

    const descending = playerState.vy > EPS;
    let safeY = currentY;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i += 1) {
      const mid = (lo + hi) / 2;
      const testY = currentY + (nextY - currentY) * mid;
      if (collidesAt(x, testY, width, height, obstacles, options.playerHitboxPolygon)) {
        hi = mid;
      } else {
        safeY = testY;
        lo = mid;
      }
    }

    return {
      y: safeY,
      landed: descending,
      hitCeiling: !descending
    };
  };

  const clampPlayerToMapBounds = (playerState, metrics, map) => {
    if (!map || typeof map !== 'object') return;
    const mapWidth = Number(map.width);
    const mapHeight = Number(map.height);
    if (!Number.isFinite(mapWidth) || !Number.isFinite(mapHeight)) return;
    const maxX = Math.max(0, mapWidth - metrics.width);
    const maxY = Math.max(0, mapHeight - metrics.height);

    if (playerState.x < 0) {
      playerState.x = 0;
      if (playerState.vx < 0) playerState.vx = 0;
    } else if (playerState.x > maxX) {
      playerState.x = maxX;
      if (playerState.vx > 0) playerState.vx = 0;
    }

    if (playerState.y < 0) {
      playerState.y = 0;
      if (playerState.vy < 0) playerState.vy = 0;
      playerState.jumping = false;
    } else if (playerState.y > maxY) {
      playerState.y = maxY;
      if (playerState.vy > 0) playerState.vy = 0;
      playerState.onGround = true;
      playerState.jumpsUsed = 0;
      playerState.jumpedFromGround = false;
      playerState.jumping = false;
      playerState.coyoteTimer = COYOTE_TIME_SEC;
    }
  };

  const stepPlayerState = ({
    playerState,
    dt,
    moveSpeed,
    physics,
    metrics,
    playerHitboxPolygon,
    map,
    objects,
    obstacles,
    worldPointToLocal: _worldPointToLocal,
    localPointToWorld,
    resolveHorizontalFn,
    resolveVerticalFn
  }) => {
    const normalizedPlayerHitboxPolygon = normalizePlayerHitboxPolygon(playerHitboxPolygon);
    const obstacleContext = (
      obstacles && (Array.isArray(obstacles) || Array.isArray(obstacles?.list))
    )
      ? obstacles
      : collectObstacleBounds({ objects, localPointToWorld });
    const jumpSpeed = physics.jumpSpeed;
    const jumpHeight = physics.jumpHeight;
    const fallSpeed = physics.fallSpeed;
    // Sliding/inertia are disabled by design for deterministic controls.
    const walkableSlopeMaxAngle = normalizeWalkableSlopeMaxAngle(physics?.walkableSlopeMaxAngle);
    const slopeFallStartAngle = normalizeSlopeFallStartAngle(
      physics?.slopeFallStartAngle,
      walkableSlopeMaxAngle
    );
    const supportMaxGroundAngle = slopeFallStartAngle;
    const groundSampleSpacing = normalizeGroundSampleSpacing(physics?.groundSampleSpacing);
    const flatZones = normalizeFlatZonesForPhysics(physics?.flatZones, map);
    // Small stair auto-step for tiny hitbox seams so walking stays smooth.
    const autoStepHeight = Math.max(5, Math.min(26, Math.round(metrics.height * 0.16)));
    const baseGroundMaxUp = Math.max(4, autoStepHeight + 2);
    const baseGroundMaxDown = Math.max(10, autoStepHeight + 8);

    const inputDir = (playerState.input.right ? 1 : 0) - (playerState.input.left ? 1 : 0);
    const hasInput = Math.abs(inputDir) > EPS;
    if (hasInput) {
      playerState.vx = inputDir * moveSpeed;
    }
    // Facing follows player intent (input), not external drift/slide velocity.
    if (inputDir < -0.001) {
      playerState.facing = -1;
    } else if (inputDir > 0.001) {
      playerState.facing = 1;
    } else if (!Number.isFinite(playerState.facing) || playerState.facing === 0) {
      playerState.facing = 1;
    }

    let supportY = null;
    let groundedBeforeStep = false;
    const shouldProbeGroundAtStart = !playerState.jumping && playerState.vy >= -EPS;
    if (shouldProbeGroundAtStart) {
      supportY = detectGroundSupport(playerState, metrics, obstacleContext, {
        maxUp: baseGroundMaxUp,
        maxDown: baseGroundMaxDown,
        direction: inputDir || playerState.vx,
        sampleSpacing: groundSampleSpacing,
        playerHitboxPolygon: normalizedPlayerHitboxPolygon,
        maxGroundAngle: supportMaxGroundAngle
      });
      groundedBeforeStep = supportY !== null;
      if (!groundedBeforeStep) {
        supportY = detectGroundSupport(playerState, metrics, obstacleContext, {
          maxUp: Math.max(baseGroundMaxUp + 6, autoStepHeight * 2),
          maxDown: Math.max(baseGroundMaxDown + 6, autoStepHeight * 2 + 8),
          direction: inputDir || playerState.vx,
          sampleSpacing: groundSampleSpacing,
          playerHitboxPolygon: normalizedPlayerHitboxPolygon,
          maxGroundAngle: supportMaxGroundAngle
        });
        groundedBeforeStep = supportY !== null;
      }
    }
    if (groundedBeforeStep) {
      playerState.onGround = true;
      playerState.vy = 0;
      playerState.y = supportY - metrics.height;
      playerState.jumpsUsed = 0;
      playerState.jumpedFromGround = false;
      playerState.jumping = false;
      playerState.coyoteTimer = COYOTE_TIME_SEC;
    } else {
      playerState.onGround = false;
      playerState.coyoteTimer = Math.max(0, (Number(playerState.coyoteTimer) || 0) - dt);
    }

    let slope = null;
    let slopeAngleDeg = 0;
    let forcedSlopeFall = false;
    const canEvaluateSlope = playerState.onGround || groundedBeforeStep;
    const inFlatZone = canEvaluateSlope && isPlayerFootInFlatZone(playerState, metrics, flatZones);
    if (canEvaluateSlope && !inFlatZone) {
      slope = estimateGroundSlope({
        x: playerState.x,
        y: playerState.y,
        width: metrics.width,
        height: metrics.height,
        obstacles: obstacleContext,
        sampleSpacing: groundSampleSpacing,
        playerHitboxPolygon: normalizedPlayerHitboxPolygon,
        maxGroundAngle: supportMaxGroundAngle
      });
      if (slope != null) {
        slopeAngleDeg = Math.atan(Math.abs(slope)) * (180 / Math.PI);
      }
    }
    if (
      canEvaluateSlope &&
      !inFlatZone &&
      slope != null &&
      slopeAngleDeg > slopeFallStartAngle + EPS
    ) {
      groundedBeforeStep = false;
      playerState.onGround = false;
      playerState.jumping = false;
      playerState.coyoteTimer = 0;
      forcedSlopeFall = true;
    }

    if ((playerState.onGround || groundedBeforeStep) && hasInput) {
      if (!inFlatZone && slope != null && slopeAngleDeg > walkableSlopeMaxAngle + EPS) {
        // Too steep to walk: block horizontal movement.
        playerState.vx = 0;
      } else {
        playerState.vx = inputDir * moveSpeed;
      }
    }

    if (!hasInput) {
      // No inertia mode: release key => immediate stop.
      playerState.vx = 0;
    }

    // Keep player intent authoritative while input is active.
    if (hasInput) {
      const desiredSign = inputDir > 0 ? 1 : -1;
      if (playerState.vx * desiredSign <= EPS) {
        const minControlSpeed = moveSpeed * 0.08;
        playerState.vx = desiredSign * minControlSpeed;
      }
    }

    const jumpPressed = playerState.input.jumpQueued;
    playerState.input.jumpQueued = false;
    if (
      jumpPressed &&
      !groundedBeforeStep &&
      !playerState.jumping &&
      !playerState.jumpedFromGround &&
      (playerState.jumpsUsed || 0) === 0 &&
      playerState.vy >= -EPS
    ) {
      const jumpSupportY = detectGroundSupport(playerState, metrics, obstacleContext, {
        maxUp: Math.max(baseGroundMaxUp + 8, autoStepHeight * 2),
        maxDown: Math.max(baseGroundMaxDown + 8, autoStepHeight * 2 + 12),
        direction: inputDir || playerState.facing,
        sampleSpacing: groundSampleSpacing,
        playerHitboxPolygon: normalizedPlayerHitboxPolygon,
        maxGroundAngle: supportMaxGroundAngle
      });
      if (jumpSupportY !== null) {
        groundedBeforeStep = true;
        playerState.onGround = true;
        playerState.y = jumpSupportY - metrics.height;
        playerState.vy = 0;
      }
    }
    const coyoteJumpAllowed = (Number(playerState.coyoteTimer) || 0) > EPS;
    if (jumpPressed) {
      if (playerState.onGround || groundedBeforeStep || coyoteJumpAllowed) {
        playerState.vy = -jumpSpeed;
        playerState.jumpTargetY = playerState.y - jumpHeight;
        playerState.jumpsUsed = 1;
        playerState.jumpedFromGround = true;
        playerState.jumping = true;
        playerState.coyoteTimer = 0;
      } else if (playerState.jumpedFromGround && playerState.jumpsUsed === 1) {
        playerState.vy = -jumpSpeed;
        playerState.jumpTargetY = playerState.y - jumpHeight;
        playerState.jumpsUsed = 2;
        playerState.jumping = true;
      }
    }

    if (playerState.jumping) {
      playerState.vy = -jumpSpeed;
    } else if (!playerState.onGround) {
      playerState.vy = fallSpeed;
    } else {
      playerState.vy = 0;
    }

    const nextX = playerState.x + playerState.vx * dt;
    const canUseGroundAssist =
      !playerState.jumping &&
      playerState.vy >= -EPS &&
      (
        playerState.onGround ||
        groundedBeforeStep ||
        (Number(playerState.coyoteTimer) || 0) > EPS
      );
    const resolveHorizontalImpl = typeof resolveHorizontalFn === 'function'
      ? resolveHorizontalFn
      : resolveHorizontal;
    const horizontal = resolveHorizontalImpl(playerState, nextX, metrics, obstacleContext, {
      allowStepUp: canUseGroundAssist,
      stepHeight: autoStepHeight,
      sampleSpacing: groundSampleSpacing,
      playerHitboxPolygon: normalizedPlayerHitboxPolygon,
      maxGroundAngle: supportMaxGroundAngle
    });
    playerState.x = horizontal.x;
    if (horizontal.stepped) {
      playerState.y = horizontal.y;
      playerState.onGround = true;
      playerState.vy = 0;
    } else if (!horizontal.blocked && canUseGroundAssist) {
      const slopeFollowTop = findGroundSnapTopY(
        playerState.x,
        playerState.y,
        metrics.width,
        metrics.height,
        obstacleContext,
        {
          maxUp: autoStepHeight,
          maxDown: autoStepHeight,
          direction: playerState.vx,
          sampleSpacing: groundSampleSpacing,
          playerHitboxPolygon: normalizedPlayerHitboxPolygon,
          maxGroundAngle: supportMaxGroundAngle
        }
      );
      if (slopeFollowTop != null) {
        playerState.y = slopeFollowTop;
        playerState.onGround = true;
        playerState.vy = 0;
      }
    }
    if (horizontal.blocked) {
      playerState.vx = 0;
    }

    let nextY = playerState.y + playerState.vy * dt;
    if (playerState.jumping && nextY <= playerState.jumpTargetY) {
      nextY = playerState.jumpTargetY;
      playerState.jumping = false;
    }

    const resolveVerticalImpl = typeof resolveVerticalFn === 'function'
      ? resolveVerticalFn
      : resolveVertical;
    const vertical = resolveVerticalImpl(playerState, nextY, metrics, obstacleContext, {
      playerHitboxPolygon: normalizedPlayerHitboxPolygon
    });
    playerState.y = vertical.y;

    if (vertical.hitCeiling) {
      playerState.jumping = false;
      playerState.vy = 0;
    }

    let grounded = vertical.landed;
    if (vertical.landed) {
      playerState.jumpsUsed = 0;
      playerState.jumpedFromGround = false;
      playerState.jumping = false;
      playerState.vy = 0;
      playerState.coyoteTimer = COYOTE_TIME_SEC;
    } else if (!forcedSlopeFall && !playerState.jumping && playerState.vy >= -EPS) {
      const supportedY = detectGroundSupport(
        playerState,
        metrics,
        obstacleContext,
        {
          maxUp: autoStepHeight,
          maxDown: autoStepHeight + 6,
          direction: playerState.vx,
          sampleSpacing: groundSampleSpacing,
          playerHitboxPolygon: normalizedPlayerHitboxPolygon,
          maxGroundAngle: supportMaxGroundAngle
        }
      );
      if (supportedY !== null) {
        playerState.y = supportedY - metrics.height;
        grounded = true;
        playerState.jumpsUsed = 0;
        playerState.jumpedFromGround = false;
        playerState.jumping = false;
        playerState.vy = 0;
        playerState.coyoteTimer = COYOTE_TIME_SEC;
      }
    }
    playerState.onGround = grounded;
    clampPlayerToMapBounds(playerState, metrics, map);
  };

  const computeCameraPosition = ({ playerState, viewRect, map, yBias }) => {
    const targetX = playerState.x - viewRect.width / 2;
    const targetY = playerState.y - viewRect.height * (1 - yBias);
    const clampedX = Math.max(0, Math.min(map.width - viewRect.width, targetX));
    const clampedY = Math.max(0, Math.min(map.height - viewRect.height, targetY));
    return { x: clampedX, y: clampedY };
  };

  window.JumpmapTestPhysicsUtils = {
    createPlayerState,
    getSpawnPosition,
    collectObstacleBounds,
    detectGroundSupport,
    resolveHorizontal,
    resolveVertical,
    clampPlayerToMapBounds,
    normalizeFlatZonesForPhysics,
    isPlayerFootInFlatZone,
    estimateGroundSlope,
    stepPlayerState,
    computeCameraPosition
  };
})();
