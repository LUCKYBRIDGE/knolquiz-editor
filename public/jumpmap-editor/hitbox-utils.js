(function initJumpmapHitboxUtils() {
  // Pure hitbox utilities for editor/test usage.
  // Scoped in IIFE to avoid leaking global identifiers.

  const normalizePolygonPoints = (points = []) => {
    if (!Array.isArray(points)) return null;
    const normalized = points
      .map((point) => ({
        x: Number(point?.x),
        y: Number(point?.y)
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({
        x: Math.round(point.x * 1000) / 1000,
        y: Math.round(point.y * 1000) / 1000
      }));
    if (normalized.length < 3) return null;
    return normalized;
  };

  const normalizePolygonEdgeSlip = (edgeSlip, pointCount) => {
    const count = Math.max(0, Number(pointCount) || 0);
    if (count < 3) return null;
    if (!Array.isArray(edgeSlip)) return null;
    const normalized = [];
    for (let i = 0; i < count; i += 1) {
      // default is "true" (edge can slide)
      normalized.push(edgeSlip[i] !== false);
    }
    return normalized;
  };

  const cloneHitboxes = (hitboxes = []) =>
    hitboxes.map((hb) => {
      const rotation = (() => {
        let deg = Math.round(Number(hb.rotation) || 0);
        deg %= 360;
        if (deg < 0) deg += 360;
        return deg;
      })();
      const next = {
        x: Number(hb.x) || 0,
        y: Number(hb.y) || 0,
        w: Math.max(1, Number(hb.w) || 1),
        h: Math.max(1, Number(hb.h) || 1),
        rotation,
        locked: !!hb.locked,
        ...(hb.groupId ? { groupId: hb.groupId } : {})
      };
      if (hb?.type === 'polygon') {
        const points = normalizePolygonPoints(hb.points);
        if (points) {
          next.type = 'polygon';
          next.points = points;
          const edgeSlip = normalizePolygonEdgeSlip(hb.edgeSlip, points.length);
          if (edgeSlip) next.edgeSlip = edgeSlip;
        }
      }
      return next;
    });

  const areHitboxesTouching = (a, b, eps = 0.5) => {
    const ax2 = a.x + a.w;
    const ay2 = a.y + a.h;
    const bx2 = b.x + b.w;
    const by2 = b.y + b.h;
    if (ax2 < b.x - eps) return false;
    if (bx2 < a.x - eps) return false;
    if (ay2 < b.y - eps) return false;
    if (by2 < a.y - eps) return false;
    return true;
  };

  const createHitboxGroupId = () =>
    `hb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const groupTouchingHitboxes = (hitboxes) => {
    const list = hitboxes.map((hb) => ({ ...hb }));
    const visited = new Array(list.length).fill(false);
    let changed = false;

    for (let i = 0; i < list.length; i += 1) {
      if (visited[i]) continue;
      const stack = [i];
      const group = [];
      visited[i] = true;
      while (stack.length) {
        const current = stack.pop();
        group.push(current);
        for (let j = 0; j < list.length; j += 1) {
          if (visited[j]) continue;
          if (areHitboxesTouching(list[current], list[j])) {
            visited[j] = true;
            stack.push(j);
          }
        }
      }

      if (group.length > 1) {
        const groupId = createHitboxGroupId();
        group.forEach((idx) => {
          if (list[idx].groupId !== groupId) changed = true;
          list[idx].groupId = groupId;
        });
      } else {
        const idx = group[0];
        if (list[idx].groupId) changed = true;
        delete list[idx].groupId;
      }
    }

    return { list, changed };
  };

  window.JumpmapHitboxUtils = {
    cloneHitboxes,
    normalizePolygonPoints,
    normalizePolygonEdgeSlip,
    areHitboxesTouching,
    createHitboxGroupId,
    groupTouchingHitboxes
  };
})();
