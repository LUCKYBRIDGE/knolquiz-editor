(function initJumpmapGeometryUtils() {
  const worldToLocal = (dx, dy, obj) => {
    const scaleX = obj.flipH ? -obj.scale : obj.scale;
    const scaleY = obj.flipV ? -obj.scale : obj.scale;
    const angle = (-obj.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return {
      x: rx / scaleX,
      y: ry / scaleY
    };
  };

  const worldPointToLocal = (x, y, obj) => {
    const dx = x - obj.x;
    const dy = y - obj.y;
    return worldToLocal(dx, dy, obj);
  };

  const localPointToWorld = (x, y, obj) => {
    const scaleX = obj.flipH ? -obj.scale : obj.scale;
    const scaleY = obj.flipV ? -obj.scale : obj.scale;
    const sx = x * scaleX;
    const sy = y * scaleY;
    const angle = (obj.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = sx * cos - sy * sin;
    const ry = sx * sin + sy * cos;
    return {
      x: obj.x + rx,
      y: obj.y + ry
    };
  };

  const worldToLocalScaled = (x, y, obj) => {
    const dx = x - obj.x;
    const dy = y - obj.y;
    const angle = (-obj.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let rx = dx * cos - dy * sin;
    let ry = dx * sin + dy * cos;
    if (obj.flipH) rx = -rx;
    if (obj.flipV) ry = -ry;
    return { x: rx, y: ry };
  };

  const computeRotatedBounds = (obj, renderWidth, renderHeight) => {
    const scaleX = obj.flipH ? -obj.scale : obj.scale;
    const scaleY = obj.flipV ? -obj.scale : obj.scale;
    const angle = (obj.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Use signed scale for corner projection so bounds match flipH/flipV visuals.
    const corners = [
      { x: 0, y: 0 },
      { x: renderWidth, y: 0 },
      { x: renderWidth, y: renderHeight },
      { x: 0, y: renderHeight }
    ];
    const pts = corners.map((corner) => {
      const sx = corner.x * scaleX;
      const sy = corner.y * scaleY;
      return {
        x: obj.x + sx * cos - sy * sin,
        y: obj.y + sx * sin + sy * cos
      };
    });
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      x1: Math.min(...xs),
      y1: Math.min(...ys),
      x2: Math.max(...xs),
      y2: Math.max(...ys)
    };
  };

  window.JumpmapGeometryUtils = {
    worldToLocal,
    worldPointToLocal,
    localPointToWorld,
    worldToLocalScaled,
    computeRotatedBounds
  };
})();
