const plateBase = '../quiz_plate/';
const sejongBase = '../quiz_sejong/';
const textureBase = './textures/';
const DEFAULT_GEUMGANG_BACKGROUND = '../quiz_background/Geumgangjeondo.jpg';
const LAUNCHER_SETUP_STORAGE_KEY = 'jumpmap.launcher.setup.v1';
const LAUNCH_RUNTIME_MAP_URLS = [
  '../shared/maps/jumpmap-01.json',
  '/__jumpmap/runtime-map.json'
];
const TEXTURE_OBJECT_PREFIX = '__texture__:';
const TEXTURE_OBJECT_DEFAULT = { w: 320, h: 120 };
const DEFAULT_SOLID_TEXTURE_COLOR = '#c3b18b';
const OBJECT_SCALE_MIN = 0.05;
const OBJECT_SCALE_MAX = 10;
const MIN_SLOPE_FACTOR = 0.2;
const MAX_SLOPE_FACTOR = 2.0;
const MIN_SLOPE_PROFILE_ROWS = 1;
const MAX_SLOPE_PROFILE_ROWS = 24;
const DEFAULT_WALKABLE_SLOPE_MAX_ANGLE = 75;
const DEFAULT_SLOPE_FALL_START_ANGLE = 75;
const DEFAULT_FLAT_INERTIA_PERCENT = 88;
const DEFAULT_ICE_INERTIA_PERCENT = 96;
const DEFAULT_ICE_CONTROL_PERCENT = 72;
const MAX_FLAT_ZONES = 128;
const DEFAULT_SLOPE_SPEED_PROFILE = [
  { minAngle: 0, maxAngle: 15, up: 1.0, down: 1.0 },
  { minAngle: 16, maxAngle: 30, up: 1.0, down: 1.0 },
  { minAngle: 31, maxAngle: 45, up: 1.0, down: 1.0 },
  { minAngle: 46, maxAngle: 60, up: 0.88, down: 1.12 },
  { minAngle: 61, maxAngle: 75, up: 0.72, down: 1.32 },
  { minAngle: 76, maxAngle: 90, up: 0.5, down: 1.62 }
];
const TEXTURE_OBJECT_TYPES = [
  'hanji',
  'stone',
  'ice',
  'solid'
];
const LEGACY_TEXTURE_TYPE_ALIAS = {
  'paper-fiber': 'hanji',
  'paper-speckle': 'hanji',
  parchment: 'hanji',
  'hanji-warm': 'hanji',
  'hanji-cool': 'hanji',
  'linen-weave': 'hanji',
  'ink-wash': 'hanji',
  'stone-grain': 'stone',
  'stone-block': 'stone',
  'plate-stone2': 'stone',
  'ice-frost': 'ice',
  'ice-crack': 'ice',
  'plate-ice': 'ice'
};

const normalizeTextureType = (name) => {
  if (!name || typeof name !== 'string') return 'hanji';
  if (TEXTURE_OBJECT_TYPES.includes(name)) return name;
  return LEGACY_TEXTURE_TYPE_ALIAS[name] || 'hanji';
};

const normalizeBackgroundImagePath = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  // Older saves (and some manual edits) stored root-absolute asset paths.
  // Convert them to editor-relative paths so they work on local and GitHub Pages.
  if (trimmed.startsWith('/quiz_background/')) return `..${trimmed}`;
  if (trimmed.startsWith('/quiz_plate/')) return `..${trimmed}`;
  if (trimmed.startsWith('/quiz_sejong/')) return `..${trimmed}`;
  if (trimmed.startsWith('quiz_background/')) return `../${trimmed}`;
  if (trimmed.startsWith('quiz_plate/')) return `../${trimmed}`;
  if (trimmed.startsWith('quiz_sejong/')) return `../${trimmed}`;
  return trimmed;
};

const resolveTextureUrl = (name) => {
  const type = normalizeTextureType(name);
  if (type === 'hanji') return `${textureBase}hanji.svg`;
  if (type === 'stone') return `${plateBase}plate_stone2.png`;
  if (type === 'ice') return `${plateBase}plate_ice.png`;
  return '';
};

const SPRITES = {
  idle: 'sejong_rightside.png',
  walk: ['sejong_walk1.png', 'sejong_walk2.png', 'sejong_walk3.png', 'sejong_walk4.png'],
  jump: 'sejong_jump.png',
  fall: 'sejong_fall.png',
  hurt: 'sejong_damaged.png'
};

const isTextureSprite = (sprite) =>
  typeof sprite === 'string' && sprite.startsWith(TEXTURE_OBJECT_PREFIX);

const getTextureTypeFromSprite = (sprite) => {
  if (!isTextureSprite(sprite)) return null;
  const raw = sprite.slice(TEXTURE_OBJECT_PREFIX.length);
  return normalizeTextureType(raw);
};

const makeTextureSprite = (textureType) =>
  `${TEXTURE_OBJECT_PREFIX}${normalizeTextureType(textureType)}`;

const getSpriteSourcePath = (sprite) =>
  isTextureSprite(sprite)
    ? resolveTextureUrl(getTextureTypeFromSprite(sprite))
    : `${plateBase}${sprite}`;

const getSpriteMetaSize = (sprite, fallback = null) => {
  if (isTextureSprite(sprite)) return { ...TEXTURE_OBJECT_DEFAULT };
  const meta = spriteMeta[sprite];
  if (meta && Number.isFinite(meta.w) && Number.isFinite(meta.h)) return { w: meta.w, h: meta.h };
  return fallback ? { ...fallback } : null;
};

const hasReliableSpriteBounds = (sprite) => {
  if (isTextureSprite(sprite)) return true;
  const meta = spriteMeta[sprite];
  return !!(meta && Number.isFinite(meta.w) && Number.isFinite(meta.h) && meta.w > 0 && meta.h > 0);
};

const getSpriteDisplayLabel = (sprite) => {
  if (isTextureSprite(sprite)) return `texture_${getTextureTypeFromSprite(sprite) || 'hanji'}`;
  return String(sprite || '').replace('.png', '');
};

const normalizeHexColor = (value, fallback = DEFAULT_SOLID_TEXTURE_COLOR) => {
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

const clampNumber = (value, min, max, fallback) => {
  const num = Number(value);
  const base = Number.isFinite(num) ? num : fallback;
  return Math.min(max, Math.max(min, base));
};

const cloneDefaultSlopeSpeedProfile = () =>
  DEFAULT_SLOPE_SPEED_PROFILE.map((entry) => ({ ...entry }));

const normalizeSlopeSpeedProfile = (profile = []) => {
  const fallback = cloneDefaultSlopeSpeedProfile();
  const sourceRaw = Array.isArray(profile) && profile.length ? profile : fallback;
  const source = sourceRaw
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
    Math.min(MAX_SLOPE_PROFILE_ROWS, source.length || fallback.length)
  );
  const normalized = [];
  let prevMaxAngle = -1;
  for (let i = 0; i < rowCount; i += 1) {
    const fallbackEntry = fallback[Math.min(i, fallback.length - 1)] || fallback[0];
    const raw = source[i] || fallbackEntry;
    const up = Math.max(
      MIN_SLOPE_FACTOR,
      Math.min(MAX_SLOPE_FACTOR, Number.isFinite(raw.up) ? raw.up : fallbackEntry.up)
    );
    const down = Math.max(
      MIN_SLOPE_FACTOR,
      Math.min(MAX_SLOPE_FACTOR, Number.isFinite(raw.down) ? raw.down : fallbackEntry.down)
    );
    const minAllowed = i === 0 ? 0 : prevMaxAngle + 1;
    const remainingRows = rowCount - i - 1;
    const maxAllowed = Math.max(minAllowed, 90 - remainingRows);
    let minAngle = Number.isFinite(raw.minAngle) ? Math.round(raw.minAngle) : minAllowed;
    minAngle = Math.max(minAllowed, Math.min(maxAllowed, minAngle));
    let maxAngle;
    if (i === rowCount - 1) {
      minAngle = Math.max(minAllowed, Math.min(90, minAngle));
      maxAngle = 90;
    } else {
      const desiredMax = Number.isFinite(raw.maxAngle) ? Math.round(raw.maxAngle) : minAngle;
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

const state = {
  map: { width: 2400, height: 12000 },
  grid: { size: 32, snap: true, visible: true },
  camera: { yBias: 0.46, smooth: 0.18 },
  background: { color: '#ffffff', image: '', texture: '', imageOpacity: 1 },
  playerHitbox: { width: 80, height: 120, footInset: 8 },
  playerHitboxOffset: { x: 0, y: 0 },
  playerHitboxPolygon: null,
  playerScale: 1,
  playerCrop: null,
  physics: {
    fallSpeed: 600,
    jumpSpeed: 1000,
    jumpHeight: 240,
    moveSpeed: 220,
    walkableSlopeMaxAngle: DEFAULT_WALKABLE_SLOPE_MAX_ANGLE,
    slopeFallStartAngle: DEFAULT_SLOPE_FALL_START_ANGLE,
    slopeSlideEnabled: false,
    flatInertiaEnabled: false,
    flatInertiaPercent: DEFAULT_FLAT_INERTIA_PERCENT,
    iceSurfaceEnabled: false,
    iceInertiaPercent: DEFAULT_ICE_INERTIA_PERCENT,
    iceControlPercent: DEFAULT_ICE_CONTROL_PERCENT,
    slopeSpeedProfile: cloneDefaultSlopeSpeedProfile(),
    flatZones: []
  },
  startPoint: null,
  savePoints: [],
  selectedSpecial: null,
  selectedIds: [],
  selectionAction: { object: 'move', hitbox: 'move', player: 'move' },
  selectionTarget: 'object',
  selectedHitboxIndex: null,
  selectedHitboxIndices: [],
  playerLocked: false,
  playerHitboxPointTool: { active: false, points: [] },
  showHitboxes: false,
  boxGuidesVisible: true,
  boxGuidesEditable: true,
  editorOptions: {
    autoBasePlatform: true,
    autoScrollStart: true,
    autoSelectAfterPlace: true
  },
  playerProfile: null,
  spriteProfiles: {},
  objectGroupPresets: {},
  hitboxPresets: {},
  spriteDefaults: {},
  objects: [],
  selectedId: null,
  mode: 'select',
  flatZoneEdit: false,
  test: { active: false, players: 1, showDebugHitbox: false },
  history: []
};

const els = {
  world: document.getElementById('world'),
  viewport: document.getElementById('stage-viewport'),
  paletteGrid: document.getElementById('palette-grid'),
  paletteSearch: document.getElementById('palette-search'),
  paletteRefresh: document.getElementById('palette-refresh'),
  textureObjectType: document.getElementById('texture-object-type'),
  textureObjectColor: document.getElementById('texture-object-color'),
  textureObjectAdd: document.getElementById('texture-object-add'),
  palettePresets: document.getElementById('palette-presets'),
  paletteGroupPresets: document.getElementById('palette-group-presets'),
  presetClearAll: document.getElementById('preset-clear-all'),
  groupPresetClearAll: document.getElementById('group-preset-clear-all'),
  mapWidth: document.getElementById('map-width'),
  mapHeight: document.getElementById('map-height'),
  applyMap: document.getElementById('apply-map-size'),
  expandWidth: document.getElementById('expand-width'),
  expandHeight: document.getElementById('expand-height'),
  expandTop: document.getElementById('expand-top'),
  gridVisible: document.getElementById('grid-visible'),
  gridSnap: document.getElementById('grid-snap'),
  gridSize: document.getElementById('grid-size'),
  modeSelect: document.getElementById('mode-select'),
  modePlace: document.getElementById('mode-place'),
  modeStart: document.getElementById('mode-start'),
  palettePanel: document.getElementById('palette-panel'),
  propPanel: document.getElementById('prop-panel'),
  editorLayout: document.querySelector('.editor-layout'),
  noSelection: document.getElementById('no-selection'),
  selectionActions: document.getElementById('selection-actions'),
  actionSelect: document.getElementById('action-select'),
  actionMove: document.getElementById('action-move'),
  actionResize: document.getElementById('action-resize'),
  actionRotate: document.getElementById('action-rotate'),
  actionCrop: document.getElementById('action-crop'),
  actionLock: document.getElementById('action-lock'),
  boxViewToggle: document.getElementById('box-view-toggle'),
  boxEditToggle: document.getElementById('box-edit-toggle'),
  targetObject: document.getElementById('target-object'),
  targetHitbox: document.getElementById('target-hitbox'),
  orderSendBack: document.getElementById('order-send-back'),
  orderBackward: document.getElementById('order-backward'),
  orderForward: document.getElementById('order-forward'),
  orderBringFront: document.getElementById('order-bring-front'),
  groupObjects: document.getElementById('group-objects'),
  ungroupObjects: document.getElementById('ungroup-objects'),
  groupPresetName: document.getElementById('group-preset-name'),
  saveGroupPreset: document.getElementById('save-group-preset'),
  quickOpenObjectWorkbench: document.getElementById('quick-open-object-workbench'),
  quickSaveHitboxPreset: document.getElementById('quick-save-hitbox-preset'),
  quickApplyHitboxPreset: document.getElementById('quick-apply-hitbox-preset'),
  propFields: document.getElementById('prop-fields'),
  propTextureField: document.getElementById('prop-texture-field'),
  propTextureType: document.getElementById('prop-texture-type'),
  propTextureColorRow: document.getElementById('prop-texture-color-row'),
  propTextureColor: document.getElementById('prop-texture-color'),
  playerFields: document.getElementById('player-fields'),
  playerSprite: document.getElementById('player-sprite'),
  savePlayerProfile: document.getElementById('save-player-profile'),
  applyPlayerProfile: document.getElementById('apply-player-profile'),
  clearPlayerProfile: document.getElementById('clear-player-profile'),
  playerProfileStatus: document.getElementById('player-profile-status'),
  playerCropEnabled: document.getElementById('player-crop-enabled'),
  playerCropFields: document.getElementById('player-crop-fields'),
  playerCropX: document.getElementById('player-crop-x'),
  playerCropY: document.getElementById('player-crop-y'),
  playerCropW: document.getElementById('player-crop-w'),
  playerCropH: document.getElementById('player-crop-h'),
  playerCropReset: document.getElementById('player-crop-reset'),
  propSprite: document.getElementById('prop-sprite'),
  cropEnabled: document.getElementById('crop-enabled'),
  cropFields: document.getElementById('crop-fields'),
  cropX: document.getElementById('crop-x'),
  cropY: document.getElementById('crop-y'),
  cropW: document.getElementById('crop-w'),
  cropH: document.getElementById('crop-h'),
  cropReset: document.getElementById('crop-reset'),
  propX: document.getElementById('prop-x'),
  propY: document.getElementById('prop-y'),
  propScale: document.getElementById('prop-scale'),
  saveDefaultScale: document.getElementById('save-default-scale'),
  propRotation: document.getElementById('prop-rotation'),
  propRotationRange: document.getElementById('prop-rotation-range'),
  propFlipH: document.getElementById('prop-flip-h'),
  propFlipV: document.getElementById('prop-flip-v'),
  hitboxList: document.getElementById('hitbox-list'),
  addHitbox: document.getElementById('add-hitbox'),
  clearAllHitboxes: document.getElementById('clear-all-hitboxes'),
  mergeHitboxes: document.getElementById('merge-hitboxes'),
  groupHitboxes: document.getElementById('group-hitboxes'),
  ungroupHitboxes: document.getElementById('ungroup-hitboxes'),
  lockHitboxGroup: document.getElementById('lock-hitbox-group'),
  hitboxToggle: document.getElementById('hitbox-toggle'),
  hitboxControls: document.getElementById('hitbox-controls'),
  saveHitboxPreset: document.getElementById('save-hitbox-preset'),
  applyHitboxPreset: document.getElementById('apply-hitbox-preset'),
  autoAlphaHitbox: document.getElementById('auto-alpha-hitbox'),
  autoAlphaStatus: document.getElementById('auto-alpha-status'),
  openObjectWorkbench: document.getElementById('open-object-workbench'),
  workbenchPanel: document.getElementById('workbench-panel'),
  workbenchOverlay: document.getElementById('workbench-overlay'),
  workbenchTitle: document.getElementById('workbench-title'),
  workbenchClose: document.getElementById('workbench-close'),
  workbenchCanvasWrap: document.getElementById('workbench-canvas-wrap'),
  workbenchRulerCorner: document.getElementById('workbench-ruler-corner'),
  workbenchRulerHorizontal: document.getElementById('workbench-ruler-horizontal'),
  workbenchRulerVertical: document.getElementById('workbench-ruler-vertical'),
  workbenchFocusToggle: document.getElementById('workbench-focus-toggle'),
  workbenchFit: document.getElementById('workbench-fit'),
  workbenchFitFocus: document.getElementById('workbench-fit-focus'),
  workbenchFitObject: document.getElementById('workbench-fit-object'),
  workbenchZoomOut: document.getElementById('workbench-zoom-out'),
  workbenchZoom: document.getElementById('workbench-zoom'),
  workbenchZoomLabel: document.getElementById('workbench-zoom-label'),
  workbenchZoomIn: document.getElementById('workbench-zoom-in'),
  workbenchClearHitboxes: document.getElementById('workbench-clear-hitboxes'),
  workbenchUndo: document.getElementById('workbench-undo'),
  workbenchRedo: document.getElementById('workbench-redo'),
  workbenchApply: document.getElementById('workbench-apply'),
  workbenchSave: document.getElementById('workbench-save'),
  workbenchCanvas: document.getElementById('workbench-canvas'),
  workbenchEmpty: document.getElementById('workbench-empty'),
  workbenchModeControls: document.getElementById('workbench-mode-controls'),
  wbTargetObject: document.getElementById('wb-target-object'),
  wbTargetHitbox: document.getElementById('wb-target-hitbox'),
  wbActionMove: document.getElementById('wb-action-move'),
  wbActionResize: document.getElementById('wb-action-resize'),
  wbActionCrop: document.getElementById('wb-action-crop'),
  wbHitboxCropScopeRow: document.getElementById('wb-hitbox-crop-scope-row'),
  wbHitboxCropAll: document.getElementById('wb-hitbox-crop-all'),
  wbHitboxCropSingle: document.getElementById('wb-hitbox-crop-single'),
  wbHitboxCropRegion: document.getElementById('wb-hitbox-crop-region'),
  wbHitboxCropRegionStepRow: document.getElementById('wb-hitbox-crop-region-step-row'),
  wbHitboxRegionStepRegion: document.getElementById('wb-hitbox-region-step-region'),
  wbHitboxRegionStepCrop: document.getElementById('wb-hitbox-region-step-crop'),
  wbHitboxCropRegionStepHint: document.getElementById('wb-hitbox-crop-region-step-hint'),
  workbenchGuideControls: document.getElementById('workbench-guide-controls'),
  wbGuideToolNone: document.getElementById('wb-guide-tool-none'),
  wbGuideToolHorizontal: document.getElementById('wb-guide-tool-horizontal'),
  wbGuideToolVertical: document.getElementById('wb-guide-tool-vertical'),
  wbGuideDeleteHorizontal: document.getElementById('wb-guide-delete-horizontal'),
  wbGuideDeleteVertical: document.getElementById('wb-guide-delete-vertical'),
  wbGuideSnap: document.getElementById('wb-guide-snap'),
  wbGuideClear: document.getElementById('wb-guide-clear'),
  workbenchCropControls: document.getElementById('workbench-crop-controls'),
  workbenchHitboxControls: document.getElementById('workbench-hitbox-controls'),
  wbCropX: document.getElementById('wb-crop-x'),
  wbCropY: document.getElementById('wb-crop-y'),
  wbCropW: document.getElementById('wb-crop-w'),
  wbCropH: document.getElementById('wb-crop-h'),
  wbCropNudgeLeft: document.getElementById('wb-crop-nudge-left'),
  wbCropNudgeRight: document.getElementById('wb-crop-nudge-right'),
  wbCropNudgeUp: document.getElementById('wb-crop-nudge-up'),
  wbCropNudgeDown: document.getElementById('wb-crop-nudge-down'),
  wbHitboxIndex: document.getElementById('wb-hitbox-index'),
  wbHitboxX: document.getElementById('wb-hitbox-x'),
  wbHitboxY: document.getElementById('wb-hitbox-y'),
  wbHitboxW: document.getElementById('wb-hitbox-w'),
  wbHitboxH: document.getElementById('wb-hitbox-h'),
  wbHitboxRotation: document.getElementById('wb-hitbox-rotation'),
  wbHitboxLeft: document.getElementById('wb-hitbox-left'),
  wbHitboxRight: document.getElementById('wb-hitbox-right'),
  wbHitboxUp: document.getElementById('wb-hitbox-up'),
  wbHitboxDown: document.getElementById('wb-hitbox-down'),
  workbenchPaintControls: document.getElementById('workbench-paint-controls'),
  wbPaintToggle: document.getElementById('wb-paint-toggle'),
  wbPaintToolPoly: document.getElementById('wb-paint-tool-poly'),
  wbPaintToolParallelogram: document.getElementById('wb-paint-tool-parallelogram'),
  wbPaintPointUndo: document.getElementById('wb-paint-point-undo'),
  wbPaintPointClose: document.getElementById('wb-paint-point-close'),
  wbPaintPointClear: document.getElementById('wb-paint-point-clear'),
  wbPaintPointInsert: document.getElementById('wb-paint-point-insert'),
  wbPaintEdgeSlip: document.getElementById('wb-paint-edge-slip'),
  wbPaintStats: document.getElementById('wb-paint-stats'),
  duplicate: document.getElementById('duplicate'),
  delete: document.getElementById('delete'),
  saveMap: document.getElementById('save-map'),
  loadMap: document.getElementById('load-map'),
  resetMap: document.getElementById('reset-map'),
  localSlotSelect: document.getElementById('local-slot-select'),
  localSlotName: document.getElementById('local-slot-name'),
  slotRename: document.getElementById('slot-rename'),
  slotSave: document.getElementById('slot-save'),
  slotLoad: document.getElementById('slot-load'),
  slotStatus: document.getElementById('slot-status'),
  loadFile: document.getElementById('load-file'),
  testToggle: document.getElementById('test-toggle'),
  testOverlay: document.getElementById('test-overlay'),
  testViews: document.getElementById('test-views'),
  testRestart: document.getElementById('test-restart'),
  testExit: document.getElementById('test-exit'),
  playerCount: document.getElementById('player-count'),
  undo: document.getElementById('undo'),
  miniMap: document.getElementById('mini-map'),
  miniMapToggle: document.getElementById('mini-map-toggle'),
  miniViewport: document.getElementById('mini-viewport'),
  selectionBox: document.getElementById('selection-box'),
  scrollbarX: document.getElementById('scrollbar-x'),
  scrollbarY: document.getElementById('scrollbar-y'),
  scrollbarXThumb: document.getElementById('scrollbar-x-thumb'),
  scrollbarYThumb: document.getElementById('scrollbar-y-thumb'),
  layerPicker: document.getElementById('layer-picker'),
  layerPick: document.getElementById('layer-pick'),
  mapPosition: document.getElementById('map-position'),
  jumpTop: document.getElementById('jump-top'),
  jumpMid: document.getElementById('jump-mid'),
  jumpBottom: document.getElementById('jump-bottom'),
  jumpUp: document.getElementById('jump-up'),
  jumpDown: document.getElementById('jump-down'),
  jumpStart: document.getElementById('jump-start'),
  bgColor: document.getElementById('bg-color'),
  bgTexture: document.getElementById('bg-texture'),
  bgImage: document.getElementById('bg-image'),
  bgUseGeumgang: document.getElementById('bg-use-geumgang'),
  bgImageOpacity: document.getElementById('bg-image-opacity'),
  bgImageOpacityInput: document.getElementById('bg-image-opacity-input'),
  bgClear: document.getElementById('bg-clear'),
  gravity: document.getElementById('gravity'),
  maxFallSpeed: document.getElementById('max-fall-speed'),
  jumpSpeed: document.getElementById('jump-speed'),
  moveSpeed: document.getElementById('move-speed'),
  slopeSlideEnabled: document.getElementById('slope-slide-enabled'),
  flatInertiaEnabled: document.getElementById('flat-inertia-enabled'),
  flatInertiaPercent: document.getElementById('flat-inertia-percent'),
  walkableSlopeMaxAngle: document.getElementById('walkable-slope-max-angle'),
  slopeFallStartAngle: document.getElementById('slope-fall-start-angle'),
  slopeProfileList: document.getElementById('slope-profile-list'),
  slopeProfileReset: document.getElementById('slope-profile-reset'),
  slopeProfileAdd: document.getElementById('slope-profile-add'),
  flatZoneEditToggle: document.getElementById('flat-zone-edit-toggle'),
  flatZoneClearAll: document.getElementById('flat-zone-clear-all'),
  flatZoneStatus: document.getElementById('flat-zone-status'),
  jumpAirtime: document.getElementById('jump-airtime'),
  jumpAscent: document.getElementById('jump-ascent'),
  jumpDescent: document.getElementById('jump-descent'),
  jumpHeightDisplay: document.getElementById('jump-height-display'),
  cameraYBias: document.getElementById('camera-y-bias'),
  cameraYBiasInput: document.getElementById('camera-y-bias-input'),
  cameraYBiasLabel: document.getElementById('camera-y-bias-label'),
  playerBoxW: document.getElementById('player-hitbox-width'),
  playerBoxH: document.getElementById('player-hitbox-height'),
  playerFootInset: document.getElementById('player-foot-inset'),
  playerHitboxPointToggle: document.getElementById('player-hitbox-point-toggle'),
  playerHitboxPointUndo: document.getElementById('player-hitbox-point-undo'),
  playerHitboxPointClear: document.getElementById('player-hitbox-point-clear'),
  playerHitboxPointApply: document.getElementById('player-hitbox-point-apply'),
  playerHitboxPointStatus: document.getElementById('player-hitbox-point-status'),
  playerScale: document.getElementById('player-scale'),
  startX: document.getElementById('start-x'),
  startY: document.getElementById('start-y'),
  startApply: document.getElementById('start-apply'),
  savePointName: document.getElementById('savepoint-name'),
  savePointSelect: document.getElementById('savepoint-select'),
  savePointAdd: document.getElementById('savepoint-add'),
  savePointGo: document.getElementById('savepoint-go'),
  savePointSetStart: document.getElementById('savepoint-set-start'),
  savePointDelete: document.getElementById('savepoint-delete'),
  optAutoBase: document.getElementById('opt-auto-base'),
  optAutoScroll: document.getElementById('opt-auto-scroll'),
  optAutoSelect: document.getElementById('opt-auto-select'),
  stageToolbar: document.getElementById('stage-toolbar'),
  stageToolbarToggle: document.getElementById('toolbar-toggle'),
  testSavePointSelect: document.getElementById('test-savepoint-select'),
  testSavePointUseStart: document.getElementById('test-savepoint-use-start'),
  testSavePointWarp: document.getElementById('test-savepoint-warp'),
  testDebugHitbox: document.getElementById('test-debug-hitbox')
};

let plates = [];
let selectedSprite = null;
let spriteMeta = {};
let playerSpriteMeta = { w: 80, h: 120 };
let playerSpriteMetaReady = false;
let platesSource = 'json';
let dragState = null;
let hitboxDrag = null;
let panState = null;
let miniDrag = null;
let objectTransform = null;
let scrollbarDrag = null;
let cropDrag = null;
let playerHitboxDrag = null;
let selectionDrag = null;
let flatZoneDrag = null;
let workbenchDrag = null;
let workbenchPanDrag = null;
let objectClipboard = null;
let clipboardPasteCount = 0;
let queuedRenderWorld = false;
let queuedSyncProperties = false;
let draftSaveTimer = null;
let objectCropSession = null;
let playerCropSession = null;
const alphaImageDataCache = new Map();
const WORKBENCH_PLAYER_SOURCE_ID = '__workbench_player__';
const workbenchState = {
  open: false,
  zoom: 4,
  hitboxIndex: 0,
  focusMode: true,
  sourceType: 'object',
  sourceObjectId: null,
  sourcePlayerObject: null,
  snapshot: null,
  dirty: false,
  pinnedView: null,
  paint: {
    enabled: false,
    tool: 'poly',
    points: [],
    insertMode: false,
    edgeSlipMode: false,
    insertSelection: [],
    insertSelectionHitboxIndex: null,
    selectedEdgeIndex: null,
    selectedEdgeHitboxIndex: null,
    edgeSlipFeedbackText: '',
    edgeSlipFeedbackUntil: 0
  },
  hitboxCropScope: 'all',
  hitboxCropRegionStep: 'region',
  hitboxCropRegionRect: null,
  hitboxCropRegionObjectId: null,
  hitboxCropRegionCropRect: null,
  hitboxCropRegionCropObjectId: null,
  history: [],
  historyIndex: -1,
  historySignature: '',
  historyDeferred: false,
  historyApplying: false,
  guideTool: 'none',
  guideSnap: true,
  guides: {
    horizontal: [],
    vertical: []
  },
  selectedGuide: null,
  renderContext: null
};
const WORKBENCH_ZOOM_MIN = 0.25;
const WORKBENCH_ZOOM_MAX = 24;
const WORKBENCH_ZOOM_STEP = 0.25;
const WORKBENCH_GUIDE_SNAP_THRESHOLD_PX = 10;
const WORKBENCH_GUIDE_DUPE_EPS = 0.5;
const PLAYER_W = 80;
const PLAYER_H = 120;
const FOOT_INSET = 8;
const HITBOX_PRESET_KEY = 'jumpmap-hitbox-presets';
const SPRITE_PROFILE_KEY = 'jumpmap-sprite-profiles';
const PLAYER_PROFILE_KEY = 'jumpmap-player-profile';
const OBJECT_GROUP_PRESET_KEY = 'jumpmap-object-group-presets';
const PLATES_LOCAL_KEY = 'jumpmap-plates-local';
const EDITOR_DRAFT_KEY = 'jumpmap-editor-draft';
const EDITOR_DRAFT_SCHEMA = 1;
const LOCAL_MAP_SLOTS_KEY = 'jumpmap-editor-local-slots-v1';
const LOCAL_MAP_SLOT_COUNT = 5;
const LOCAL_MAP_SLOT_NAME_MAX = 24;
const OBJECT_GROUP_PRESET_NAME_MAX = 32;
const SAVE_POINT_NAME_MAX = 24;
const MAX_SAVE_POINT_COUNT = 64;
const GROUP_PRESET_SELECTION_PREFIX = '__group_preset__:';
const REQUIRED_PLATE_NAMES = ['plate_ice.png', 'plate_newstone.png'];
const canAutoAlphaExtract = (sprite) =>
  typeof sprite === 'string'
  && sprite.toLowerCase().endsWith('.png')
  && !isTextureSprite(sprite);
const {
  cloneHitboxes,
  normalizePolygonPoints,
  normalizePolygonEdgeSlip,
  areHitboxesTouching,
  createHitboxGroupId,
  groupTouchingHitboxes
} = window.JumpmapHitboxUtils;
const {
  worldToLocal,
  worldPointToLocal,
  localPointToWorld,
  worldToLocalScaled,
  computeRotatedBounds
} = window.JumpmapGeometryUtils;
const {
  buildSavePayload,
  parseLoadedMapData
} = window.JumpmapMapIOUtils;

const loadHitboxPresets = () => {
  try {
    const raw = localStorage.getItem(HITBOX_PRESET_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state.hitboxPresets = parsed;
    }
  } catch {
    // ignore
  }
};

const saveHitboxPresets = () => {
  try {
    localStorage.setItem(HITBOX_PRESET_KEY, JSON.stringify(state.hitboxPresets));
  } catch {
    // ignore
  }
};

const loadSpriteProfiles = () => {
  try {
    const raw = localStorage.getItem(SPRITE_PROFILE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state.spriteProfiles = parsed;
    }
  } catch {
    // ignore
  }
};

const saveSpriteProfiles = () => {
  try {
    localStorage.setItem(SPRITE_PROFILE_KEY, JSON.stringify(state.spriteProfiles));
  } catch {
    // ignore
  }
};

const normalizeObjectGroupPresetName = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.slice(0, OBJECT_GROUP_PRESET_NAME_MAX);
};

const createObjectGroupPresetId = () =>
  `obj_preset_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

const makeGroupPresetSelectionKey = (presetId) =>
  `${GROUP_PRESET_SELECTION_PREFIX}${presetId}`;

const isGroupPresetSelectionKey = (value) =>
  typeof value === 'string' && value.startsWith(GROUP_PRESET_SELECTION_PREFIX);

const getGroupPresetIdFromSelectionKey = (value) =>
  isGroupPresetSelectionKey(value)
    ? value.slice(GROUP_PRESET_SELECTION_PREFIX.length)
    : '';

const sanitizeObjectGroupPresetObject = (rawObject, index = 0) => {
  if (!rawObject || typeof rawObject !== 'object') return null;
  const normalized = normalizeRuntimeObject(rawObject, index);
  if (!normalized) return null;
  return {
    sprite: normalized.sprite,
    x: normalized.x,
    y: normalized.y,
    scale: normalized.scale,
    crop: normalized.crop ? cloneCrop(normalized.crop) : null,
    rotation: normalized.rotation,
    flipH: !!normalized.flipH,
    flipV: !!normalized.flipV,
    locked: !!normalized.locked,
    textureColor: normalized.textureColor || null,
    hitboxes: cloneHitboxes(normalized.hitboxes)
  };
};

const sanitizeObjectGroupPresetMap = (input) => {
  if (!input || typeof input !== 'object') return {};
  const next = {};
  Object.entries(input).forEach(([presetId, rawPreset]) => {
    if (!presetId || typeof rawPreset !== 'object' || !Array.isArray(rawPreset.objects)) return;
    const objects = rawPreset.objects
      .map((obj, index) => sanitizeObjectGroupPresetObject(obj, index))
      .filter(Boolean);
    if (!objects.length) return;
    const name =
      normalizeObjectGroupPresetName(rawPreset.name, `묶음 ${Object.keys(next).length + 1}`) ||
      `묶음 ${Object.keys(next).length + 1}`;
    next[String(presetId)] = {
      name,
      savedAt: typeof rawPreset.savedAt === 'string' ? rawPreset.savedAt : new Date().toISOString(),
      objects
    };
  });
  return next;
};

const loadObjectGroupPresets = () => {
  try {
    const raw = localStorage.getItem(OBJECT_GROUP_PRESET_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.objectGroupPresets = sanitizeObjectGroupPresetMap(parsed);
  } catch {
    // ignore
  }
};

const saveObjectGroupPresets = () => {
  try {
    localStorage.setItem(
      OBJECT_GROUP_PRESET_KEY,
      JSON.stringify(sanitizeObjectGroupPresetMap(state.objectGroupPresets))
    );
  } catch {
    // ignore
  }
};

const loadLocalPlates = () => {
  try {
    const raw = localStorage.getItem(PLATES_LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((name) => typeof name === 'string' && name.toLowerCase().endsWith('.png'));
  } catch {
    return null;
  }
};

const saveLocalPlates = (list) => {
  try {
    localStorage.setItem(PLATES_LOCAL_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
};

const ensureRequiredPlateEntries = (list) => {
  if (!Array.isArray(list)) return [];
  const normalized = list.filter((name) => typeof name === 'string' && name.toLowerCase().endsWith('.png'));
  REQUIRED_PLATE_NAMES.forEach((name) => {
    if (!normalized.includes(name)) normalized.push(name);
  });
  return normalized;
};

const buildEditorDraft = () => ({
  schemaVersion: EDITOR_DRAFT_SCHEMA,
  savedAt: new Date().toISOString(),
  payload: buildSavePayload(state)
});

const persistEditorDraft = () => {
  try {
    localStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(buildEditorDraft()));
  } catch {
    // ignore
  }
};

const scheduleDraftSave = () => {
  if (state.test?.active) return;
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    draftSaveTimer = null;
    persistEditorDraft();
  }, 300);
};

const cancelDraftSave = () => {
  if (!draftSaveTimer) return;
  clearTimeout(draftSaveTimer);
  draftSaveTimer = null;
};

const isPlateFile = (name) => {
  const lower = name.toLowerCase();
  if (!lower.endsWith('.png')) return false;
  if (lower.startsWith('.')) return false;
  if (lower.includes('backup') || lower.includes('bak') || lower.includes('copy')) return false;
  return true;
};

const loadPlatesFromDirectory = async () => {
  if (!window.showDirectoryPicker) return null;
  const dirHandle = await window.showDirectoryPicker();
  const names = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== 'file') continue;
    if (!isPlateFile(name)) continue;
    names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b, 'en'));
  return names;
};

const loadPlatesFromServer = async () => {
  const host = String(window.location?.hostname || '').toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  if (!isLocalHost) return null;
  try {
    const res = await fetch(`/__jumpmap/plates.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const parsed = await res.json();
    if (!parsed || !Array.isArray(parsed.files)) return null;
    const names = parsed.files.filter((name) => isPlateFile(name));
    names.sort((a, b) => a.localeCompare(b, 'en'));
    return names;
  } catch {
    return null;
  }
};

const cloneCrop = (crop) => {
  if (!crop || typeof crop !== 'object') return null;
  return {
    x: Math.max(0, Math.round(Number(crop.x) || 0)),
    y: Math.max(0, Math.round(Number(crop.y) || 0)),
    w: Math.max(1, Math.round(Number(crop.w) || 1)),
    h: Math.max(1, Math.round(Number(crop.h) || 1))
  };
};

const shiftHitboxes = (hitboxes, dx, dy) =>
  hitboxes.map((hitbox) => ({
    ...hitbox,
    x: Math.round(Number(hitbox.x) || 0) + dx,
    y: Math.round(Number(hitbox.y) || 0) + dy
  }));

const getHitboxBoundsForNormalization = (hitbox) => {
  const baseX = Math.round(Number(hitbox?.x) || 0);
  const baseY = Math.round(Number(hitbox?.y) || 0);
  if (
    hitbox?.type === 'polygon' &&
    Array.isArray(hitbox.points) &&
    hitbox.points.length >= 3
  ) {
    const xs = hitbox.points.map((point) => Number(point?.x));
    const ys = hitbox.points.map((point) => Number(point?.y));
    if (xs.every(Number.isFinite) && ys.every(Number.isFinite)) {
      const minX = baseX + Math.min(...xs);
      const minY = baseY + Math.min(...ys);
      const maxX = baseX + Math.max(...xs);
      const maxY = baseY + Math.max(...ys);
      return {
        x: Math.round(minX),
        y: Math.round(minY),
        w: Math.max(1, Math.ceil(maxX - minX)),
        h: Math.max(1, Math.ceil(maxY - minY))
      };
    }
  }
  return {
    x: baseX,
    y: baseY,
    w: Math.max(1, Math.round(Number(hitbox?.w) || 1)),
    h: Math.max(1, Math.round(Number(hitbox?.h) || 1))
  };
};

const getHitboxCropFitScore = (hitboxes, crop) => {
  if (!Array.isArray(hitboxes) || !hitboxes.length || !crop) return 0;
  const offsetX = Math.round(Number(crop?.x) || 0);
  const offsetY = Math.round(Number(crop?.y) || 0);
  const cropW = Math.max(1, Math.round(Number(crop.w) || 1));
  const cropH = Math.max(1, Math.round(Number(crop.h) || 1));
  let overlapArea = 0;
  let totalArea = 0;
  hitboxes.forEach((hitbox) => {
    const bounds = getHitboxBoundsForNormalization(hitbox);
    const x = bounds.x - offsetX;
    const y = bounds.y - offsetY;
    const w = bounds.w;
    const h = bounds.h;
    const boxArea = w * h;
    totalArea += boxArea;
    const ix0 = Math.max(0, x);
    const iy0 = Math.max(0, y);
    const ix1 = Math.min(cropW, x + w);
    const iy1 = Math.min(cropH, y + h);
    if (ix1 > ix0 && iy1 > iy0) {
      overlapArea += (ix1 - ix0) * (iy1 - iy0);
    }
  });
  if (totalArea <= 0) return 0;
  return overlapArea / totalArea;
};

const isHitboxInsideRect = (hitbox, rect) => {
  if (!hitbox || !rect) return false;
  const bounds = getHitboxBoundsForNormalization(hitbox);
  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.w;
  const h = bounds.h;
  return (
    x >= rect.minX &&
    y >= rect.minY &&
    x + w <= rect.maxX &&
    y + h <= rect.maxY
  );
};

const areHitboxesInsideRect = (hitboxes, rect) =>
  Array.isArray(hitboxes) &&
  hitboxes.length > 0 &&
  hitboxes.every((hitbox) => isHitboxInsideRect(hitbox, rect));

const getHitboxCoverageScoreInRect = (hitboxes, rect) => {
  if (!Array.isArray(hitboxes) || !hitboxes.length || !rect) return 0;
  let overlap = 0;
  let total = 0;
  hitboxes.forEach((hitbox) => {
    const bounds = getHitboxBoundsForNormalization(hitbox);
    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.w;
    const h = bounds.h;
    total += w * h;
    const ix0 = Math.max(rect.minX, x);
    const iy0 = Math.max(rect.minY, y);
    const ix1 = Math.min(rect.maxX, x + w);
    const iy1 = Math.min(rect.maxY, y + h);
    if (ix1 > ix0 && iy1 > iy0) overlap += (ix1 - ix0) * (iy1 - iy0);
  });
  if (total <= 0) return 0;
  return overlap / total;
};

const normalizeHitboxesForCropSpace = (hitboxes, crop) => {
  if (!Array.isArray(hitboxes) || !hitboxes.length || !crop) return hitboxes;
  const offsetX = Math.round(Number(crop.x) || 0);
  const offsetY = Math.round(Number(crop.y) || 0);
  const cropW = Math.max(1, Math.round(Number(crop.w) || 1));
  const cropH = Math.max(1, Math.round(Number(crop.h) || 1));
  if (offsetX === 0 && offsetY === 0) return hitboxes;

  const globalRect = {
    minX: offsetX,
    minY: offsetY,
    maxX: offsetX + cropW,
    maxY: offsetY + cropH
  };
  const localRect = {
    minX: 0,
    minY: 0,
    maxX: cropW,
    maxY: cropH
  };

  // Keep current coordinates unless the data is clearly in local crop space.
  // This prevents refresh/load from drifting saved hitboxes by one more offset.
  if (areHitboxesInsideRect(hitboxes, globalRect)) return hitboxes;
  const rawGlobalCoverage = getHitboxCoverageScoreInRect(hitboxes, globalRect);
  const rawLocalCoverage = getHitboxCoverageScoreInRect(hitboxes, localRect);
  if (rawGlobalCoverage >= 0.75 && rawGlobalCoverage >= rawLocalCoverage) return hitboxes;

  const insideGlobal = areHitboxesInsideRect(hitboxes, globalRect);
  const insideLocal = areHitboxesInsideRect(hitboxes, localRect);
  const clearlyLocal =
    (
      (insideLocal && !insideGlobal) ||
      (rawLocalCoverage >= 0.9 && rawLocalCoverage >= rawGlobalCoverage + 0.25)
    ) &&
    rawGlobalCoverage <= 0.4;

  if (clearlyLocal) {
    const shiftedPlus = shiftHitboxes(hitboxes, offsetX, offsetY);
    const plusCoverage = getHitboxCoverageScoreInRect(shiftedPlus, globalRect);
    if (areHitboxesInsideRect(shiftedPlus, globalRect)) return shiftedPlus;
    if (plusCoverage >= Math.max(0.8, rawGlobalCoverage + 0.3)) return shiftedPlus;
    return hitboxes;
  }
  return hitboxes;
};

const normalizeHitboxRotation = (value, fallback = 0) => {
  let deg = Math.round(Number(value) || fallback);
  deg %= 360;
  if (deg < 0) deg += 360;
  return deg;
};

const isPolygonHitbox = (hitbox) =>
  !!hitbox
  && hitbox.type === 'polygon'
  && Array.isArray(hitbox.points)
  && hitbox.points.length >= 3;

const getPolygonLocalPoints = (hitbox, offsetX = 0, offsetY = 0) => {
  if (!isPolygonHitbox(hitbox)) return null;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hitbox.points) : hitbox.points)
    || hitbox.points;
  if (!Array.isArray(points) || points.length < 3) return null;
  const x = Number(hitbox.x) || 0;
  const y = Number(hitbox.y) || 0;
  return points.map((point) => ({
    x: x - offsetX + Number(point.x || 0),
    y: y - offsetY + Number(point.y || 0)
  }));
};

const getPolygonRelativeBounds = (points) => {
  if (!Array.isArray(points) || points.length < 3) return null;
  const xs = points.map((point) => Number(point?.x));
  const ys = points.map((point) => Number(point?.y));
  if (xs.some((value) => !Number.isFinite(value)) || ys.some((value) => !Number.isFinite(value))) {
    return null;
  }
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: Math.max(1, Math.ceil(maxX - minX)),
    h: Math.max(1, Math.ceil(maxY - minY))
  };
};

const normalizePolygonHitbox = (hitbox) => {
  if (!hitbox || typeof hitbox !== 'object') return null;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hitbox.points) : null) || null;
  if (!points || points.length < 3) return null;
  const pointsBounds = getPolygonRelativeBounds(points);
  if (!pointsBounds) return null;
  let x = Math.round(Number(hitbox.x) || 0);
  let y = Math.round(Number(hitbox.y) || 0);
  const hasFiniteOrigin =
    Number.isFinite(Number(hitbox.x)) &&
    Number.isFinite(Number(hitbox.y));
  const declaredW = Math.max(1, Math.round(Number(hitbox.w) || Math.ceil(pointsBounds.maxX || 1)));
  const declaredH = Math.max(1, Math.round(Number(hitbox.h) || Math.ceil(pointsBounds.maxY || 1)));
  let rebased = points;
  const isWithinDeclaredBox = (b) =>
    !!b &&
    b.minX >= -1 &&
    b.minY >= -1 &&
    b.maxX <= declaredW + 1 &&
    b.maxY <= declaredH + 1;
  // Backward-compatibility:
  // Some polygon data was saved with absolute local points while x/y were also present.
  // In that case, convert points back to x/y-relative space.
  if (hasFiniteOrigin && !isWithinDeclaredBox(pointsBounds)) {
    const looksAbsoluteByXY =
      pointsBounds.minX >= x - 1 &&
      pointsBounds.minY >= y - 1 &&
      pointsBounds.maxX <= x + declaredW + 1 &&
      pointsBounds.maxY <= y + declaredH + 1;
    if (!looksAbsoluteByXY) {
      // Keep as-is unless legacy absolute-by-xy shape is clearly detected.
    } else {
      const shiftedByXY = points.map((point) => ({
        x: Number(point.x || 0) - x,
        y: Number(point.y || 0) - y
      }));
      const shiftedBounds = getPolygonRelativeBounds(shiftedByXY);
      if (isWithinDeclaredBox(shiftedBounds)) {
        rebased = shiftedByXY.map((point) => ({
          x: Math.round(point.x * 1000) / 1000,
          y: Math.round(point.y * 1000) / 1000
        }));
      }
    }
  }
  // Legacy compatibility only when x/y is absent or malformed.
  if (!hasFiniteOrigin) {
    const fallbackBounds = getPolygonRelativeBounds(rebased);
    if (!fallbackBounds) return null;
    x = Math.round(fallbackBounds.minX);
    y = Math.round(fallbackBounds.minY);
    rebased = rebased.map((point) => ({
      x: Math.round((Number(point.x || 0) - x) * 1000) / 1000,
      y: Math.round((Number(point.y || 0) - y) * 1000) / 1000
    }));
  }
  const rebasedBounds = getPolygonRelativeBounds(rebased);
  const edgeSlip = normalizePolygonEdgeSlip ? normalizePolygonEdgeSlip(hitbox.edgeSlip, rebased.length) : null;
  return {
    ...hitbox,
    type: 'polygon',
    x,
    y,
    // Polygon bounds must follow points, not stale persisted w/h.
    w: Math.max(1, Math.ceil(rebasedBounds?.maxX || declaredW || 1)),
    h: Math.max(1, Math.ceil(rebasedBounds?.maxY || declaredH || 1)),
    rotation: 0,
    locked: !!hitbox.locked,
    points: rebased,
    ...(edgeSlip ? { edgeSlip } : {}),
    ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
  };
};

const pointInPolygon = (x, y, points) => {
  if (!Array.isArray(points) || points.length < 3) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = Number(points[i].x) || 0;
    const yi = Number(points[i].y) || 0;
    const xj = Number(points[j].x) || 0;
    const yj = Number(points[j].y) || 0;
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const normalizeObjectRotation = (value, fallback = 0) => {
  let deg = Math.round(Number(value) || fallback);
  deg %= 360;
  if (deg < 0) deg += 360;
  return deg;
};

const sanitizeProfileHitboxes = (hitboxes) => {
  if (!Array.isArray(hitboxes)) return null;
  const list = hitboxes
    .filter((hitbox) => hitbox && typeof hitbox === 'object')
    .map((hitbox) => {
      if (hitbox.type === 'polygon') {
        const normalizedPolygon = normalizePolygonHitbox(hitbox);
        if (normalizedPolygon) return normalizedPolygon;
      }
      return {
        x: Math.round(Number(hitbox.x) || 0),
        y: Math.round(Number(hitbox.y) || 0),
        w: Math.max(1, Math.round(Number(hitbox.w) || 1)),
        h: Math.max(1, Math.round(Number(hitbox.h) || 1)),
        rotation: normalizeHitboxRotation(hitbox.rotation, 0),
        locked: !!hitbox.locked,
        ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
      };
    })
    .filter(Boolean);
  return list.length ? list : null;
};

const normalizeSpriteProfile = (profile, spriteName = '') => {
  if (!profile || typeof profile !== 'object') return null;
  const normalized = {};
  const scale = Number(profile.scale ?? profile.defaultScale);
  if (Number.isFinite(scale) && scale > 0) {
    const clampedScale = Math.max(0.05, Math.min(20, scale));
    normalized.scale = Number(clampedScale.toFixed(4));
  }
  const crop = cloneCrop(profile.crop);
  if (crop) normalized.crop = crop;
  let hitboxes = sanitizeProfileHitboxes(profile.hitboxes);
  if (hitboxes && crop) {
    hitboxes = normalizeHitboxesForCropSpace(hitboxes, crop);
  }
  if (hitboxes) normalized.hitboxes = hitboxes;
  if (Object.keys(normalized).length === 0) return null;
  if (spriteName && typeof spriteName === 'string') {
    normalized.source = getSpriteSourcePath(spriteName);
  }
  return normalized;
};

const getLegacyProfile = (sprite) => {
  const legacy = {};
  const defaultScale = state.spriteDefaults?.[sprite]?.scale;
  if (Number.isFinite(defaultScale) && defaultScale > 0) {
    legacy.scale = Number(defaultScale);
  }
  const legacyHitboxes = sanitizeProfileHitboxes(state.hitboxPresets?.[sprite]);
  if (legacyHitboxes) {
    legacy.hitboxes = legacyHitboxes;
  }
  return Object.keys(legacy).length ? legacy : null;
};

const getSpriteProfile = (sprite) => {
  if (!sprite) return null;
  const normalized = normalizeSpriteProfile(state.spriteProfiles?.[sprite], sprite);
  if (normalized) return normalized;
  return getLegacyProfile(sprite);
};

const syncLegacyPresetCachesFromProfiles = () => {
  const hitboxPresets = {};
  const spriteDefaults = {};
  Object.entries(state.spriteProfiles || {}).forEach(([sprite, rawProfile]) => {
    const profile = normalizeSpriteProfile(rawProfile, sprite);
    if (!profile) return;
    if (profile.hitboxes?.length) hitboxPresets[sprite] = cloneHitboxes(profile.hitboxes);
    if (Number.isFinite(profile.scale) && profile.scale > 0) spriteDefaults[sprite] = { scale: profile.scale };
  });
  state.hitboxPresets = hitboxPresets;
  state.spriteDefaults = spriteDefaults;
};

const migrateLegacyProfiles = () => {
  const spriteNames = new Set([
    ...Object.keys(state.spriteProfiles || {}),
    ...Object.keys(state.hitboxPresets || {}),
    ...Object.keys(state.spriteDefaults || {})
  ]);
  const nextProfiles = { ...state.spriteProfiles };
  let changed = false;
  spriteNames.forEach((sprite) => {
    const normalizedCurrent = normalizeSpriteProfile(nextProfiles[sprite], sprite);
    if (normalizedCurrent) {
      const prev = JSON.stringify(nextProfiles[sprite] || {});
      const next = JSON.stringify(normalizedCurrent);
      if (prev !== next) {
        nextProfiles[sprite] = normalizedCurrent;
        changed = true;
      }
      return;
    }
    const legacy = getLegacyProfile(sprite);
    if (!legacy) return;
    nextProfiles[sprite] = {
      ...legacy,
      source: getSpriteSourcePath(sprite)
    };
    changed = true;
  });
  if (changed) {
    state.spriteProfiles = nextProfiles;
  }
  syncLegacyPresetCachesFromProfiles();
};

const clampRawCropToMeta = (sprite, crop) => {
  if (!crop || typeof crop !== 'object') return null;
  const rawX = Math.round(Number(crop.x) || 0);
  const rawY = Math.round(Number(crop.y) || 0);
  const rawW = Math.max(1, Math.round(Number(crop.w) || 1));
  const rawH = Math.max(1, Math.round(Number(crop.h) || 1));
  const sanitized = {
    x: Math.max(0, rawX),
    y: Math.max(0, rawY),
    w: rawW,
    h: rawH
  };
  const meta = getSpriteMetaSize(sprite);
  if (!meta || !Number.isFinite(meta.w) || !Number.isFinite(meta.h) || meta.w < 1 || meta.h < 1) {
    return sanitized;
  }
  const x = Math.max(0, Math.min(meta.w - 1, rawX));
  const y = Math.max(0, Math.min(meta.h - 1, rawY));
  const w = Math.max(1, Math.min(meta.w - x, rawW));
  const h = Math.max(1, Math.min(meta.h - y, rawH));
  return { x, y, w, h };
};

const normalizeRuntimeObject = (obj, index = 0) => {
  if (!obj || typeof obj !== 'object' || typeof obj.sprite !== 'string') return null;
  const textureType = isTextureSprite(obj.sprite) ? getTextureTypeFromSprite(obj.sprite) : null;
  const normalized = {
    id: typeof obj.id === 'string' ? obj.id : `obj_runtime_${Date.now()}_${index}`,
    sprite: obj.sprite,
    x: Math.round(Number(obj.x) || 0),
    y: Math.round(Number(obj.y) || 0),
    scale: Math.max(0.05, Math.min(20, Number(obj.scale) || 1)),
    rotation: 0,
    flipH: !!obj.flipH,
    flipV: !!obj.flipV,
    locked: !!obj.locked,
    textureColor: textureType === 'solid' ? normalizeHexColor(obj.textureColor) : null,
    crop: clampRawCropToMeta(obj.sprite, obj.crop),
    hitboxes: []
  };
  if (obj.groupId) {
    normalized.groupId = String(obj.groupId);
  }

  normalized.rotation = normalizeObjectRotation(obj.rotation, 0);
  const reliableBounds = !!normalized.crop || hasReliableSpriteBounds(normalized.sprite);
  const meta = reliableBounds ? getSpriteMetaSize(normalized.sprite, { w: 200, h: 80 }) : null;
  const bounds = normalized.crop || (meta ? { x: 0, y: 0, w: meta.w, h: meta.h } : null);
  const minX = bounds ? Math.round(bounds.x) : 0;
  const minY = bounds ? Math.round(bounds.y) : 0;
  const maxX = bounds ? (minX + Math.max(1, Math.round(bounds.w))) : 0;
  const maxY = bounds ? (minY + Math.max(1, Math.round(bounds.h))) : 0;

  const inputHitboxes = Array.isArray(obj.hitboxes) ? obj.hitboxes : [];
  let normalizedHitboxes = inputHitboxes
    .filter((hitbox) => hitbox && typeof hitbox === 'object')
    .map((hitbox) => {
      if (hitbox.type === 'polygon') {
        const normalizedPolygon = normalizePolygonHitbox(hitbox);
        if (normalizedPolygon) return normalizedPolygon;
      }
      return {
        x: Math.round(Number(hitbox.x) || 0),
        y: Math.round(Number(hitbox.y) || 0),
        w: Math.max(1, Math.round(Number(hitbox.w) || 1)),
        h: Math.max(1, Math.round(Number(hitbox.h) || 1)),
        rotation: normalizeHitboxRotation(hitbox.rotation, 0),
        locked: !!hitbox.locked,
        ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
      };
    })
    .filter(Boolean);
  if (normalized.crop) {
    normalizedHitboxes = normalizeHitboxesForCropSpace(normalizedHitboxes, normalized.crop);
  }
  normalized.hitboxes = normalizedHitboxes
    .map((hitbox) => {
      if (isPolygonHitbox(hitbox)) {
        return normalizePolygonHitbox(hitbox);
      }
      if (!bounds) {
        return {
          ...hitbox,
          x: Math.round(hitbox.x),
          y: Math.round(hitbox.y),
          w: Math.max(1, Math.round(hitbox.w)),
          h: Math.max(1, Math.round(hitbox.h))
        };
      }
      const w = Math.max(1, Math.min(Math.round(hitbox.w), maxX - minX));
      const h = Math.max(1, Math.min(Math.round(hitbox.h), maxY - minY));
      const x = Math.max(minX, Math.min(Math.round(hitbox.x), maxX - w));
      const y = Math.max(minY, Math.min(Math.round(hitbox.y), maxY - h));
      return { ...hitbox, x, y, w, h };
    });

  // Recovery guard: older sessions could collapse a single polygon hitbox
  // to object origin while points stayed unchanged. If points still match
  // the sprite profile, restore the profile offset.
  maybeRestorePolygonOffsetFromProfile(normalized, normalized.hitboxes);

  // Legacy single-box profiles can be saved in an offset coordinate space.
  // Auto-snap clearly displaced large boxes to object bounds.
  if (bounds) {
    maybeSnapDisplacedLargeSingleHitbox(normalized, normalized.hitboxes);
  }

  if (!normalized.hitboxes.length) {
    normalized.hitboxes = [createDefaultHitbox(normalized.sprite)];
  }
  return normalized;
};

const normalizeRuntimeStateAgainstAssets = () => {
  if (state.background) {
    state.background.color = normalizeHexColor(state.background.color, '#ffffff');
    if (state.background.texture) {
      state.background.texture = normalizeTextureType(state.background.texture);
    }
    state.background.image = normalizeBackgroundImagePath(state.background.image || '');
    state.background.imageOpacity = clampNumber(state.background.imageOpacity, 0, 1, 1);
  }
  const nextProfiles = {};
  Object.entries(state.spriteProfiles || {}).forEach(([sprite, rawProfile]) => {
    const normalized = normalizeSpriteProfile(rawProfile, sprite);
    if (!normalized) return;
    if (normalized.crop) normalized.crop = clampRawCropToMeta(sprite, normalized.crop);
    nextProfiles[sprite] = normalized;
  });
  state.spriteProfiles = nextProfiles;
  syncLegacyPresetCachesFromProfiles();

  const objects = Array.isArray(state.objects) ? state.objects : [];
  state.objects = objects
    .map((obj, index) => normalizeRuntimeObject(obj, index))
    .filter(Boolean);

  if (state.playerCrop) {
    const sanitized = cloneCrop(state.playerCrop);
    if (sanitized) {
      state.playerCrop = playerSpriteMetaReady ? clampPlayerCrop(sanitized) : sanitized;
    } else {
      state.playerCrop = null;
    }
  }
  state.playerHitboxPolygon = normalizePlayerHitboxPolygon(state.playerHitboxPolygon);
};

const persistSpriteProfiles = () => {
  syncLegacyPresetCachesFromProfiles();
  saveHitboxPresets();
  saveSpriteProfiles();
};

const persistObjectGroupPresetState = () => {
  state.objectGroupPresets = sanitizeObjectGroupPresetMap(state.objectGroupPresets);
  saveObjectGroupPresets();
};

const getPresetHitboxes = (sprite) => {
  const profile = getSpriteProfile(sprite);
  if (!profile?.hitboxes?.length) return null;
  return cloneHitboxes(profile.hitboxes);
};

const pushHistory = () => {
  const snapshot = JSON.stringify({
    map: state.map,
    grid: state.grid,
    camera: state.camera,
    background: state.background,
    playerHitbox: state.playerHitbox,
    playerHitboxOffset: state.playerHitboxOffset,
    playerHitboxPolygon: state.playerHitboxPolygon,
    playerScale: state.playerScale,
    playerCrop: state.playerCrop,
    playerLocked: !!state.playerLocked,
    physics: state.physics,
    startPoint: state.startPoint,
    savePoints: state.savePoints,
    editorOptions: state.editorOptions,
    spriteProfiles: state.spriteProfiles,
    objectGroupPresets: state.objectGroupPresets,
    hitboxPresets: state.hitboxPresets,
    spriteDefaults: state.spriteDefaults,
    objects: state.objects
  });
  state.history.push(snapshot);
  if (state.history.length > 20) state.history.shift();
};

const restoreHistory = () => {
  if (!state.history.length) return;
  const snapshot = state.history.pop();
  const data = JSON.parse(snapshot);
  state.map = data.map;
  state.grid = data.grid;
  state.camera = data.camera;
  state.background = data.background || state.background;
  state.playerHitbox = data.playerHitbox || state.playerHitbox;
  state.playerHitboxOffset = data.playerHitboxOffset || state.playerHitboxOffset;
  state.playerHitboxPolygon = normalizePlayerHitboxPolygon(data.playerHitboxPolygon) || null;
  state.playerScale = data.playerScale ?? state.playerScale;
  state.playerCrop = data.playerCrop ?? state.playerCrop ?? null;
  state.playerLocked = !!(Object.prototype.hasOwnProperty.call(data, 'playerLocked') ? data.playerLocked : state.playerLocked);
  state.physics = normalizePhysicsState(data.physics || state.physics);
  state.startPoint = data.startPoint ?? state.startPoint;
  state.savePoints = sanitizeSavePoints(data.savePoints ?? state.savePoints ?? []);
  state.editorOptions = { ...state.editorOptions, ...(data.editorOptions || {}) };
  state.spriteProfiles = data.spriteProfiles || state.spriteProfiles || {};
  state.objectGroupPresets = data.objectGroupPresets || state.objectGroupPresets || {};
  state.spriteDefaults = data.spriteDefaults || {};
  state.hitboxPresets = data.hitboxPresets ?? state.hitboxPresets;
  migrateLegacyProfiles();
  state.objects = data.objects || [];
  normalizeRuntimeStateAgainstAssets();
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedSpecial = null;
  state.selectedHitboxIndex = null;
  state.selectedHitboxIndices = [];
  state.selectionTarget = 'object';
  state.flatZoneEdit = false;
  flatZoneDrag = null;
  applyMapSize();
  updateBackgroundInputs();
  applyBackground();
  renderWorld();
  syncProperties();
  syncPlayerHitboxInputs();
  updatePlayerProfileStatus();
  syncPhysicsInputs();
  syncCameraInputs();
  ensureStartPoint();
  refreshSavePointControls();
  syncEditorOptionsInputs();
  scheduleDraftSave();
};

const applyLoadedPayload = (
  data,
  { persistProfiles = true, persistGroupPresets = true, persistDraft = true } = {}
) => {
  state.map.width = data.map.width;
  state.map.height = data.map.height;
  state.grid = data.grid;
  state.camera = data.camera;
  state.background = data.background;
  state.playerHitbox = data.playerHitbox;
  state.playerHitboxOffset = data.playerHitboxOffset;
  state.playerHitboxPolygon = normalizePlayerHitboxPolygon(data.playerHitboxPolygon) || null;
  state.playerScale = data.playerScale;
  state.playerCrop = data.playerCrop;
  state.playerLocked = !!data.playerLocked;
  state.physics = normalizePhysicsState(data.physics);
  state.startPoint = data.startPoint;
  state.savePoints = sanitizeSavePoints(data.savePoints || []);
  state.editorOptions = data.editorOptions;
  state.spriteProfiles = data.spriteProfiles || {};
  state.objectGroupPresets = data.objectGroupPresets || {};
  state.hitboxPresets = data.hitboxPresets;
  state.objects = data.objects;
  state.spriteDefaults = data.spriteDefaults;
  migrateLegacyProfiles();
  normalizeRuntimeStateAgainstAssets();
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedSpecial = null;
  state.selectedHitboxIndex = null;
  state.selectedHitboxIndices = [];
  state.selectionTarget = 'object';
  state.flatZoneEdit = false;
  flatZoneDrag = null;
  if (persistProfiles) persistSpriteProfiles();
  if (persistGroupPresets) persistObjectGroupPresetState();
  if (!state.objects.length && state.editorOptions.autoBasePlatform) {
    ensureBasePlatform();
  }
  renderPalette();
  applyMapSize();
  renderWorld();
  syncProperties();
  updateBackgroundInputs();
  applyBackground();
  syncPlayerHitboxInputs();
  updatePlayerProfileStatus();
  applyPlayerHitboxToViews();
  refreshSavePointControls();
  syncEditorOptionsInputs();
  syncPhysicsInputs();
  syncCameraInputs();
  if (persistDraft) scheduleDraftSave();
};

const tryRestoreEditorDraft = () => {
  try {
    const raw = localStorage.getItem(EDITOR_DRAFT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const payloadRaw = parsed?.payload ?? parsed?.map ?? parsed;
    const result = parseLoadedMapData(payloadRaw, state);
    if (!result.ok) return false;
    applyLoadedPayload(result.payload, {
      persistProfiles: false,
      persistGroupPresets: false,
      persistDraft: false
    });
    return true;
  } catch {
    return false;
  }
};

const createEmptyLocalSlots = () => Array.from({ length: LOCAL_MAP_SLOT_COUNT }, () => null);

let localMapSlots = createEmptyLocalSlots();

const formatSlotDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p2 = (value) => String(value).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = p2(date.getMonth() + 1);
  const dd = p2(date.getDate());
  const hh = p2(date.getHours());
  const mi = p2(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const normalizeLocalSlotName = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, LOCAL_MAP_SLOT_NAME_MAX);
};

const getSelectedLocalSlotIndex = () => {
  const raw = Number(els.localSlotSelect?.value);
  if (!Number.isInteger(raw) || raw < 0 || raw >= LOCAL_MAP_SLOT_COUNT) return 0;
  return raw;
};

const getLocalSlotDisplayName = (slot, index) => {
  const base = `슬롯 ${index + 1}`;
  const name = normalizeLocalSlotName(slot?.name);
  return name ? `${base} · ${name}` : base;
};

const refreshLocalSlotSelectOptions = () => {
  if (!els.localSlotSelect) return;
  const selectedIndex = getSelectedLocalSlotIndex();
  Array.from(els.localSlotSelect.options).forEach((option, index) => {
    option.textContent = getLocalSlotDisplayName(localMapSlots[index], index);
  });
  els.localSlotSelect.value = String(selectedIndex);
};

const syncSelectedLocalSlotNameInput = () => {
  if (!els.localSlotName) return;
  const index = getSelectedLocalSlotIndex();
  const slot = localMapSlots[index];
  els.localSlotName.value = normalizeLocalSlotName(slot?.name);
};

const updateLocalSlotStatus = (message = '') => {
  if (!els.slotStatus) return;
  if (message) {
    els.slotStatus.textContent = message;
    return;
  }
  const index = getSelectedLocalSlotIndex();
  const slot = localMapSlots[index];
  if (!slot?.payload) {
    els.slotStatus.textContent = `${getLocalSlotDisplayName(slot, index)}: 비어있음`;
    return;
  }
  const savedAtText = formatSlotDate(slot.savedAt);
  els.slotStatus.textContent = `${getLocalSlotDisplayName(slot, index)}: 저장됨 ${savedAtText || '-'}`;
};

const loadLocalMapSlots = () => {
  try {
    const raw = localStorage.getItem(LOCAL_MAP_SLOTS_KEY);
    if (!raw) {
      localMapSlots = createEmptyLocalSlots();
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localMapSlots = createEmptyLocalSlots();
      return;
    }
    localMapSlots = createEmptyLocalSlots();
    parsed.slice(0, LOCAL_MAP_SLOT_COUNT).forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const hasPayload = Object.prototype.hasOwnProperty.call(entry, 'payload') && Boolean(entry.payload);
      const name = normalizeLocalSlotName(entry.name);
      if (!hasPayload && !name) return;
      localMapSlots[index] = {
        savedAt: typeof entry.savedAt === 'string' ? entry.savedAt : new Date().toISOString(),
        payload: hasPayload ? entry.payload : null,
        name
      };
    });
  } catch {
    localMapSlots = createEmptyLocalSlots();
  }
};

const saveLocalMapSlots = () => {
  try {
    localStorage.setItem(LOCAL_MAP_SLOTS_KEY, JSON.stringify(localMapSlots));
  } catch {
    // ignore
  }
};

const applyDefaultEditorState = ({ withHistory = true } = {}) => {
  if (withHistory) pushHistory();
  state.map = { width: 2400, height: 12000 };
  state.grid = { size: 32, snap: true, visible: true };
  state.camera = { yBias: 0.46, smooth: 0.18 };
  state.background = { color: '#ffffff', image: '', texture: '', imageOpacity: 1 };
  state.physics = {
    fallSpeed: 600,
    jumpSpeed: 1000,
    jumpHeight: 240,
    moveSpeed: 220,
    walkableSlopeMaxAngle: DEFAULT_WALKABLE_SLOPE_MAX_ANGLE,
    slopeFallStartAngle: DEFAULT_SLOPE_FALL_START_ANGLE,
    slopeSlideEnabled: false,
    flatInertiaEnabled: false,
    flatInertiaPercent: DEFAULT_FLAT_INERTIA_PERCENT,
    iceSurfaceEnabled: false,
    iceInertiaPercent: DEFAULT_ICE_INERTIA_PERCENT,
    iceControlPercent: DEFAULT_ICE_CONTROL_PERCENT,
    slopeSpeedProfile: cloneDefaultSlopeSpeedProfile(),
    flatZones: []
  };
  state.flatZoneEdit = false;
  state.editorOptions = {
    autoBasePlatform: true,
    autoScrollStart: true,
    autoSelectAfterPlace: true
  };
  if (state.playerProfile) {
    const profile = normalizePlayerProfile(state.playerProfile);
    if (profile) {
      state.playerProfile = profile;
      state.playerHitbox = { ...profile.playerHitbox };
      state.playerHitboxOffset = { ...profile.playerHitboxOffset };
      state.playerHitboxPolygon = profile.playerHitboxPolygon
        ? { points: profile.playerHitboxPolygon.points.map((point) => ({ ...point })) }
        : null;
      state.playerScale = profile.playerScale;
      state.playerCrop = profile.playerCrop ? cloneCrop(profile.playerCrop) : null;
    } else {
      state.playerHitbox = { width: 80, height: 120, footInset: 8 };
      state.playerHitboxOffset = { x: 0, y: 0 };
      state.playerHitboxPolygon = null;
      state.playerScale = 1;
      state.playerCrop = null;
    }
  } else {
    state.playerHitbox = { width: 80, height: 120, footInset: 8 };
    state.playerHitboxOffset = { x: 0, y: 0 };
    state.playerHitboxPolygon = null;
    state.playerScale = 1;
    state.playerCrop = null;
  }
  state.playerLocked = false;
  state.objects = [];
  state.startPoint = null;
  state.savePoints = [];
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedSpecial = null;
  state.selectedHitboxIndex = null;
  state.selectedHitboxIndices = [];
  state.selectionTarget = 'object';
  setMode('select');
  applyMapSize();
  updateBackgroundInputs();
  applyBackground();
  syncPhysicsInputs();
  syncCameraInputs();
  syncEditorOptionsInputs();
  syncPlayerHitboxInputs();
  updatePlayerProfileStatus();
  if (state.editorOptions.autoBasePlatform) ensureBasePlatform();
  ensureStartPoint();
  refreshSavePointControls({ preserveSelection: false });
  renderWorld();
  syncProperties();
  if (state.editorOptions.autoScrollStart) {
    requestAnimationFrame(scrollToStart);
  }
};

const loadPlates = async (options = {}) => {
  const { bustCache = false, preferLocal = true } = options;
  loadHitboxPresets();
  loadSpriteProfiles();
  loadObjectGroupPresets();
  loadPlayerProfile();
  migrateLegacyProfiles();
  persistSpriteProfiles();
  const local = preferLocal ? loadLocalPlates() : null;
  if (local && local.length) {
    platesSource = 'local';
    plates = ensureRequiredPlateEntries(local);
  } else if (preferLocal) {
    const serverNames = await loadPlatesFromServer();
    if (serverNames && serverNames.length) {
      platesSource = 'local';
      plates = ensureRequiredPlateEntries(serverNames);
      saveLocalPlates(plates);
    }
  }
  if (!plates.length) {
    platesSource = 'json';
    const url = bustCache ? `./data/plates.json?v=${Date.now()}` : './data/plates.json';
    const res = await fetch(url);
    plates = ensureRequiredPlateEntries(await res.json());
  } else {
    plates = ensureRequiredPlateEntries(plates);
  }
  spriteMeta = {};
  const loaded = await preloadSprites();
  if (loaded.length && loaded.length !== plates.length) {
    plates = loaded;
    if (platesSource === 'local') {
      saveLocalPlates(plates);
    }
  }
  if (!loaded.length && plates.length && platesSource === 'local') {
    saveLocalPlates([]);
    return loadPlates({ bustCache, preferLocal: false });
  }
  normalizeRuntimeStateAgainstAssets();
  renderPalette();
  if (!state.objects.length && state.editorOptions.autoBasePlatform) {
    ensureBasePlatform();
  }
  ensureStartPoint();
  renderWorld();
  if (state.editorOptions.autoScrollStart) {
    requestAnimationFrame(scrollToStart);
  }
};

const preloadSprites = async () => {
  const loaded = [];
  const promises = plates.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      spriteMeta[name] = { w: img.naturalWidth, h: img.naturalHeight };
      loaded.push(name);
      resolve();
    };
    img.onerror = resolve;
    img.src = `${plateBase}${name}`;
  }));
  await Promise.all(promises);
  return loaded;
};

const loadPlayerSpriteMeta = () => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    playerSpriteMeta = { w: img.naturalWidth, h: img.naturalHeight };
    playerSpriteMetaReady = true;
    if (state.playerProfile) {
      const normalized = normalizePlayerProfile(state.playerProfile);
      if (normalized) {
        state.playerProfile = normalized;
      }
    }
    normalizeRuntimeStateAgainstAssets();
    updatePlayerProfileStatus();
    renderWorld();
    applyPlayerHitboxToViews();
    resolve();
  };
  img.onerror = () => {
    playerSpriteMetaReady = false;
    resolve();
  };
  img.src = `${sejongBase}${SPRITES.idle}`;
});

const buildPaletteItem = (name, { showRemove = false } = {}) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  const profile = getSpriteProfile(name);
  const hasProfile = !!profile;
  btn.className = 'palette-item' + (selectedSprite === name ? ' active' : '') + (hasProfile ? ' has-preset' : '');
  const label = document.createElement('span');
  label.textContent = getSpriteDisplayLabel(name);
  if (isTextureSprite(name)) {
    const fill = document.createElement('div');
    fill.className = 'palette-texture-preview';
    const textureType = getTextureTypeFromSprite(name);
    const fillStyle = getTextureFillStyle(textureType, normalizeHexColor(els.textureObjectColor?.value));
    fill.style.backgroundImage = fillStyle.image;
    fill.style.backgroundColor = fillStyle.color;
    fill.style.backgroundSize = fillStyle.size;
    fill.style.backgroundRepeat = fillStyle.repeat;
    btn.appendChild(fill);
  } else {
    const img = document.createElement('img');
    img.src = `${plateBase}${name}`;
    btn.appendChild(img);
  }
  if (hasProfile) {
    const badge = document.createElement('em');
    badge.className = 'preset-badge';
    badge.textContent = 'PF';
    btn.appendChild(badge);
  }
  if (showRemove) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preset-remove';
    remove.textContent = '해제';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      delete state.spriteProfiles[name];
      persistSpriteProfiles();
      renderPalette();
      syncProperties();
    });
    btn.appendChild(remove);
  }
  btn.appendChild(label);
  btn.addEventListener('click', () => {
    selectedSprite = name;
    setMode('place');
    renderPalette();
  });
  return btn;
};

const buildGroupPresetPaletteItem = (presetId, preset, { showRemove = true } = {}) => {
  const selectionKey = makeGroupPresetSelectionKey(presetId);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'palette-item' + (selectedSprite === selectionKey ? ' active' : '');
  const first = Array.isArray(preset.objects) ? preset.objects[0] : null;
  if (first?.sprite) {
    if (isTextureSprite(first.sprite)) {
      const fill = document.createElement('div');
      fill.className = 'palette-texture-preview';
      const textureType = getTextureTypeFromSprite(first.sprite);
      const fillStyle = getTextureFillStyle(textureType, first.textureColor);
      fill.style.backgroundImage = fillStyle.image;
      fill.style.backgroundColor = fillStyle.color;
      fill.style.backgroundSize = fillStyle.size;
      fill.style.backgroundRepeat = fillStyle.repeat;
      btn.appendChild(fill);
    } else {
      const img = document.createElement('img');
      img.src = getSpriteSourcePath(first.sprite);
      btn.appendChild(img);
    }
  }
  const badge = document.createElement('em');
  badge.className = 'preset-badge';
  badge.textContent = 'GR';
  btn.appendChild(badge);
  if (showRemove) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preset-remove';
    remove.textContent = '삭제';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      delete state.objectGroupPresets[presetId];
      persistObjectGroupPresetState();
      if (selectedSprite === selectionKey) selectedSprite = null;
      renderPalette();
      syncProperties();
    });
    btn.appendChild(remove);
  }
  const label = document.createElement('span');
  const objectCount = Array.isArray(preset.objects) ? preset.objects.length : 0;
  label.textContent = `${preset.name || presetId} (${objectCount})`;
  btn.appendChild(label);
  btn.addEventListener('click', () => {
    selectedSprite = selectionKey;
    setMode('place');
    renderPalette();
  });
  return btn;
};

const renderPalette = () => {
  if (isGroupPresetSelectionKey(selectedSprite)) {
    const presetId = getGroupPresetIdFromSelectionKey(selectedSprite);
    if (!state.objectGroupPresets?.[presetId]) {
      selectedSprite = null;
    }
  }
  if (els.paletteGrid) els.paletteGrid.innerHTML = '';
  if (els.palettePresets) els.palettePresets.innerHTML = '';
  if (els.paletteGroupPresets) els.paletteGroupPresets.innerHTML = '';
  const query = (els.paletteSearch.value || '').toLowerCase();
  const presetNames = Array.from(
    new Set([
      ...Object.keys(state.spriteProfiles || {}),
      ...Object.keys(state.hitboxPresets || {}),
      ...Object.keys(state.spriteDefaults || {})
    ])
  )
    .filter((name) => !!getSpriteProfile(name))
    .sort((a, b) => a.localeCompare(b, 'en'));
  presetNames
    .filter((name) => name.toLowerCase().includes(query))
    .forEach((name) => {
      const btn = buildPaletteItem(name, { showRemove: true });
      els.palettePresets?.appendChild(btn);
    });
  if (els.palettePresets && !els.palettePresets.children.length) {
    const empty = document.createElement('div');
    empty.className = 'palette-empty';
    empty.textContent = '저장된 프로파일이 없습니다.';
    els.palettePresets.appendChild(empty);
  }
  const groupPresetEntries = Object.entries(state.objectGroupPresets || {})
    .filter(([, preset]) => preset && Array.isArray(preset.objects) && preset.objects.length)
    .sort((a, b) => {
      const an = String(a[1]?.name || a[0]);
      const bn = String(b[1]?.name || b[0]);
      return an.localeCompare(bn, 'ko');
    });
  groupPresetEntries
    .filter(([presetId, preset]) => {
      const searchText = `${presetId} ${preset?.name || ''}`.toLowerCase();
      return searchText.includes(query);
    })
    .forEach(([presetId, preset]) => {
      const btn = buildGroupPresetPaletteItem(presetId, preset);
      els.paletteGroupPresets?.appendChild(btn);
    });
  if (els.paletteGroupPresets && !els.paletteGroupPresets.children.length) {
    const empty = document.createElement('div');
    empty.className = 'palette-empty';
    empty.textContent = '저장된 묶음 프리셋이 없습니다.';
    els.paletteGroupPresets.appendChild(empty);
  }
  plates
    .filter((name) => name.toLowerCase().includes(query))
    .forEach((name) => {
      const btn = buildPaletteItem(name);
      els.paletteGrid?.appendChild(btn);
    });
};

const syncTextureObjectControls = () => {
  if (!els.textureObjectType || !els.textureObjectColor) return;
  const currentType = normalizeTextureType(els.textureObjectType.value);
  els.textureObjectType.value = currentType;
  const showColor = currentType === 'solid';
  els.textureObjectColor.classList.toggle('hidden', !showColor);
  els.textureObjectColor.disabled = !showColor;
  if (showColor) {
    els.textureObjectColor.value = normalizeHexColor(els.textureObjectColor.value);
  }
};

const setMode = (mode) => {
  state.mode = mode;
  els.modeSelect.classList.toggle('is-active', mode === 'select');
  els.modePlace.classList.toggle('is-active', mode === 'place');
  els.modeStart?.classList.toggle('is-active', mode === 'start');
  if (mode !== 'select' && state.flatZoneEdit) {
    state.flatZoneEdit = false;
    flatZoneDrag = null;
    updateFlatZoneControls();
    requestRenderWorld();
  }
};

const updateFlatZoneControls = () => {
  const zoneCount = Array.isArray(state.physics?.flatZones) ? state.physics.flatZones.length : 0;
  if (els.flatZoneEditToggle) {
    els.flatZoneEditToggle.classList.toggle('is-active', !!state.flatZoneEdit);
    els.flatZoneEditToggle.textContent = state.flatZoneEdit
      ? '평면 특수영역 편집 ON'
      : '평면 특수영역 편집 OFF';
  }
  if (els.flatZoneClearAll) {
    els.flatZoneClearAll.disabled = zoneCount === 0;
  }
  if (els.flatZoneStatus) {
    els.flatZoneStatus.textContent = `평면 특수영역 ${zoneCount}개`;
  }
};

const getFlatZoneRectFromDrag = (dragStateRect) => {
  if (!dragStateRect) return null;
  return normalizeFlatZoneRect(
    {
      x: dragStateRect.startX,
      y: dragStateRect.startY,
      w: dragStateRect.currentX - dragStateRect.startX,
      h: dragStateRect.currentY - dragStateRect.startY
    },
    state.map
  );
};

const buildMapFilename = () => {
  const now = new Date();
  const p2 = (value) => String(value).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = p2(now.getMonth() + 1);
  const dd = p2(now.getDate());
  const hh = p2(now.getHours());
  const mi = p2(now.getMinutes());
  const ss = p2(now.getSeconds());
  return `jumpmap-${yyyy}${mm}${dd}-${hh}${mi}${ss}.json`;
};

const applyMapSize = ({ autoScroll = null, preserveViewport = false } = {}) => {
  const prevLeft = els.viewport.scrollLeft;
  const prevTop = els.viewport.scrollTop;
  els.mapWidth.value = state.map.width;
  els.mapHeight.value = state.map.height;
  els.world.style.width = `${state.map.width}px`;
  els.world.style.height = `${state.map.height}px`;
  updateGrid();
  ensureStartPoint();
  state.physics.flatZones = normalizeFlatZones(state.physics?.flatZones, state.map);
  state.savePoints = sanitizeSavePoints(state.savePoints);
  refreshSavePointControls();
  updateFlatZoneControls();
  const shouldAutoScroll = autoScroll == null ? !!state.editorOptions.autoScrollStart : !!autoScroll;
  if (shouldAutoScroll) {
    requestAnimationFrame(scrollToStart);
  } else if (preserveViewport) {
    requestAnimationFrame(() => {
      const maxScrollLeft = Math.max(0, state.map.width - els.viewport.clientWidth);
      const maxScrollTop = Math.max(0, state.map.height - els.viewport.clientHeight);
      els.viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, prevLeft));
      els.viewport.scrollTop = Math.max(0, Math.min(maxScrollTop, prevTop));
      updateMiniMap();
    });
  }
  updateMiniMap();
};

const getTextureUrl = (name) => {
  return resolveTextureUrl(name);
};

const getTextureFillStyle = (textureType, textureColor = DEFAULT_SOLID_TEXTURE_COLOR) => {
  const type = normalizeTextureType(textureType);
  if (type === 'solid') {
    return {
      image: 'none',
      color: normalizeHexColor(textureColor),
      size: 'auto',
      repeat: 'no-repeat'
    };
  }
  return {
    image: `url(${getTextureUrl(type)})`,
    color: 'transparent',
    size: '128px 128px',
    repeat: 'repeat'
  };
};

const getBackgroundLayers = ({ applyOpacityOverlay = true } = {}) => {
  const img = state.background.image || '';
  const texture = state.background.texture || '';
  const normalizedTexture = texture ? normalizeTextureType(texture) : '';
  const imageOpacity = clampNumber(state.background.imageOpacity, 0, 1, 1);
  const layers = [];
  const sizes = [];
  const repeats = [];
  const positions = [];
  if (normalizedTexture && normalizedTexture !== 'solid') {
    layers.push(`url(${getTextureUrl(normalizedTexture)})`);
    sizes.push('256px 256px');
    repeats.push('repeat');
    positions.push('top left');
  }
  if (img) {
    layers.push(`url(${img})`);
    sizes.push('cover');
    repeats.push('no-repeat');
    positions.push('center');
  }
  if (applyOpacityOverlay && layers.length && imageOpacity < 1 - 1e-6) {
    const overlay = 1 - imageOpacity;
    const color = normalizeHexColor(state.background.color || '#ffffff', '#ffffff');
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    layers.unshift(`linear-gradient(rgba(${r}, ${g}, ${b}, ${overlay}), rgba(${r}, ${g}, ${b}, ${overlay}))`);
    sizes.unshift('auto');
    repeats.unshift('no-repeat');
    positions.unshift('center');
  }
  return {
    image: layers.length ? layers.join(', ') : 'none',
    size: layers.length ? sizes.join(', ') : 'auto',
    repeat: layers.length ? repeats.join(', ') : 'no-repeat',
    position: layers.length ? positions.join(', ') : 'center'
  };
};

const applyBackground = () => {
  const color = state.background.color || '#ffffff';
  const layers = getBackgroundLayers();
  els.viewport.style.backgroundColor = color;
  els.viewport.style.backgroundImage = layers.image;
  els.viewport.style.backgroundSize = layers.size;
  els.viewport.style.backgroundRepeat = layers.repeat;
  els.viewport.style.backgroundPosition = layers.position;
};

const updateGrid = () => {
  const size = state.grid.size;
  const show = state.grid.visible;
  if (!show) {
    els.world.style.backgroundImage = 'none';
    return;
  }
  els.world.style.backgroundImage = `
    linear-gradient(to right, rgba(90,63,40,0.22) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(90,63,40,0.22) 1px, transparent 1px),
    linear-gradient(to right, rgba(90,63,40,0.35) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(90,63,40,0.35) 1px, transparent 1px)
  `;
  els.world.style.backgroundSize = `${size}px ${size}px, ${size}px ${size}px, ${size * 5}px ${size * 5}px, ${size * 5}px ${size * 5}px`;
};

const updateMiniMap = () => {
  if (!els.miniMap || !els.miniViewport) return;
  const mapW = state.map.width;
  const mapH = state.map.height;
  const miniRect = els.miniMap.getBoundingClientRect();
  const viewW = els.viewport.clientWidth;
  const viewH = els.viewport.clientHeight;
  if (!miniRect.width || !miniRect.height) return;
  const scaleX = miniRect.width / mapW;
  const scaleY = miniRect.height / mapH;
  const left = els.viewport.scrollLeft * scaleX;
  const top = els.viewport.scrollTop * scaleY;
  els.miniViewport.style.width = `${viewW * scaleX}px`;
  els.miniViewport.style.height = `${viewH * scaleY}px`;
  els.miniViewport.style.transform = `translate(${left}px, ${top}px)`;
  updateMapPosition();
  updateCustomScrollbars();
};

const updateMapPosition = () => {
  if (!els.mapPosition) return;
  const x = Math.round(els.viewport.scrollLeft);
  const y = Math.round(els.viewport.scrollTop);
  els.mapPosition.textContent = `좌상단 x:${x} / y:${y}`;
};

const updateCustomScrollbars = () => {
  if (!els.scrollbarX || !els.scrollbarY || !els.scrollbarXThumb || !els.scrollbarYThumb) return;
  const viewW = els.viewport.clientWidth;
  const viewH = els.viewport.clientHeight;
  const mapW = state.map.width;
  const mapH = state.map.height;

  const trackW = els.scrollbarX.clientWidth;
  const trackH = els.scrollbarY.clientHeight;

  const maxScrollX = Math.max(0, mapW - viewW);
  const maxScrollY = Math.max(0, mapH - viewH);

  const thumbW = Math.max(24, Math.round(trackW * (viewW / mapW)));
  const thumbH = Math.max(24, Math.round(trackH * (viewH / mapH)));

  const maxThumbX = Math.max(0, trackW - thumbW);
  const maxThumbY = Math.max(0, trackH - thumbH);

  const left = maxScrollX ? (els.viewport.scrollLeft / maxScrollX) * maxThumbX : 0;
  const top = maxScrollY ? (els.viewport.scrollTop / maxScrollY) * maxThumbY : 0;

  els.scrollbarXThumb.style.width = `${thumbW}px`;
  els.scrollbarXThumb.style.transform = `translate(${left}px, 0)`;
  els.scrollbarYThumb.style.height = `${thumbH}px`;
  els.scrollbarYThumb.style.transform = `translate(0, ${top}px)`;
};

const updateBackgroundInputs = () => {
  if (els.bgColor) els.bgColor.value = state.background.color || '#ffffff';
  if (els.bgTexture) {
    els.bgTexture.value = state.background.texture ? normalizeTextureType(state.background.texture) : '';
  }
  const opacity = clampNumber(state.background.imageOpacity, 0, 1, 1);
  if (els.bgImageOpacity) els.bgImageOpacity.value = String(opacity);
  if (els.bgImageOpacityInput) els.bgImageOpacityInput.value = String(opacity);
};

const normalizeFlatZoneRect = (zone, map = state.map) => {
  if (!zone || typeof zone !== 'object') return null;
  const mapW = Math.max(1, Math.round(Number(map?.width) || 1));
  const mapH = Math.max(1, Math.round(Number(map?.height) || 1));
  const rawX = Number(zone.x);
  const rawY = Number(zone.y);
  const rawW = Number(zone.w);
  const rawH = Number(zone.h);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawW) || !Number.isFinite(rawH)) {
    return null;
  }
  const x1 = Math.max(0, Math.min(mapW, Math.round(Math.min(rawX, rawX + rawW))));
  const y1 = Math.max(0, Math.min(mapH, Math.round(Math.min(rawY, rawY + rawH))));
  const x2 = Math.max(0, Math.min(mapW, Math.round(Math.max(rawX, rawX + rawW))));
  const y2 = Math.max(0, Math.min(mapH, Math.round(Math.max(rawY, rawY + rawH))));
  const w = x2 - x1;
  const h = y2 - y1;
  if (w < 2 || h < 2) return null;
  return { x: x1, y: y1, w, h };
};

const normalizeFlatZones = (zones = [], map = state.map) => {
  if (!Array.isArray(zones)) return [];
  return zones
    .slice(0, MAX_FLAT_ZONES)
    .map((zone) => normalizeFlatZoneRect(zone, map))
    .filter(Boolean);
};

const normalizePhysicsState = (physics = {}) => {
  const walkableSlopeMaxAngle = Math.max(
    0,
    Math.min(
      90,
      Number.isFinite(Number(physics?.walkableSlopeMaxAngle))
        ? Number(physics.walkableSlopeMaxAngle)
        : DEFAULT_WALKABLE_SLOPE_MAX_ANGLE
    )
  );
  const rawFallStart = Number.isFinite(Number(physics?.slopeFallStartAngle))
    ? Number(physics.slopeFallStartAngle)
    : DEFAULT_SLOPE_FALL_START_ANGLE;
  const slopeFallStartAngle = Math.max(walkableSlopeMaxAngle, Math.min(90, rawFallStart));
  const flatInertiaEnabled = false;
  const flatInertiaPercent = Math.round(clampNumber(
    physics?.flatInertiaPercent,
    0,
    99,
    DEFAULT_FLAT_INERTIA_PERCENT
  ));
  const iceInertiaPercent = Math.round(clampNumber(
    physics?.iceInertiaPercent,
    0,
    99,
    DEFAULT_ICE_INERTIA_PERCENT
  ));
  const iceControlPercent = Math.round(clampNumber(
    physics?.iceControlPercent,
    20,
    100,
    DEFAULT_ICE_CONTROL_PERCENT
  ));
  return {
    fallSpeed: Math.max(0, Number.isFinite(Number(physics?.fallSpeed)) ? Number(physics.fallSpeed) : 600),
    jumpSpeed: Math.max(0, Number.isFinite(Number(physics?.jumpSpeed)) ? Number(physics.jumpSpeed) : 1000),
    jumpHeight: Math.max(0, Number.isFinite(Number(physics?.jumpHeight)) ? Number(physics.jumpHeight) : 240),
    moveSpeed: Math.max(0, Number.isFinite(Number(physics?.moveSpeed)) ? Number(physics.moveSpeed) : 220),
    walkableSlopeMaxAngle: Number(walkableSlopeMaxAngle.toFixed(2)),
    slopeFallStartAngle: Number(slopeFallStartAngle.toFixed(2)),
    slopeSlideEnabled: false,
    flatInertiaEnabled,
    flatInertiaPercent,
    iceSurfaceEnabled: false,
    iceInertiaPercent,
    iceControlPercent,
    slopeSpeedProfile: normalizeSlopeSpeedProfile(physics?.slopeSpeedProfile),
    flatZones: normalizeFlatZones(physics?.flatZones, state.map)
  };
};

const renderSlopeProfileInputs = () => {
  if (!els.slopeProfileList) return;
  const profile = normalizeSlopeSpeedProfile(state.physics?.slopeSpeedProfile);
  state.physics.slopeSpeedProfile = profile;
  const disabledAll = state.physics?.slopeSlideEnabled === false;
  const lastIndex = profile.length - 1;
  const canDelete = profile.length > MIN_SLOPE_PROFILE_ROWS;
  const rowsHtml = profile.map((entry, index) => {
    const startAngle = Number(entry.minAngle) || 0;
    const isLast = index === lastIndex;
    const isFirst = index === 0;
    const angleDisabled = disabledAll || isLast;
    const startDisabled = disabledAll || isFirst;
    const prevMax = index > 0 ? Number(profile[index - 1].maxAngle) || 0 : 0;
    const startMin = isFirst ? 0 : prevMax + 1;
    const startMax = Math.max(startMin, Number(entry.maxAngle) || startMin);
    const endMin = Math.max(startAngle, 0);
    const endMax = isLast ? 90 : 89;
    const factorDisabled = disabledAll;
    const upPercent = Math.round((Number(entry.up) || 0) * 100);
    const downPercent = Math.round((Number(entry.down) || 0) * 100);
    return `
      <div class="slope-profile-row">
        <span class="slope-label slope-range">
          <input type="number" data-slope-index="${index}" data-slope-field="startAngle" min="${startMin}" max="${startMax}" step="1" value="${startAngle}" ${startDisabled ? 'disabled' : ''} />
          <span>~</span>
          <input type="number" data-slope-index="${index}" data-slope-field="maxAngle" min="${endMin}" max="${endMax}" step="1" value="${entry.maxAngle}" ${angleDisabled ? 'disabled' : ''} />
          <span>&deg;</span>
        </span>
        <input type="number" data-slope-index="${index}" data-slope-field="up" min="20" max="200" step="1" value="${upPercent}" ${factorDisabled ? 'disabled' : ''} title="오르막 이동 배율(%)" aria-label="오르막 이동 배율(%)" />
        <input type="number" data-slope-index="${index}" data-slope-field="down" min="20" max="200" step="1" value="${downPercent}" ${factorDisabled ? 'disabled' : ''} title="내리막 이동 배율(%)" aria-label="내리막 이동 배율(%)" />
        <button class="secondary slope-remove-btn" data-slope-action="delete" data-slope-index="${index}" type="button" ${disabledAll || !canDelete ? 'disabled' : ''}>삭제</button>
      </div>
    `;
  }).join('');
  els.slopeProfileList.innerHTML = `
    <div class="slope-profile-head">
      <span>각도 구간</span>
      <span>오르막(%)</span>
      <span>내리막(%)</span>
      <span></span>
    </div>
    ${rowsHtml}
  `;
};

const addSlopeProfileRow = () => {
  const profile = normalizeSlopeSpeedProfile(state.physics?.slopeSpeedProfile);
  if (profile.length >= MAX_SLOPE_PROFILE_ROWS) return;
  let splitIndex = -1;
  let largestSpan = -1;
  profile.forEach((entry, index) => {
    const span = (Number(entry.maxAngle) || 0) - (Number(entry.minAngle) || 0);
    if (span > largestSpan) {
      largestSpan = span;
      splitIndex = index;
    }
  });
  if (splitIndex < 0 || largestSpan < 1) return;
  const next = profile.map((entry) => ({ ...entry }));
  const target = next[splitIndex];
  const mid = Math.floor((target.minAngle + target.maxAngle) / 2);
  const insert = {
    minAngle: mid + 1,
    maxAngle: target.maxAngle,
    up: target.up,
    down: target.down
  };
  target.maxAngle = mid;
  next.splice(splitIndex + 1, 0, insert);
  state.physics.slopeSpeedProfile = normalizeSlopeSpeedProfile(next);
  renderSlopeProfileInputs();
};

const removeSlopeProfileRow = (index) => {
  const profile = normalizeSlopeSpeedProfile(state.physics?.slopeSpeedProfile);
  if (profile.length <= MIN_SLOPE_PROFILE_ROWS) return;
  if (!Number.isInteger(index) || index < 0 || index >= profile.length) return;
  const next = profile.map((entry) => ({ ...entry }));
  if (index > 0) {
    next[index - 1].maxAngle = next[index].maxAngle;
  } else if (next.length > 1) {
    next[1].minAngle = next[0].minAngle;
  }
  next.splice(index, 1);
  state.physics.slopeSpeedProfile = normalizeSlopeSpeedProfile(next);
  renderSlopeProfileInputs();
};

const syncPhysicsInputs = () => {
  state.physics = normalizePhysicsState(state.physics);
  if (els.gravity) els.gravity.value = state.physics.fallSpeed;
  if (els.maxFallSpeed) els.maxFallSpeed.value = state.physics.jumpHeight;
  if (els.jumpSpeed) els.jumpSpeed.value = state.physics.jumpSpeed;
  if (els.moveSpeed) els.moveSpeed.value = state.physics.moveSpeed;
  if (els.walkableSlopeMaxAngle) els.walkableSlopeMaxAngle.value = state.physics.walkableSlopeMaxAngle;
  if (els.slopeFallStartAngle) els.slopeFallStartAngle.value = state.physics.slopeFallStartAngle;
  if (els.slopeSlideEnabled) {
    els.slopeSlideEnabled.checked = false;
    els.slopeSlideEnabled.disabled = true;
    els.slopeSlideEnabled.title = '미끄러짐 효과는 현재 비활성화되어 있습니다.';
  }
  if (els.flatInertiaEnabled) {
    els.flatInertiaEnabled.checked = false;
    els.flatInertiaEnabled.disabled = true;
    els.flatInertiaEnabled.title = '관성 효과는 현재 비활성화되어 있습니다.';
  }
  if (els.flatInertiaPercent) {
    els.flatInertiaPercent.value = String(Math.round(clampNumber(
      state.physics.flatInertiaPercent,
      0,
      99,
      DEFAULT_FLAT_INERTIA_PERCENT
    )));
    els.flatInertiaPercent.disabled = true;
    els.flatInertiaPercent.title = '관성 효과 비활성화로 사용되지 않습니다.';
  }
  renderSlopeProfileInputs();
  updateFlatZoneControls();
  updateJumpStats();
};

const updateJumpStats = () => {
  const fallSpeed = state.physics.fallSpeed;
  const jumpSpeed = state.physics.jumpSpeed;
  const jumpHeight = state.physics.jumpHeight;
  const ascent = jumpSpeed > 0 ? jumpHeight / jumpSpeed : 0;
  const descent = fallSpeed > 0 ? jumpHeight / fallSpeed : 0;
  const airtime = ascent + descent;
  if (els.jumpAirtime) els.jumpAirtime.textContent = `${airtime.toFixed(2)}초`;
  if (els.jumpAscent) els.jumpAscent.textContent = `${ascent.toFixed(2)}초`;
  if (els.jumpDescent) els.jumpDescent.textContent = `${descent.toFixed(2)}초`;
  if (els.jumpHeightDisplay) els.jumpHeightDisplay.textContent = `${Math.round(jumpHeight)}px`;
};

const clampCameraBias = (value) => {
  const next = Number(value);
  if (!Number.isFinite(next)) return state.camera.yBias;
  return Math.max(0.1, Math.min(0.9, next));
};

const syncCameraInputs = () => {
  if (!state.camera || typeof state.camera !== 'object') {
    state.camera = { yBias: 0.46, smooth: 0.18 };
  }
  state.camera.yBias = Number(clampCameraBias(state.camera.yBias).toFixed(2));
  if (els.cameraYBias) els.cameraYBias.value = state.camera.yBias.toFixed(2);
  if (els.cameraYBiasInput) els.cameraYBiasInput.value = state.camera.yBias.toFixed(2);
  if (els.cameraYBiasLabel) els.cameraYBiasLabel.textContent = state.camera.yBias.toFixed(2);
};

const syncEditorOptionsInputs = () => {
  if (els.optAutoBase) els.optAutoBase.checked = !!state.editorOptions.autoBasePlatform;
  if (els.optAutoScroll) els.optAutoScroll.checked = !!state.editorOptions.autoScrollStart;
  if (els.optAutoSelect) els.optAutoSelect.checked = !!state.editorOptions.autoSelectAfterPlace;
};

const ensureStartPoint = () => {
  const grid = state.grid?.size || 32;
  if (!state.startPoint) {
    state.startPoint = {
      x: grid,
      y: Math.max(grid * 2, state.map.height - grid * 2)
    };
  }
  state.startPoint.x = Math.max(0, Math.min(state.map.width, state.startPoint.x));
  state.startPoint.y = Math.max(0, Math.min(state.map.height, state.startPoint.y));
};

const normalizeSavePointName = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return value.trim().replace(/\s+/g, ' ').slice(0, SAVE_POINT_NAME_MAX);
};

const sanitizeSavePoints = (input = state.savePoints) => {
  const next = [];
  if (!Array.isArray(input)) return next;
  input.slice(0, MAX_SAVE_POINT_COUNT).forEach((point, index) => {
    if (!point || typeof point !== 'object') return;
    const id = typeof point.id === 'string' && point.id.trim()
      ? point.id.trim()
      : `sp_${Date.now()}_${index}`;
    const x = Math.max(0, Math.min(state.map.width, Math.round(Number(point.x) || 0)));
    const y = Math.max(0, Math.min(state.map.height, Math.round(Number(point.y) || 0)));
    const fallback = `세이브포인트 ${index + 1}`;
    const name = normalizeSavePointName(point.name, fallback) || fallback;
    next.push({ id, name, x, y });
  });
  return next;
};

const getSavePointById = (id) =>
  (state.savePoints || []).find((point) => point.id === id) || null;

const setStartPointFromSavePoint = (id, { withHistory = true, autoScroll = true } = {}) => {
  const point = getSavePointById(id);
  if (!point) return false;
  if (withHistory) pushHistory();
  state.startPoint = {
    x: Math.max(0, Math.min(state.map.width, Math.round(Number(point.x) || 0))),
    y: Math.max(0, Math.min(state.map.height, Math.round(Number(point.y) || 0)))
  };
  renderWorld();
  syncProperties();
  if (autoScroll && state.editorOptions.autoScrollStart) {
    scrollToStart();
  }
  return true;
};

const refreshSavePointControls = ({ preserveSelection = true } = {}) => {
  state.savePoints = sanitizeSavePoints(state.savePoints);
  const saveSelect = els.savePointSelect;
  const testSelect = els.testSavePointSelect;
  const prevSaveValue = preserveSelection ? saveSelect?.value : '';
  const prevTestValue = preserveSelection ? testSelect?.value : '';
  const buildOptions = (selectEl, includeStart) => {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (includeStart) {
      const startOpt = document.createElement('option');
      startOpt.value = '';
      startOpt.textContent = '시작 지점';
      selectEl.appendChild(startOpt);
    }
    if (!state.savePoints.length && !includeStart) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '세이브포인트 없음';
      selectEl.appendChild(empty);
      return;
    }
    state.savePoints.forEach((point, index) => {
      const option = document.createElement('option');
      option.value = point.id;
      option.textContent = `${point.name || `세이브포인트 ${index + 1}`} (${Math.round(point.x)}, ${Math.round(point.y)})`;
      selectEl.appendChild(option);
    });
  };
  buildOptions(saveSelect, false);
  buildOptions(testSelect, true);

  const hasSavePoints = state.savePoints.length > 0;
  if (saveSelect) {
    const nextValue = hasSavePoints && state.savePoints.some((point) => point.id === prevSaveValue)
      ? prevSaveValue
      : (hasSavePoints ? state.savePoints[0].id : '');
    saveSelect.value = nextValue;
  }
  if (testSelect) {
    const hasPrev = state.savePoints.some((point) => point.id === prevTestValue);
    testSelect.value = hasPrev ? prevTestValue : '';
  }
  if (els.savePointGo) els.savePointGo.disabled = !hasSavePoints;
  if (els.savePointSetStart) els.savePointSetStart.disabled = !hasSavePoints;
  if (els.savePointDelete) els.savePointDelete.disabled = !hasSavePoints;
  if (els.testSavePointUseStart) els.testSavePointUseStart.disabled = !hasSavePoints;
  if (els.testSavePointWarp) els.testSavePointWarp.disabled = !hasSavePoints;
};

const addSavePointAt = (point, nameInput = '') => {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const id = `sp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const defaultName = `세이브포인트 ${state.savePoints.length + 1}`;
  const name = normalizeSavePointName(nameInput, defaultName) || defaultName;
  state.savePoints.push({
    id,
    name,
    x: Math.max(0, Math.min(state.map.width, Math.round(point.x))),
    y: Math.max(0, Math.min(state.map.height, Math.round(point.y)))
  });
  state.savePoints = sanitizeSavePoints(state.savePoints);
  refreshSavePointControls({ preserveSelection: false });
  if (els.savePointSelect) els.savePointSelect.value = id;
  if (els.testSavePointSelect) els.testSavePointSelect.value = id;
  if (els.savePointName) els.savePointName.value = '';
  return id;
};

const ensureBasePlatform = () => {
  if (state.objects.length || !plates.length) return;
  const sprite = plates.includes('plate_A.png') ? 'plate_A.png' : plates[0];
  const profile = getSpriteProfile(sprite);
  const meta = getSpriteMetaSize(sprite, { w: 400, h: 120 });
  const crop = profile?.crop || null;
  const scale = profile?.scale ?? state.spriteDefaults[sprite]?.scale ?? 0.55;
  const width = (crop?.w || meta.w) * scale;
  const height = (crop?.h || meta.h) * scale;
  const grid = state.grid?.size || 32;
  const x = Math.max(0, grid);
  const y = Math.max(0, Math.round(state.map.height - height - grid * 2));
  const obj = {
    id: `obj_base_${Date.now()}`,
    sprite,
    x,
    y,
    scale,
    crop: crop ? cloneCrop(crop) : null,
    rotation: 0,
    flipH: false,
    flipV: false,
    hitboxes: getPresetHitboxes(sprite) || [createDefaultHitbox(sprite)]
  };
  state.objects.push(obj);
  const startX = x + Math.min(width * 0.25, grid * 2);
  state.startPoint = { x: startX, y };
};

const scrollViewportToPoint = (point, yBias = 0.75) => {
  if (!point) return;
  const viewW = els.viewport.clientWidth || 0;
  const viewH = els.viewport.clientHeight || 0;
  const targetX = point.x - viewW / 2;
  const targetY = point.y - viewH * yBias;
  els.viewport.scrollLeft = Math.max(0, Math.min(state.map.width - viewW, targetX));
  els.viewport.scrollTop = Math.max(0, Math.min(state.map.height - viewH, targetY));
  updateMiniMap();
};

const scrollToStart = () => {
  if (!state.startPoint) return;
  scrollViewportToPoint(state.startPoint, 0.75);
};

const syncPlayerHitboxInputs = () => {
  if (!els.playerBoxW || !els.playerBoxH || !els.playerFootInset) return;
  els.playerBoxW.value = state.playerHitbox.width;
  els.playerBoxH.value = state.playerHitbox.height;
  els.playerFootInset.value = state.playerHitbox.footInset;
  if (els.playerScale) els.playerScale.value = state.playerScale;
};

const getPlayerMetrics = () => {
  const scale = state.playerScale || 1;
  return {
    scale,
    width: Math.max(10, state.playerHitbox.width * scale),
    height: Math.max(10, state.playerHitbox.height * scale),
    footInset: Math.max(0, state.playerHitbox.footInset * scale)
  };
};

const getPlayerHitboxOffset = () => ({
  x: state.playerHitboxOffset?.x || 0,
  y: state.playerHitboxOffset?.y || 0
});

const normalizePlayerHitboxPolygon = (polygon) => {
  if (!polygon || typeof polygon !== 'object') return null;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(polygon.points) : polygon.points) || null;
  if (!points || points.length < 3) return null;
  return {
    points: points.map((point) => ({
      x: Math.max(0, Math.min(1, Number(point.x) || 0)),
      y: Math.max(0, Math.min(1, Number(point.y) || 0))
    }))
  };
};

const getPlayerHitboxPolygon = () => normalizePlayerHitboxPolygon(state.playerHitboxPolygon);

const getPlayerPointToolState = () => {
  if (!state.playerHitboxPointTool || typeof state.playerHitboxPointTool !== 'object') {
    state.playerHitboxPointTool = { active: false, points: [] };
  }
  if (!Array.isArray(state.playerHitboxPointTool.points)) {
    state.playerHitboxPointTool.points = [];
  }
  return state.playerHitboxPointTool;
};

const getPlayerHitboxWorldRect = () => {
  ensureStartPoint();
  const metrics = getPlayerMetrics();
  const offset = getPlayerHitboxOffset();
  const baseLeft = state.startPoint.x - metrics.width / 2;
  const baseTop = state.startPoint.y - metrics.height;
  return {
    left: baseLeft + offset.x,
    top: baseTop + offset.y,
    width: metrics.width,
    height: metrics.height,
    scale: metrics.scale
  };
};

const addPlayerPointHitboxPoint = (worldX, worldY) => {
  const tool = getPlayerPointToolState();
  if (!tool.active) return false;
  if (state.selectedSpecial !== 'player') return false;
  const rect = getPlayerHitboxWorldRect();
  const lx = Math.max(0, Math.min(rect.width, worldX - rect.left));
  const ly = Math.max(0, Math.min(rect.height, worldY - rect.top));
  const point = { x: Math.round(lx), y: Math.round(ly) };
  const last = tool.points[tool.points.length - 1];
  if (last && Math.abs(last.x - point.x) < 1 && Math.abs(last.y - point.y) < 1) return false;
  tool.points.push(point);
  return true;
};

const clearPlayerPointHitbox = () => {
  const tool = getPlayerPointToolState();
  tool.points = [];
};

const applyPlayerPointHitbox = () => {
  const tool = getPlayerPointToolState();
  if (!tool.active || tool.points.length < 3) return false;
  const rect = getPlayerHitboxWorldRect();
  const pointsWorld = tool.points.map((point) => ({
    x: rect.left + (Number(point?.x) || 0),
    y: rect.top + (Number(point?.y) || 0)
  }));
  const xs = tool.points.map((point) => Number(point.x) || 0);
  const ys = tool.points.map((point) => Number(point.y) || 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const worldW = Math.max(20 * rect.scale, Math.round(maxX - minX));
  const worldH = Math.max(20 * rect.scale, Math.round(maxY - minY));
  const currentOffset = getPlayerHitboxOffset();
  const nextOffsetX = currentOffset.x + minX + (rect.width - worldW) / 2;
  const nextOffsetY = currentOffset.y + minY + (rect.height - worldH);
  const nextRawW = Math.max(20, Math.round(worldW / rect.scale));
  const nextRawH = Math.max(20, Math.round(worldH / rect.scale));
  const nextScale = rect.scale;
  const nextBaseLeft = state.startPoint.x - (nextRawW * nextScale) / 2;
  const nextBaseTop = state.startPoint.y - nextRawH * nextScale;
  const nextLeft = nextBaseLeft + Math.round(nextOffsetX);
  const nextTop = nextBaseTop + Math.round(nextOffsetY);
  const nextWorldW = Math.max(1, nextRawW * nextScale);
  const nextWorldH = Math.max(1, nextRawH * nextScale);
  const nextPolygon = normalizePlayerHitboxPolygon({
    points: pointsWorld.map((point) => ({
      x: (point.x - nextLeft) / nextWorldW,
      y: (point.y - nextTop) / nextWorldH
    }))
  });

  pushHistory();
  state.playerHitboxOffset = {
    x: Math.round(nextOffsetX),
    y: Math.round(nextOffsetY)
  };
  state.playerHitbox.width = nextRawW;
  state.playerHitbox.height = nextRawH;
  state.playerHitboxPolygon = nextPolygon;
  state.playerHitbox.footInset = Math.min(
    state.playerHitbox.footInset,
    Math.max(0, nextRawW / 2 - 1)
  );
  tool.active = false;
  tool.points = [];
  syncPlayerHitboxInputs();
  applyPlayerHitboxToViews();
  return true;
};

const clampPlayerCrop = (crop) => {
  const meta = playerSpriteMeta || { w: 80, h: 120 };
  const x = Math.max(0, Math.min(meta.w - 1, crop.x));
  const y = Math.max(0, Math.min(meta.h - 1, crop.y));
  const w = Math.max(1, Math.min(meta.w - x, crop.w));
  const h = Math.max(1, Math.min(meta.h - y, crop.h));
  return { x, y, w, h };
};

const normalizePlayerProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return null;
  const rawHitbox = profile.playerHitbox || {};
  const width = Math.max(20, Math.round(Number(rawHitbox.width) || state.playerHitbox.width || PLAYER_W));
  const height = Math.max(20, Math.round(Number(rawHitbox.height) || state.playerHitbox.height || PLAYER_H));
  const footInset = Math.max(0, Math.min(width / 2 - 1, Math.round(Number(rawHitbox.footInset) || state.playerHitbox.footInset || FOOT_INSET)));
  const rawOffset = profile.playerHitboxOffset || {};
  const offsetX = Math.round(Number(rawOffset.x) || 0);
  const offsetY = Math.round(Number(rawOffset.y) || 0);
  const scaleRaw = Number(profile.playerScale);
  const scale = Math.max(0.2, Math.min(3, Number.isFinite(scaleRaw) ? scaleRaw : 1));
  const crop = profile.playerCrop ? clampPlayerCrop(cloneCrop(profile.playerCrop)) : null;
  const playerHitboxPolygon = normalizePlayerHitboxPolygon(profile.playerHitboxPolygon);
  return {
    playerHitbox: { width, height, footInset },
    playerHitboxOffset: { x: offsetX, y: offsetY },
    playerHitboxPolygon,
    playerScale: Number(scale.toFixed(3)),
    playerCrop: crop
  };
};

const loadPlayerProfile = () => {
  try {
    const raw = localStorage.getItem(PLAYER_PROFILE_KEY);
    if (!raw) {
      state.playerProfile = null;
      return;
    }
    state.playerProfile = normalizePlayerProfile(JSON.parse(raw));
  } catch {
    state.playerProfile = null;
  }
};

const savePlayerProfile = (profile) => {
  const normalized = normalizePlayerProfile(profile);
  state.playerProfile = normalized;
  try {
    if (!normalized) {
      localStorage.removeItem(PLAYER_PROFILE_KEY);
    } else {
      localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // ignore
  }
  updatePlayerProfileStatus();
};

const buildCurrentPlayerProfile = () => normalizePlayerProfile({
  playerHitbox: state.playerHitbox,
  playerHitboxOffset: state.playerHitboxOffset,
  playerHitboxPolygon: state.playerHitboxPolygon,
  playerScale: state.playerScale,
  playerCrop: state.playerCrop
});

const applyPlayerProfile = (profile, { withHistory = false } = {}) => {
  const normalized = normalizePlayerProfile(profile);
  if (!normalized) return;
  if (withHistory) pushHistory();
  state.playerHitbox = { ...normalized.playerHitbox };
  state.playerHitboxOffset = { ...normalized.playerHitboxOffset };
  state.playerHitboxPolygon = normalized.playerHitboxPolygon
    ? { points: normalized.playerHitboxPolygon.points.map((point) => ({ ...point })) }
    : null;
  state.playerScale = normalized.playerScale;
  state.playerCrop = normalized.playerCrop ? cloneCrop(normalized.playerCrop) : null;
  syncPlayerHitboxInputs();
  applyPlayerHitboxToViews();
  renderWorld();
  syncProperties();
};

const updatePlayerProfileStatus = () => {
  if (!els.playerProfileStatus) return;
  const has = !!state.playerProfile;
  if (els.applyPlayerProfile) els.applyPlayerProfile.disabled = !has;
  if (els.clearPlayerProfile) els.clearPlayerProfile.disabled = !has;
  if (!has) {
    els.playerProfileStatus.textContent = '저장된 프로파일 없음';
    return;
  }
  const p = state.playerProfile;
  const cropText = p.playerCrop ? `crop(${p.playerCrop.w}x${p.playerCrop.h})` : 'crop 없음';
  els.playerProfileStatus.textContent = `저장됨: scale ${p.playerScale}, hitbox ${p.playerHitbox.width}x${p.playerHitbox.height}, ${cropText}`;
};

const getPlayerCrop = () => {
  const meta = playerSpriteMeta || { w: 80, h: 120 };
  if (!state.playerCrop) {
    return { x: 0, y: 0, w: meta.w, h: meta.h };
  }
  return clampPlayerCrop(state.playerCrop);
};

const getFullPlayerCrop = () => {
  const meta = playerSpriteMeta || { w: 80, h: 120 };
  return { x: 0, y: 0, w: meta.w, h: meta.h };
};

const getPlayerSpriteRender = () => {
  const meta = playerSpriteMeta || { w: 80, h: 120 };
  const crop = getPlayerCrop();
  const scale = state.playerScale || 1;
  const spriteW = crop.w * scale;
  const spriteH = crop.h * scale;
  const hit = getPlayerMetrics();
  // Keep player sprite anchor in full-frame space so crop ON/OFF uses the same world reference.
  const offsetX = hit.width / 2 - (meta.w * scale) / 2 + crop.x * scale;
  const offsetY = hit.height - meta.h * scale + crop.y * scale;
  return { meta, crop, scale, spriteW, spriteH, offsetX, offsetY };
};

const applyPlayerSpriteToElement = (container, img) => {
  const { meta, crop, scale, spriteW, spriteH } = getPlayerSpriteRender();
  container.style.width = `${spriteW}px`;
  container.style.height = `${spriteH}px`;
  container.style.overflow = state.playerCrop ? 'hidden' : 'visible';
  img.style.position = 'absolute';
  img.style.width = `${meta.w * scale}px`;
  img.style.height = `${meta.h * scale}px`;
  img.style.left = `${-crop.x * scale}px`;
  img.style.top = `${-crop.y * scale}px`;
};

const applyPlayerHitboxToViews = () => {
  if (!state.test.active) return;
  const views = els.testViews._views || [];
  const metrics = getPlayerMetrics();
  views.forEach((playerView) => {
    if (Array.isArray(playerView.players) && playerView.players.length) {
      playerView.players.forEach((entry) => {
        if (!entry?.player || !entry?.img) return;
        applyPlayerSpriteToElement(entry.player, entry.img);
      });
    } else if (playerView.player && playerView.img) {
      // Backward compatibility for older test view shape.
      applyPlayerSpriteToElement(playerView.player, playerView.img);
    }
    playerView.state.x = Math.max(0, Math.min(state.map.width - metrics.width, playerView.state.x));
    playerView.state.y = Math.max(0, Math.min(state.map.height - metrics.height, playerView.state.y));
  });
};

const clampPlayerSettings = () => {
  const w = Math.max(20, Number(els.playerBoxW.value) || PLAYER_W);
  const h = Math.max(20, Number(els.playerBoxH.value) || PLAYER_H);
  const inset = Math.max(0, Math.min(w / 2 - 1, Number(els.playerFootInset.value) || FOOT_INSET));
  const scale = Math.max(0.2, Math.min(3, Number(els.playerScale?.value) || 1));
  state.playerHitbox.width = Math.round(w);
  state.playerHitbox.height = Math.round(h);
  state.playerHitbox.footInset = Math.round(inset);
  state.playerScale = Number(scale.toFixed(2));
  syncPlayerHitboxInputs();
  applyPlayerHitboxToViews();
  renderWorld();
};

const snapValue = (val) => {
  if (!state.grid.snap) return val;
  const size = state.grid.size;
  return Math.round(val / size) * size;
};

const localDeltaToWorld = (obj, dx, dy) => {
  const scaleX = (obj.flipH ? -1 : 1) * obj.scale;
  const scaleY = (obj.flipV ? -1 : 1) * obj.scale;
  const sx = dx * scaleX;
  const sy = dy * scaleY;
  const rad = (obj.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: sx * cos - sy * sin,
    y: sx * sin + sy * cos
  };
};

const getObjectCenterWorld = (obj, localCenterX, localCenterY) => {
  const delta = localDeltaToWorld(obj, localCenterX, localCenterY);
  return {
    x: obj.x + delta.x,
    y: obj.y + delta.y
  };
};

const setObjectPositionFromCenter = (obj, localCenterX, localCenterY, centerWorldX, centerWorldY) => {
  const delta = localDeltaToWorld(obj, localCenterX, localCenterY);
  obj.x = centerWorldX - delta.x;
  obj.y = centerWorldY - delta.y;
};

const restoreViewportScroll = (left, top) => {
  if (!els.viewport) return;
  const maxX = Math.max(0, state.map.width - els.viewport.clientWidth);
  const maxY = Math.max(0, state.map.height - els.viewport.clientHeight);
  els.viewport.scrollLeft = Math.max(0, Math.min(maxX, left));
  els.viewport.scrollTop = Math.max(0, Math.min(maxY, top));
  updateMiniMap();
};

const safeSetPointerCapture = (el, pointerId) => {
  if (!el || pointerId == null) return;
  if (typeof el.setPointerCapture !== 'function') return;
  if (!el.isConnected) return;
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // ignore capture errors from detached/re-rendered nodes
  }
};

const clampWorkbenchPaintTool = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'poly') return 'poly';
  if (normalized === 'parallelogram') return 'parallelogram';
  return 'poly';
};

const clearWorkbenchPaintPoints = () => {
  workbenchState.paint.points = [];
};

const clearWorkbenchInsertSelection = () => {
  workbenchState.paint.insertSelection = [];
  workbenchState.paint.insertSelectionHitboxIndex = null;
};

const clearWorkbenchEdgeSelection = () => {
  workbenchState.paint.selectedEdgeIndex = null;
  workbenchState.paint.selectedEdgeHitboxIndex = null;
};

const setWorkbenchEdgeSlipFeedback = (text = '', durationMs = 1800) => {
  workbenchState.paint.edgeSlipFeedbackText = String(text || '');
  workbenchState.paint.edgeSlipFeedbackUntil = workbenchState.paint.edgeSlipFeedbackText
    ? (Date.now() + Math.max(200, Number(durationMs) || 1800))
    : 0;
};

const normalizePolygonEdgeSlipForHitbox = (hitbox) => {
  if (!isPolygonHitbox(hitbox)) return null;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hitbox.points) : hitbox.points) || hitbox.points;
  if (!Array.isArray(points) || points.length < 3) return null;
  return normalizePolygonEdgeSlip ? normalizePolygonEdgeSlip(hitbox.edgeSlip, points.length) : null;
};

const isPolygonEdgeSlipEnabled = (hitbox, edgeIndex) => {
  if (!isPolygonHitbox(hitbox)) return true;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hitbox.points) : hitbox.points) || hitbox.points;
  if (!Array.isArray(points) || points.length < 3) return true;
  const safeEdge = Math.max(0, Math.min(points.length - 1, Number(edgeIndex) || 0));
  const edgeSlip = normalizePolygonEdgeSlipForHitbox(hitbox);
  if (!edgeSlip) return true;
  return edgeSlip[safeEdge] !== false;
};

const setPolygonEdgeSlipEnabled = (hitbox, edgeIndex, enabled) => {
  if (!isPolygonHitbox(hitbox)) return false;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hitbox.points) : hitbox.points) || hitbox.points;
  if (!Array.isArray(points) || points.length < 3) return false;
  const safeEdge = Math.max(0, Math.min(points.length - 1, Number(edgeIndex) || 0));
  const current = normalizePolygonEdgeSlipForHitbox(hitbox) || new Array(points.length).fill(true);
  const nextEnabled = enabled !== false;
  if (current[safeEdge] === nextEnabled) return false;
  const next = [...current];
  next[safeEdge] = nextEnabled;
  hitbox.edgeSlip = next;
  return true;
};

const normalizeInsertPointSelection = (indices, pointCount) => {
  if (!Array.isArray(indices)) return [];
  const max = Math.max(0, Number(pointCount) || 0);
  return Array.from(
    new Set(
      indices
        .map((idx) => Number(idx))
        .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < max)
    )
  ).slice(0, 2);
};

const toggleWorkbenchInsertPointSelection = (hitboxIndex, pointIndex, pointCount) => {
  if (!Number.isInteger(pointIndex)) return;
  const currentHitbox = workbenchState.paint.insertSelectionHitboxIndex;
  if (currentHitbox !== hitboxIndex) {
    workbenchState.paint.insertSelectionHitboxIndex = hitboxIndex;
    workbenchState.paint.insertSelection = [pointIndex];
    return;
  }
  const selected = normalizeInsertPointSelection(workbenchState.paint.insertSelection, pointCount);
  const exists = selected.includes(pointIndex);
  if (selected.length === 0) {
    workbenchState.paint.insertSelection = [pointIndex];
    return;
  }
  if (selected.length === 1) {
    if (exists) {
      workbenchState.paint.insertSelection = [];
    } else {
      workbenchState.paint.insertSelection = [selected[0], pointIndex];
    }
    return;
  }
  if (exists) {
    workbenchState.paint.insertSelection = selected.filter((idx) => idx !== pointIndex);
    return;
  }
  // Third click starts a new pair selection from clicked point.
  workbenchState.paint.insertSelection = [pointIndex];
};

const getAdjacentPolygonEdgeFromSelection = (pointCount, selection) => {
  const safeCount = Math.max(0, Number(pointCount) || 0);
  if (safeCount < 3) return null;
  const selected = normalizeInsertPointSelection(selection, safeCount);
  if (selected.length !== 2) return null;
  const a = selected[0];
  const b = selected[1];
  if (Math.abs(a - b) === 1) {
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    return { from, to, insertAt: to };
  }
  if ((a === 0 && b === safeCount - 1) || (b === 0 && a === safeCount - 1)) {
    const from = safeCount - 1;
    const to = 0;
    return { from, to, insertAt: safeCount };
  }
  return null;
};

const resetWorkbenchPaintMask = () => {
  clearWorkbenchPaintPoints();
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
};

const getWorkbenchPaintBounds = (selected, width, height) => {
  const fallback = {
    minX: 0,
    minY: 0,
    maxX: Math.max(1, Math.round(Number(width) || 1)),
    maxY: Math.max(1, Math.round(Number(height) || 1))
  };
  if (!selected?.crop) return fallback;
  const crop = getObjectCrop(selected);
  const minX = Math.max(0, Math.floor(crop.x));
  const minY = Math.max(0, Math.floor(crop.y));
  const maxX = Math.min(fallback.maxX, Math.ceil(crop.x + crop.w));
  const maxY = Math.min(fallback.maxY, Math.ceil(crop.y + crop.h));
  return {
    minX: Math.min(minX, maxX - 1),
    minY: Math.min(minY, maxY - 1),
    maxX: Math.max(minX + 1, maxX),
    maxY: Math.max(minY + 1, maxY)
  };
};

const clampWorkbenchPointToBounds = (point, bounds) => {
  if (!point || !bounds) return null;
  const x = Math.max(bounds.minX, Math.min(bounds.maxX - 0.001, Number(point.x) || 0));
  const y = Math.max(bounds.minY, Math.min(bounds.maxY - 0.001, Number(point.y) || 0));
  return { x, y };
};

const rasterizePolygonMask = (width, height, points) => {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  if (!Array.isArray(points) || points.length < 3) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  return ctx.getImageData(0, 0, w, h);
};

const maskToMergedHitboxes = (width, height, imageData, bounds = null) => {
  if (!imageData?.data) return [];
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const alpha = imageData.data;
  const isFilled = (x, y) => {
    if (bounds && (x < bounds.minX || x >= bounds.maxX || y < bounds.minY || y >= bounds.maxY)) {
      return false;
    }
    return !!alpha[(y * w + x) * 4 + 3];
  };
  const filled = new Uint8Array(w * h);
  let filledCount = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!isFilled(x, y)) continue;
      const idx = y * w + x;
      filled[idx] = 1;
      filledCount += 1;
    }
  }
  if (!filledCount) return [];

  const get = (x, y) => filled[y * w + x] === 1;
  const clearRect = (x, y, rw, rh) => {
    for (let yy = y; yy < y + rh; yy += 1) {
      const base = yy * w;
      for (let xx = x; xx < x + rw; xx += 1) {
        const idx = base + xx;
        if (filled[idx]) {
          filled[idx] = 0;
          filledCount -= 1;
        }
      }
    }
  };

  const rects = [];
  while (filledCount > 0) {
    let anchor = -1;
    for (let idx = 0; idx < filled.length; idx += 1) {
      if (filled[idx]) {
        anchor = idx;
        break;
      }
    }
    if (anchor < 0) break;
    const x0 = anchor % w;
    const y0 = Math.floor(anchor / w);

    let maxWidth = 0;
    while (x0 + maxWidth < w && get(x0 + maxWidth, y0)) maxWidth += 1;
    if (maxWidth <= 0) {
      filled[anchor] = 0;
      filledCount -= 1;
      continue;
    }

    // Greedy exact decomposition: choose the largest-area rectangle
    // anchored at the current top-left filled pixel.
    let bestW = 1;
    let bestH = 1;
    let bestArea = 1;
    for (let trialW = 1; trialW <= maxWidth; trialW += 1) {
      let trialH = 0;
      while (y0 + trialH < h) {
        let rowFilled = true;
        for (let xx = x0; xx < x0 + trialW; xx += 1) {
          if (!get(xx, y0 + trialH)) {
            rowFilled = false;
            break;
          }
        }
        if (!rowFilled) break;
        trialH += 1;
      }
      const area = trialW * trialH;
      if (area > bestArea || (area === bestArea && trialW > bestW)) {
        bestArea = area;
        bestW = trialW;
        bestH = Math.max(1, trialH);
      }
    }

    rects.push({ x: x0, y: y0, w: bestW, h: bestH });
    clearRect(x0, y0, bestW, bestH);
  }

  // Optional lossless coalesce to reduce rectangle count.
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        // Vertical merge (same x-range, touching y)
        if (a.x === b.x && a.w === b.w && (a.y + a.h === b.y || b.y + b.h === a.y)) {
          const y = Math.min(a.y, b.y);
          const hMerged = a.h + b.h;
          rects.splice(j, 1);
          rects[i] = { x: a.x, y, w: a.w, h: hMerged };
          merged = true;
          break outer;
        }
        // Horizontal merge (same y-range, touching x)
        if (a.y === b.y && a.h === b.h && (a.x + a.w === b.x || b.x + b.w === a.x)) {
          const x = Math.min(a.x, b.x);
          const wMerged = a.w + b.w;
          rects.splice(j, 1);
          rects[i] = { x, y: a.y, w: wMerged, h: a.h };
          merged = true;
          break outer;
        }
      }
    }
  }

  return rects;
};

const setAutoAlphaStatus = (message = '', isError = false) => {
  if (!els.autoAlphaStatus) return;
  if (!message) {
    els.autoAlphaStatus.textContent = '';
    els.autoAlphaStatus.classList.add('hidden');
    els.autoAlphaStatus.classList.remove('danger-text');
    return;
  }
  els.autoAlphaStatus.textContent = message;
  els.autoAlphaStatus.classList.toggle('danger-text', !!isError);
  els.autoAlphaStatus.classList.remove('hidden');
};

const loadSpriteImageData = (sprite) =>
  new Promise((resolve, reject) => {
    const source = getSpriteSourcePath(sprite);
    if (!source) {
      reject(new Error('스프라이트 경로를 찾지 못했습니다.'));
      return;
    }
    const cacheKey = `${sprite}::${source}`;
    if (alphaImageDataCache.has(cacheKey)) {
      resolve(alphaImageDataCache.get(cacheKey));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const width = Math.max(1, Math.round(img.naturalWidth || img.width || 1));
      const height = Math.max(1, Math.round(img.naturalHeight || img.height || 1));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('캔버스 컨텍스트를 생성하지 못했습니다.'));
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const payload = { width, height, imageData };
      alphaImageDataCache.set(cacheKey, payload);
      resolve(payload);
    };
    img.onerror = () => reject(new Error('이미지 로딩에 실패했습니다.'));
    img.src = source;
  });

const buildAlphaHitboxesForObject = async (obj, alphaThreshold = 1) => {
  if (!obj || !obj.sprite) return [];
  const payload = await loadSpriteImageData(obj.sprite);
  const width = payload.width;
  const height = payload.height;
  const sourceData = payload.imageData?.data;
  if (!sourceData || !width || !height) return [];

  const threshold = Math.max(0, Math.min(255, Math.round(Number(alphaThreshold) || 0)));
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = width;
  alphaCanvas.height = height;
  const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
  if (!alphaCtx) return [];
  const alphaImage = alphaCtx.createImageData(width, height);
  for (let i = 0; i < sourceData.length; i += 4) {
    const filled = sourceData[i + 3] > threshold;
    alphaImage.data[i + 3] = filled ? 255 : 0;
  }
  const crop = getObjectCrop(obj);
  const minX = Math.max(0, Math.min(width - 1, Math.floor(crop.x)));
  const minY = Math.max(0, Math.min(height - 1, Math.floor(crop.y)));
  const maxX = Math.max(minX + 1, Math.min(width, Math.ceil(crop.x + crop.w)));
  const maxY = Math.max(minY + 1, Math.min(height, Math.ceil(crop.y + crop.h)));
  const bounds = { minX, minY, maxX, maxY };
  const rects = maskToMergedHitboxes(width, height, alphaImage, bounds);
  return rects.map((rect) =>
    clampHitboxToObjectBounds(obj, {
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      rotation: 0,
      locked: false
    })
  );
};

const workbenchLocalToStage = (point, view, zoom, sampleOffsetX = 0, sampleOffsetY = 0) => ({
  x: (Number(point.x) - sampleOffsetX - view.x) * zoom,
  y: (Number(point.y) - sampleOffsetY - view.y) * zoom
});

const renderWorkbenchPointToolOverlay = (
  points,
  view,
  zoom,
  sampleOffsetX = 0,
  sampleOffsetY = 0,
  tool = 'poly'
) => {
  if (!Array.isArray(points) || !points.length) return null;
  const stageW = Math.max(1, Math.round(view.w * zoom));
  const stageH = Math.max(1, Math.round(view.h * zoom));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'wb-shape-overlay');
  svg.setAttribute('width', String(stageW));
  svg.setAttribute('height', String(stageH));
  svg.setAttribute('viewBox', `0 0 ${stageW} ${stageH}`);
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.pointerEvents = 'none';
  const stagePoints = points.map((point) => workbenchLocalToStage(point, view, zoom, sampleOffsetX, sampleOffsetY));
  if (tool === 'poly' && stagePoints.length >= 3) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute(
      'points',
      stagePoints
        .map((point) => `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`)
        .join(' ')
    );
    polygon.setAttribute('fill', 'rgba(59,130,246,0.22)');
    polygon.setAttribute('stroke', 'rgba(37,99,235,0.95)');
    polygon.setAttribute('stroke-width', '2');
    svg.appendChild(polygon);
  } else if (tool === 'poly' && stagePoints.length >= 2) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute(
      'points',
      stagePoints
        .map((point) => `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`)
        .join(' ')
    );
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'rgba(37,99,235,0.95)');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  } else if (tool === 'parallelogram' && stagePoints.length >= 3) {
    const a = stagePoints[0];
    const b = stagePoints[1];
    const c = stagePoints[2];
    const d = { x: a.x + c.x - b.x, y: a.y + c.y - b.y };
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute(
      'points',
      [a, b, c, d]
        .map((point) => `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`)
        .join(' ')
    );
    polygon.setAttribute('fill', 'rgba(16,185,129,0.22)');
    polygon.setAttribute('stroke', 'rgba(5,150,105,0.95)');
    polygon.setAttribute('stroke-width', '2');
    svg.appendChild(polygon);
  } else if (tool === 'parallelogram' && stagePoints.length >= 2) {
    const a = stagePoints[0];
    const b = stagePoints[1];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(b.x));
    line.setAttribute('y2', String(b.y));
    line.setAttribute('stroke', 'rgba(5,150,105,0.95)');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
  }
  stagePoints.forEach((point, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', index === 0 ? '5' : '4');
    circle.setAttribute('fill', index === 0 ? 'rgba(37,99,235,0.95)' : 'rgba(37,99,235,0.8)');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '1.5');
    svg.appendChild(circle);
  });
  return svg;
};

const commitWorkbenchPolygonPoints = (selected, meta) => {
  const points = (workbenchState.paint.points || [])
    .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!selected || !meta || points.length < 3) return false;
  const bounds = getWorkbenchPaintBounds(selected, meta.w, meta.h);
  const clampedPoints = points
    .map((point) => clampWorkbenchPointToBounds(point, bounds))
    .filter(Boolean);
  if (clampedPoints.length < 3) {
    clearWorkbenchPaintPoints();
    return false;
  }
  const minX = Math.min(...clampedPoints.map((point) => point.x));
  const minY = Math.min(...clampedPoints.map((point) => point.y));
  const maxX = Math.max(...clampedPoints.map((point) => point.x));
  const maxY = Math.max(...clampedPoints.map((point) => point.y));
  const relativePoints = clampedPoints.map((point) => ({
    x: Math.round((point.x - minX) * 1000) / 1000,
    y: Math.round((point.y - minY) * 1000) / 1000
  }));
  const activeIndex = Number.isInteger(state.selectedHitboxIndex) ? state.selectedHitboxIndex : null;
  const hasActiveSelection = activeIndex != null && selected.hitboxes?.[activeIndex];
  const targetIndex = hasActiveSelection ? activeIndex : null;
  const prev = targetIndex != null && selected.hitboxes?.[targetIndex] ? selected.hitboxes[targetIndex] : null;
  const prevEdgeSlip =
    prev && isPolygonHitbox(prev)
      ? (normalizePolygonEdgeSlip ? normalizePolygonEdgeSlip(prev.edgeSlip, relativePoints.length) : null)
      : null;
  const replacement = {
    type: 'polygon',
    x: Math.round(minX),
    y: Math.round(minY),
    w: Math.max(1, Math.round(maxX - minX)),
    h: Math.max(1, Math.round(maxY - minY)),
    rotation: 0,
    locked: !!prev?.locked,
    points: relativePoints,
    ...(prevEdgeSlip ? { edgeSlip: prevEdgeSlip } : {}),
    ...(prev?.groupId ? { groupId: String(prev.groupId) } : {})
  };
  if (!Array.isArray(selected.hitboxes)) {
    selected.hitboxes = [];
  }
  if (targetIndex == null) {
    selected.hitboxes.push(replacement);
  } else {
    selected.hitboxes.splice(targetIndex, 1, replacement);
  }
  normalizeObjectHitboxesWithinBounds(selected, { normalizeCropSpace: false, preserveSetPosition: true });
  const nextIndex = targetIndex == null
    ? Math.max(0, selected.hitboxes.length - 1)
    : Math.max(0, Math.min(selected.hitboxes.length - 1, targetIndex));
  workbenchState.hitboxIndex = nextIndex;
  state.boxGuidesVisible = true;
  state.selectionTarget = 'hitbox';
  state.selectedSpecial = 'hitbox';
  state.selectionAction.hitbox = 'move';
  state.showHitboxes = true;
  setHitboxSelection([nextIndex], nextIndex);
  clearWorkbenchPaintPoints();
  markWorkbenchDirty();
  return true;
};

const rebuildPolygonHitboxFromAbsolutePoints = (selected, baseHitbox, absolutePoints) => {
  if (!selected || !baseHitbox || !Array.isArray(absolutePoints)) return null;
  const normalizedAbs = (normalizePolygonPoints ? normalizePolygonPoints(absolutePoints) : absolutePoints) || null;
  if (!normalizedAbs || normalizedAbs.length < 3) return null;
  const minX = Math.min(...normalizedAbs.map((point) => point.x));
  const minY = Math.min(...normalizedAbs.map((point) => point.y));
  const maxX = Math.max(...normalizedAbs.map((point) => point.x));
  const maxY = Math.max(...normalizedAbs.map((point) => point.y));
  const replacement = {
    ...baseHitbox,
    type: 'polygon',
    x: Math.round(minX),
    y: Math.round(minY),
    w: Math.max(1, Math.round(maxX - minX)),
    h: Math.max(1, Math.round(maxY - minY)),
    rotation: normalizeHitboxRotation(baseHitbox.rotation, 0),
    points: normalizedAbs.map((point) => ({
      x: Math.round((point.x - minX) * 1000) / 1000,
      y: Math.round((point.y - minY) * 1000) / 1000
    }))
  };
  const clamped =
    clampHitboxToObjectBounds(selected, replacement, { fallbackToNearest: false })
    || clampHitboxToObjectBounds(selected, replacement);
  return clamped ? normalizePolygonHitbox(clamped) : null;
};

const projectPointToSegment = (point, a, b) => {
  const px = Number(point?.x) || 0;
  const py = Number(point?.y) || 0;
  const ax = Number(a?.x) || 0;
  const ay = Number(a?.y) || 0;
  const bx = Number(b?.x) || 0;
  const by = Number(b?.y) || 0;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 1e-9) {
    const dx = px - ax;
    const dy = py - ay;
    return { x: ax, y: ay, t: 0, distSq: dx * dx + dy * dy };
  }
  const tRaw = ((px - ax) * abx + (py - ay) * aby) / abLenSq;
  const t = Math.max(0, Math.min(1, tRaw));
  const x = ax + abx * t;
  const y = ay + aby * t;
  const dx = px - x;
  const dy = py - y;
  return { x, y, t, distSq: dx * dx + dy * dy };
};

const insertPolygonPointAtNearestSegment = (selected, hitboxIndex, localPoint) => {
  const hb = selected?.hitboxes?.[hitboxIndex];
  if (!hb || !isPolygonHitbox(hb)) return false;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hb.points) : hb.points) || null;
  if (!points || points.length < 3) return false;
  const absolutePoints = points.map((point) => ({
    x: (Number(hb.x) || 0) + (Number(point.x) || 0),
    y: (Number(hb.y) || 0) + (Number(point.y) || 0)
  }));
  let bestSegment = -1;
  let bestProjection = null;
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (let i = 0; i < absolutePoints.length; i += 1) {
    const a = absolutePoints[i];
    const b = absolutePoints[(i + 1) % absolutePoints.length];
    const proj = projectPointToSegment(localPoint, a, b);
    if (proj.distSq < bestDistSq) {
      bestDistSq = proj.distSq;
      bestSegment = i;
      bestProjection = proj;
    }
  }
  if (bestSegment < 0 || !bestProjection) return false;
  const nextPoints = [...absolutePoints];
  nextPoints.splice(bestSegment + 1, 0, {
    x: Math.round(bestProjection.x * 1000) / 1000,
    y: Math.round(bestProjection.y * 1000) / 1000
  });
  const rebuilt = rebuildPolygonHitboxFromAbsolutePoints(selected, hb, nextPoints);
  if (!rebuilt) return false;
  selected.hitboxes.splice(hitboxIndex, 1, rebuilt);
  workbenchState.hitboxIndex = hitboxIndex;
  setHitboxSelection([hitboxIndex], hitboxIndex);
  state.selectedSpecial = 'hitbox';
  markWorkbenchDirty();
  return true;
};

const pushWorkbenchPoint = (selected, meta, local) => {
  const tool = clampWorkbenchPaintTool(workbenchState.paint.tool);
  const bounds = getWorkbenchPaintBounds(selected, meta.w, meta.h);
  const point = clampWorkbenchPointToBounds(local, bounds);
  if (!point) return false;
  const points = Array.isArray(workbenchState.paint.points) ? [...workbenchState.paint.points] : [];
  if (tool === 'parallelogram') {
    points.push(point);
    if (points.length >= 3) {
      const a = points[0];
      const b = points[1];
      const c = points[2];
      const rawD = { x: a.x + c.x - b.x, y: a.y + c.y - b.y };
      const d = clampWorkbenchPointToBounds(rawD, bounds) || rawD;
      workbenchState.paint.points = [a, b, c, d];
      commitWorkbenchPolygonPoints(selected, meta);
      return true;
    }
    workbenchState.paint.points = points;
    return true;
  }
  if (tool !== 'poly') return false;
  if (points.length >= 3) {
    const first = points[0];
    const dx = first.x - point.x;
    const dy = first.y - point.y;
    if (dx * dx + dy * dy <= 9) {
      commitWorkbenchPolygonPoints(selected, meta);
      return true;
    }
  }
  points.push(point);
  workbenchState.paint.points = points;
  return true;
};

const startWorkbenchPointToolTap = (
  e,
  selected,
  view,
  zoom,
  meta,
  sampleOffsetX = 0,
  sampleOffsetY = 0
) => {
  if (!areWorkbenchGuidesEditable()) return;
  if (e.button !== 0) return;
  const local = getWorkbenchPointerLocal(e.clientX, e.clientY, view, zoom, sampleOffsetX, sampleOffsetY);
  if (!local) return;
  const consumed = pushWorkbenchPoint(selected, meta, local);
  if (!consumed) return;
  e.preventDefault();
  e.stopPropagation();
  renderWorkbench();
};

const startWorkbenchPolygonPointDrag = (
  e,
  selected,
  view,
  zoom,
  hitboxIndex,
  pointIndex,
  offsetX = 0,
  offsetY = 0
) => {
  if (!areWorkbenchGuidesEditable()) return;
  if (e.button !== 0) return;
  const hb = selected?.hitboxes?.[hitboxIndex];
  if (!hb || !isPolygonHitbox(hb)) return;
  const points = (normalizePolygonPoints ? normalizePolygonPoints(hb.points) : hb.points) || [];
  if (!Array.isArray(points) || !points[pointIndex]) return;
  const start = getWorkbenchPointerLocal(e.clientX, e.clientY, view, zoom, offsetX, offsetY);
  if (!start) return;
  const absolutePoints = points.map((point) => ({
    x: (Number(hb.x) || 0) + (Number(point.x) || 0),
    y: (Number(hb.y) || 0) + (Number(point.y) || 0)
  }));
  workbenchState.historyDeferred = true;
  workbenchState.pinnedView = { ...view };
  workbenchState.hitboxIndex = hitboxIndex;
  state.selectedSpecial = 'hitbox';
  setHitboxSelection([hitboxIndex], hitboxIndex);
  workbenchDrag = {
    kind: 'hitboxPoint',
    id: selected.id,
    index: hitboxIndex,
    pointIndex,
    start,
    startPoint: { ...absolutePoints[pointIndex] },
    absolutePointsStart: absolutePoints,
    view: { ...view },
    offsetX,
    offsetY,
    zoom
  };
  renderWorkbench();
};

const createWorkbenchPlayerObject = () => {
  const safeScale = Math.max(0.2, Math.min(3, Number(state.playerScale) || 1));
  const crop = state.playerCrop ? clampPlayerCrop(cloneCrop(getPlayerCrop())) : null;
  const offsetX = Math.round((Number(state.playerHitboxOffset?.x) || 0) / safeScale);
  const offsetY = Math.round((Number(state.playerHitboxOffset?.y) || 0) / safeScale);
  const hitbox = {
    x: offsetX,
    y: offsetY,
    w: Math.max(20, Math.round(Number(state.playerHitbox?.width) || PLAYER_W)),
    h: Math.max(20, Math.round(Number(state.playerHitbox?.height) || PLAYER_H)),
    rotation: 0,
    locked: !!state.playerLocked
  };
  const obj = {
    id: WORKBENCH_PLAYER_SOURCE_ID,
    sprite: SPRITES.idle,
    x: 0,
    y: 0,
    scale: safeScale,
    rotation: 0,
    flipH: false,
    flipV: false,
    crop,
    hitboxes: [hitbox],
    locked: !!state.playerLocked
  };
  normalizeObjectHitboxesWithinBounds(obj, {
    normalizeCropSpace: false,
    preserveSetPosition: true,
    strictClip: true,
    allowEmpty: false
  });
  return obj;
};

const applyWorkbenchPlayerObjectToState = (obj) => {
  if (!obj) return;
  const scale = Math.max(0.2, Math.min(3, Number(obj.scale) || 1));
  const nextCrop = obj.crop ? clampPlayerCrop(cloneCrop(obj.crop)) : null;
  // Start point stays fixed; player crop/scale changes should not mutate world anchor implicitly.
  state.playerScale = Number(scale.toFixed(2));
  state.playerCrop = nextCrop;
  state.playerLocked = !!obj.locked;
  const hb = obj.hitboxes?.[0];
  if (hb) {
    let nextX = Math.round(Number(hb.x) || 0);
    let nextY = Math.round(Number(hb.y) || 0);
    let nextW = Math.max(20, Math.round(Number(hb.w) || PLAYER_W));
    let nextH = Math.max(20, Math.round(Number(hb.h) || PLAYER_H));
    if (isPolygonHitbox(hb)) {
      const points = (normalizePolygonPoints ? normalizePolygonPoints(hb.points) : hb.points) || hb.points;
      if (Array.isArray(points) && points.length >= 3) {
        const xs = points.map((point) => Number(point.x) || 0);
        const ys = points.map((point) => Number(point.y) || 0);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        nextX = Math.round((Number(hb.x) || 0) + minX);
        nextY = Math.round((Number(hb.y) || 0) + minY);
        nextW = Math.max(20, Math.round(maxX - minX));
        nextH = Math.max(20, Math.round(maxY - minY));
      }
    }
    state.playerHitbox.width = nextW;
    state.playerHitbox.height = nextH;
    state.playerHitbox.footInset = Math.max(
      0,
      Math.min(nextW / 2 - 1, Number(state.playerHitbox.footInset) || 0)
    );
    state.playerHitboxOffset = {
      x: Math.round(nextX * scale),
      y: Math.round(nextY * scale)
    };
  }
  syncPlayerHitboxInputs();
  applyPlayerHitboxToViews();
};

const getWorkbenchObject = () => {
  if (!workbenchState.open) return null;
  if (workbenchState.sourceType === 'player') {
    return workbenchState.sourcePlayerObject || null;
  }
  // Workbench supports both object and hitbox targets on the same selected object.
  // Only block when the selected target is the global player special node.
  if (state.selectedSpecial === 'player') return null;
  if (!workbenchState.sourceObjectId) return null;
  return state.objects.find((obj) => obj.id === workbenchState.sourceObjectId) || null;
};

const cloneWorkbenchSnapshot = (obj) => {
  if (!obj) return null;
  return {
    crop: obj.crop ? cloneCrop(getObjectCrop(obj)) : null,
    hitboxes: cloneHitboxes(obj.hitboxes || [])
  };
};

const applyWorkbenchSnapshot = (obj, snapshot) => {
  if (!obj || !snapshot) return;
  obj.crop = snapshot.crop ? cloneCrop(snapshot.crop) : null;
  obj.hitboxes = cloneHitboxes(snapshot.hitboxes || []);
};

const getWorkbenchSnapshotSignature = (snapshot) => {
  if (!snapshot) return '';
  try {
    return JSON.stringify(snapshot);
  } catch {
    return '';
  }
};

const updateWorkbenchHistoryButtons = () => {
  const canUndo = workbenchState.historyIndex > 0;
  const canRedo = workbenchState.historyIndex >= 0
    && workbenchState.historyIndex < workbenchState.history.length - 1;
  if (els.workbenchUndo) els.workbenchUndo.disabled = !canUndo;
  if (els.workbenchRedo) els.workbenchRedo.disabled = !canRedo;
};

const refreshWorkbenchDirtyFromHistory = () => {
  if (!workbenchState.history.length || workbenchState.historyIndex < 0) {
    workbenchState.dirty = false;
    return;
  }
  const baseSig = getWorkbenchSnapshotSignature(workbenchState.history[0]);
  const currentSig = getWorkbenchSnapshotSignature(workbenchState.history[workbenchState.historyIndex]);
  workbenchState.dirty = baseSig !== currentSig;
};

const initWorkbenchHistory = (obj) => {
  const initial = cloneWorkbenchSnapshot(obj);
  workbenchState.history = initial ? [initial] : [];
  workbenchState.historyIndex = initial ? 0 : -1;
  workbenchState.historySignature = getWorkbenchSnapshotSignature(initial);
  workbenchState.historyDeferred = false;
  workbenchState.historyApplying = false;
  refreshWorkbenchDirtyFromHistory();
  updateWorkbenchHistoryButtons();
};

const recordWorkbenchHistory = () => {
  if (!workbenchState.open || workbenchState.historyApplying) return;
  const selected = getWorkbenchObject();
  if (!selected) return;
  const snapshot = cloneWorkbenchSnapshot(selected);
  if (!snapshot) return;
  const signature = getWorkbenchSnapshotSignature(snapshot);
  if (signature === workbenchState.historySignature) return;
  if (workbenchState.historyIndex < workbenchState.history.length - 1) {
    workbenchState.history = workbenchState.history.slice(0, workbenchState.historyIndex + 1);
  }
  workbenchState.history.push(snapshot);
  if (workbenchState.history.length > 80) {
    const overflow = workbenchState.history.length - 80;
    workbenchState.history.splice(0, overflow);
    workbenchState.historyIndex = Math.max(0, workbenchState.historyIndex - overflow);
  }
  workbenchState.historyIndex = workbenchState.history.length - 1;
  workbenchState.historySignature = signature;
  refreshWorkbenchDirtyFromHistory();
  updateWorkbenchHistoryButtons();
};

const restoreWorkbenchHistoryAt = (index) => {
  if (!workbenchState.open) return;
  const selected = getWorkbenchObject();
  if (!selected) return;
  if (!Number.isInteger(index) || index < 0 || index >= workbenchState.history.length) return;
  const snapshot = workbenchState.history[index];
  if (!snapshot) return;
  workbenchState.historyApplying = true;
  applyWorkbenchSnapshot(selected, snapshot);
  workbenchState.historyApplying = false;
  workbenchState.historyIndex = index;
  workbenchState.historySignature = getWorkbenchSnapshotSignature(snapshot);
  refreshWorkbenchDirtyFromHistory();
  updateWorkbenchHistoryButtons();
  renderWorkbench();
};

const workbenchUndo = () => {
  if (!workbenchState.open) return;
  if (workbenchState.historyIndex <= 0) return;
  restoreWorkbenchHistoryAt(workbenchState.historyIndex - 1);
};

const workbenchRedo = () => {
  if (!workbenchState.open) return;
  if (workbenchState.historyIndex < 0) return;
  if (workbenchState.historyIndex >= workbenchState.history.length - 1) return;
  restoreWorkbenchHistoryAt(workbenchState.historyIndex + 1);
};

const clearWorkbenchAllHitboxes = () => {
  const selected = getWorkbenchObject();
  if (!selected) return;
  selected.hitboxes = [];
  state.selectedSpecial = null;
  if (state.selectionTarget === 'hitbox') state.selectionTarget = 'object';
  setHitboxSelection([], null);
  markWorkbenchDirty();
  renderWorkbench();
};

const markWorkbenchDirty = () => {
  if (!workbenchState.open) return;
  workbenchState.dirty = true;
  if (workbenchState.historyApplying || workbenchState.historyDeferred) {
    updateWorkbenchHistoryButtons();
    return;
  }
  recordWorkbenchHistory();
};

const clampWorkbenchZoom = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 4;
  const snapped = Math.round(parsed / WORKBENCH_ZOOM_STEP) * WORKBENCH_ZOOM_STEP;
  return Math.max(WORKBENCH_ZOOM_MIN, Math.min(WORKBENCH_ZOOM_MAX, snapped));
};

const formatWorkbenchZoom = (value) => {
  const safe = clampWorkbenchZoom(value);
  const rounded = Math.round(safe * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/(\.\d*?[1-9])0+$/u, '$1');
};

const setWorkbenchZoom = (value) => {
  workbenchState.zoom = clampWorkbenchZoom(value);
  if (els.workbenchZoom) {
    els.workbenchZoom.value = String(workbenchState.zoom);
  }
};

const normalizeWorkbenchGuideTool = (tool) => {
  if (tool === 'horizontal' || tool === 'vertical') return tool;
  return 'none';
};

const ensureWorkbenchGuides = () => {
  if (!workbenchState.guides || typeof workbenchState.guides !== 'object') {
    workbenchState.guides = { horizontal: [], vertical: [] };
  }
  ['horizontal', 'vertical'].forEach((axis) => {
    if (!Array.isArray(workbenchState.guides[axis])) {
      workbenchState.guides[axis] = [];
    }
    workbenchState.guides[axis] = workbenchState.guides[axis]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  });
  return workbenchState.guides;
};

const clearWorkbenchGuides = () => {
  const guides = ensureWorkbenchGuides();
  guides.horizontal = [];
  guides.vertical = [];
  workbenchState.selectedGuide = null;
};

const addWorkbenchGuide = (axis, value) => {
  const key = axis === 'horizontal' ? 'horizontal' : (axis === 'vertical' ? 'vertical' : null);
  if (!key) return false;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;
  const guides = ensureWorkbenchGuides();
  const snapped = Math.round(numeric * 1000) / 1000;
  const list = guides[key];
  if (list.some((item) => Math.abs(item - snapped) <= WORKBENCH_GUIDE_DUPE_EPS)) {
    return false;
  }
  list.push(snapped);
  workbenchState.selectedGuide = { axis: key, index: list.length - 1 };
  return true;
};

const deleteWorkbenchGuide = (axis, mode = 'selected-or-last') => {
  const key = axis === 'horizontal' ? 'horizontal' : (axis === 'vertical' ? 'vertical' : null);
  if (!key) return false;
  const guides = ensureWorkbenchGuides();
  const list = guides[key];
  if (!list.length) return false;
  let index = -1;
  if (mode === 'selected-or-last') {
    const selected = workbenchState.selectedGuide;
    if (selected && selected.axis === key && Number.isInteger(selected.index)) {
      index = selected.index;
    }
  }
  if (index < 0 || index >= list.length) {
    index = list.length - 1;
  }
  list.splice(index, 1);
  if (!list.length) {
    if (workbenchState.selectedGuide?.axis === key) workbenchState.selectedGuide = null;
  } else if (workbenchState.selectedGuide?.axis === key) {
    workbenchState.selectedGuide = { axis: key, index: Math.max(0, Math.min(list.length - 1, index - 1)) };
  }
  return true;
};

const selectWorkbenchGuide = (axis, index) => {
  const key = axis === 'horizontal' ? 'horizontal' : (axis === 'vertical' ? 'vertical' : null);
  if (!key) return;
  const list = ensureWorkbenchGuides()[key];
  if (!Number.isInteger(index) || index < 0 || index >= list.length) {
    workbenchState.selectedGuide = null;
    return;
  }
  workbenchState.selectedGuide = { axis: key, index };
};

const getWorkbenchRenderContext = () => {
  const ctx = workbenchState.renderContext;
  if (!ctx || typeof ctx !== 'object') return null;
  if (!ctx.view || !Number.isFinite(ctx.zoom)) return null;
  return ctx;
};

const getWorkbenchRulerLocalAtClient = (clientX, clientY) => {
  const ctx = getWorkbenchRenderContext();
  if (!ctx) return null;
  const stage = els.workbenchCanvas?.querySelector('.workbench-stage');
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  return {
    x: ctx.view.x + ctx.previewOffsetX + (clientX - rect.left) / ctx.zoom,
    y: ctx.view.y + ctx.previewOffsetY + (clientY - rect.top) / ctx.zoom
  };
};

const findNearestWorkbenchGuideIndex = (axis, value, threshold) => {
  const key = axis === 'horizontal' ? 'horizontal' : (axis === 'vertical' ? 'vertical' : null);
  if (!key) return -1;
  const list = ensureWorkbenchGuides()[key];
  if (!list.length) return -1;
  let index = -1;
  let best = threshold + Number.EPSILON;
  list.forEach((item, idx) => {
    const dist = Math.abs(item - value);
    if (dist <= best) {
      best = dist;
      index = idx;
    }
  });
  return index;
};

const findNearestWorkbenchGuide = (value, guides, threshold) => {
  if (!Array.isArray(guides) || !guides.length || !Number.isFinite(value) || threshold < 0) return null;
  let nearest = null;
  let bestDist = threshold + Number.EPSILON;
  guides.forEach((guide) => {
    const dist = Math.abs(guide - value);
    if (dist <= bestDist) {
      bestDist = dist;
      nearest = guide;
    }
  });
  return nearest;
};

const snapWorkbenchAxisPosition = (start, size, guides, threshold) => {
  const snappedStart = findNearestWorkbenchGuide(start, guides, threshold);
  const end = start + size;
  const snappedEnd = findNearestWorkbenchGuide(end, guides, threshold);
  if (snappedStart == null && snappedEnd == null) return start;
  if (snappedStart != null && snappedEnd == null) return snappedStart;
  if (snappedStart == null && snappedEnd != null) return snappedEnd - size;
  const distStart = Math.abs(snappedStart - start);
  const distEnd = Math.abs(snappedEnd - end);
  return distStart <= distEnd ? snappedStart : (snappedEnd - size);
};

const applyWorkbenchGuideSnapToRect = (rect, handle, zoom) => {
  if (!workbenchState.open || !workbenchState.guideSnap) return rect;
  const guides = ensureWorkbenchGuides();
  if (!guides.horizontal.length && !guides.vertical.length) return rect;
  const safeZoom = Math.max(0.001, Number(zoom) || 1);
  const threshold = WORKBENCH_GUIDE_SNAP_THRESHOLD_PX / safeZoom;
  let x = Number(rect.x) || 0;
  let y = Number(rect.y) || 0;
  let w = Math.max(1, Number(rect.w) || 1);
  let h = Math.max(1, Number(rect.h) || 1);
  const hasHandle = typeof handle === 'string' && handle.length > 0;
  if (!hasHandle) {
    x = snapWorkbenchAxisPosition(x, w, guides.vertical, threshold);
    y = snapWorkbenchAxisPosition(y, h, guides.horizontal, threshold);
    return { ...rect, x, y, w, h };
  }
  if (handle.includes('w')) {
    const snapped = findNearestWorkbenchGuide(x, guides.vertical, threshold);
    if (snapped != null) {
      const right = x + w;
      x = snapped;
      w = Math.max(1, right - x);
    }
  }
  if (handle.includes('e')) {
    const right = x + w;
    const snapped = findNearestWorkbenchGuide(right, guides.vertical, threshold);
    if (snapped != null) {
      w = Math.max(1, snapped - x);
    }
  }
  if (handle.includes('n')) {
    const snapped = findNearestWorkbenchGuide(y, guides.horizontal, threshold);
    if (snapped != null) {
      const bottom = y + h;
      y = snapped;
      h = Math.max(1, bottom - y);
    }
  }
  if (handle.includes('s')) {
    const bottom = y + h;
    const snapped = findNearestWorkbenchGuide(bottom, guides.horizontal, threshold);
    if (snapped != null) {
      h = Math.max(1, snapped - y);
    }
  }
  return { ...rect, x, y, w, h };
};

const updateWorkbenchZoomLabel = () => {
  if (!els.workbenchZoomLabel) return;
  els.workbenchZoomLabel.textContent = `${formatWorkbenchZoom(workbenchState.zoom)}x`;
  if (els.workbenchZoom) {
    els.workbenchZoom.value = String(clampWorkbenchZoom(workbenchState.zoom));
  }
};

const updateWorkbenchTitle = () => {
  if (!els.workbenchTitle) return;
  if (!workbenchState.open) {
    els.workbenchTitle.textContent = '오브젝트 정밀 작업판';
    return;
  }
  els.workbenchTitle.textContent = workbenchState.sourceType === 'player'
    ? '캐릭터 정밀 작업판'
    : '오브젝트 정밀 작업판';
};

const updateWorkbenchFocusButton = () => {
  if (els.workbenchFocusToggle) {
    els.workbenchFocusToggle.textContent = workbenchState.focusMode ? '보기: 선택 중심' : '보기: 전체';
    els.workbenchFocusToggle.classList.toggle('is-active', workbenchState.focusMode);
  }
  if (els.workbenchPanel) {
    els.workbenchPanel.classList.toggle('is-focused', workbenchState.focusMode);
  }
};

const clampWorkbenchHitboxIndex = (selected) => {
  if (!selected?.hitboxes?.length) {
    workbenchState.hitboxIndex = 0;
    return 0;
  }
  const next = Math.max(0, Math.min(selected.hitboxes.length - 1, Math.round(Number(workbenchState.hitboxIndex) || 0)));
  workbenchState.hitboxIndex = next;
  return next;
};

const updateWorkbenchModeButtons = (selected) => {
  const guidesVisible = areWorkbenchGuidesVisible();
  const guidesEditable = areWorkbenchGuidesEditable();
  const hasHitbox = !!(selected?.hitboxes?.length);
  const allowedCropScopes = new Set(['all', 'single', 'region']);
  if (!allowedCropScopes.has(workbenchState.hitboxCropScope)) {
    workbenchState.hitboxCropScope = 'all';
  }
  const allowedRegionSteps = new Set(['region', 'crop']);
  if (!allowedRegionSteps.has(workbenchState.hitboxCropRegionStep)) {
    workbenchState.hitboxCropRegionStep = 'region';
  }
  const target = state.selectionTarget === 'hitbox' && hasHitbox ? 'hitbox' : 'object';
  if ((!guidesVisible || target === 'object') && state.selectionTarget === 'hitbox') {
    state.selectionTarget = 'object';
    state.selectedSpecial = null;
    setHitboxSelection([], null);
  }
  const action = getSelectionAction(target);
  if (els.wbTargetObject) {
    els.wbTargetObject.classList.toggle('is-active', target === 'object');
  }
  if (els.wbTargetHitbox) {
    els.wbTargetHitbox.classList.toggle('is-active', target === 'hitbox');
    els.wbTargetHitbox.disabled = !guidesVisible || !hasHitbox;
  }
  if (els.wbActionMove) {
    els.wbActionMove.classList.toggle('is-active', action === 'move');
    els.wbActionMove.disabled = !guidesEditable;
  }
  if (els.wbActionResize) {
    els.wbActionResize.classList.toggle('is-active', action === 'resize');
    els.wbActionResize.disabled = !guidesEditable;
  }
  if (els.wbActionCrop) {
    const isCropActive = action === 'crop';
    els.wbActionCrop.classList.toggle('is-active', isCropActive);
    els.wbActionCrop.disabled = !guidesEditable;
  }
  const showHitboxCropScope = target === 'hitbox' && action === 'crop';
  const showRegionStep = showHitboxCropScope && workbenchState.hitboxCropScope === 'region';
  if (els.wbHitboxCropScopeRow) {
    els.wbHitboxCropScopeRow.classList.toggle('hidden', !showHitboxCropScope);
  }
  if (els.wbHitboxCropAll) {
    els.wbHitboxCropAll.classList.toggle('is-active', workbenchState.hitboxCropScope === 'all');
    els.wbHitboxCropAll.disabled = !hasHitbox;
  }
  if (els.wbHitboxCropSingle) {
    els.wbHitboxCropSingle.classList.toggle('is-active', workbenchState.hitboxCropScope === 'single');
    els.wbHitboxCropSingle.disabled = !hasHitbox;
  }
  if (els.wbHitboxCropRegion) {
    els.wbHitboxCropRegion.classList.toggle('is-active', workbenchState.hitboxCropScope === 'region');
    els.wbHitboxCropRegion.disabled = !hasHitbox;
  }
  if (els.wbHitboxCropRegionStepRow) {
    els.wbHitboxCropRegionStepRow.classList.toggle('hidden', !showRegionStep);
  }
  if (els.wbHitboxRegionStepRegion) {
    els.wbHitboxRegionStepRegion.classList.toggle('is-active', workbenchState.hitboxCropRegionStep === 'region');
    els.wbHitboxRegionStepRegion.disabled = !showRegionStep || !guidesEditable || !hasHitbox;
  }
  if (els.wbHitboxRegionStepCrop) {
    els.wbHitboxRegionStepCrop.classList.toggle('is-active', workbenchState.hitboxCropRegionStep === 'crop');
    els.wbHitboxRegionStepCrop.disabled = !showRegionStep || !guidesEditable || !hasHitbox;
  }
  if (els.wbHitboxCropRegionStepHint) {
    els.wbHitboxCropRegionStepHint.classList.toggle('hidden', !showRegionStep);
    els.wbHitboxCropRegionStepHint.textContent = workbenchState.hitboxCropRegionStep === 'region'
      ? '1단계: 영역 박스를 먼저 조절하세요.'
      : '2단계: 빨간 자르기 박스로 영역 안 히트박스를 자르세요.';
  }
};

const updateWorkbenchGuideControls = (selected) => {
  const hasObject = !!selected;
  const guidesEditable = areWorkbenchGuidesEditable();
  const guides = ensureWorkbenchGuides();
  if (workbenchState.selectedGuide) {
    const axis = workbenchState.selectedGuide.axis === 'vertical' ? 'vertical' : 'horizontal';
    const idx = Number(workbenchState.selectedGuide.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= guides[axis].length) {
      workbenchState.selectedGuide = null;
    }
  }
  workbenchState.guideTool = normalizeWorkbenchGuideTool(workbenchState.guideTool);
  if (els.workbenchGuideControls) {
    els.workbenchGuideControls.classList.toggle('hidden', !hasObject);
  }
  if (els.wbGuideToolNone) {
    els.wbGuideToolNone.classList.toggle('is-active', workbenchState.guideTool === 'none');
    els.wbGuideToolNone.disabled = !hasObject || !guidesEditable;
  }
  if (els.wbGuideToolHorizontal) {
    els.wbGuideToolHorizontal.classList.toggle('is-active', workbenchState.guideTool === 'horizontal');
    els.wbGuideToolHorizontal.disabled = !hasObject || !guidesEditable;
  }
  if (els.wbGuideToolVertical) {
    els.wbGuideToolVertical.classList.toggle('is-active', workbenchState.guideTool === 'vertical');
    els.wbGuideToolVertical.disabled = !hasObject || !guidesEditable;
  }
  if (els.wbGuideSnap) {
    els.wbGuideSnap.checked = workbenchState.guideSnap !== false;
    els.wbGuideSnap.disabled = !hasObject || !guidesEditable;
  }
  if (els.wbGuideDeleteHorizontal) {
    els.wbGuideDeleteHorizontal.disabled = !hasObject || !guidesEditable || !guides.horizontal.length;
  }
  if (els.wbGuideDeleteVertical) {
    els.wbGuideDeleteVertical.disabled = !hasObject || !guidesEditable || !guides.vertical.length;
  }
  if (els.wbGuideClear) {
    els.wbGuideClear.disabled = !hasObject || !guidesEditable || (!guides.horizontal.length && !guides.vertical.length);
  }
};

const updateWorkbenchHitboxControls = (selected) => {
  const hasHitbox = !!(selected?.hitboxes?.length);
  if (els.workbenchHitboxControls) {
    els.workbenchHitboxControls.classList.toggle('hidden', !hasHitbox);
  }
  if (!hasHitbox) return;
  const activeIndex = clampWorkbenchHitboxIndex(selected);
  if (els.wbHitboxIndex) {
    const prevValue = String(activeIndex);
    els.wbHitboxIndex.innerHTML = '';
    selected.hitboxes.forEach((_, idx) => {
      const option = document.createElement('option');
      option.value = String(idx);
      option.textContent = `히트박스 ${idx + 1}`;
      els.wbHitboxIndex.appendChild(option);
    });
    els.wbHitboxIndex.value = prevValue;
  }
  const hb = selected.hitboxes[activeIndex];
  if (!hb) return;
  if (els.wbHitboxX) els.wbHitboxX.value = Math.round(hb.x);
  if (els.wbHitboxY) els.wbHitboxY.value = Math.round(hb.y);
  if (els.wbHitboxW) els.wbHitboxW.value = Math.max(1, Math.round(hb.w));
  if (els.wbHitboxH) els.wbHitboxH.value = Math.max(1, Math.round(hb.h));
  if (els.wbHitboxRotation) els.wbHitboxRotation.value = normalizeHitboxRotation(hb.rotation, 0);
};

const updateWorkbenchCropControls = (selected) => {
  const hasObject = !!selected;
  if (els.workbenchCropControls) {
    els.workbenchCropControls.classList.toggle('hidden', !hasObject);
  }
  if (!hasObject) return;
  const crop = selected.crop ? getObjectCrop(selected) : getFullObjectCrop(selected);
  if (els.wbCropX) els.wbCropX.value = Math.round(crop.x);
  if (els.wbCropY) els.wbCropY.value = Math.round(crop.y);
  if (els.wbCropW) els.wbCropW.value = Math.round(crop.w);
  if (els.wbCropH) els.wbCropH.value = Math.round(crop.h);
};

const updateWorkbenchPaintControls = (selected) => {
  const guidesEditable = areWorkbenchGuidesEditable();
  const hasObject = !!selected;
  const isPlayerSource = workbenchState.sourceType === 'player';
  workbenchState.paint.tool = clampWorkbenchPaintTool(workbenchState.paint.tool);
  const tool = workbenchState.paint.tool;
  const points = Array.isArray(workbenchState.paint.points) ? workbenchState.paint.points : [];
  const canUsePointTools = hasObject && guidesEditable && workbenchState.paint.enabled && !isPlayerSource;
  const activeIndex = hasObject ? clampWorkbenchHitboxIndex(selected) : null;
  const activeHitbox = hasObject && activeIndex != null ? selected?.hitboxes?.[activeIndex] : null;
  const canInsertToPolygon = hasObject
    && guidesEditable
    && !isPlayerSource
    && !workbenchState.paint.enabled
    && isPolygonHitbox(activeHitbox);
  const canEditEdgeSlip = canInsertToPolygon;
  if (!canInsertToPolygon && workbenchState.paint.insertMode) {
    workbenchState.paint.insertMode = false;
    clearWorkbenchInsertSelection();
  }
  if (!canEditEdgeSlip && workbenchState.paint.edgeSlipMode) {
    workbenchState.paint.edgeSlipMode = false;
    clearWorkbenchEdgeSelection();
  }
  if (
    workbenchState.paint.insertSelectionHitboxIndex != null
    && workbenchState.paint.insertSelectionHitboxIndex !== activeIndex
  ) {
    clearWorkbenchInsertSelection();
  }
  if (
    workbenchState.paint.selectedEdgeHitboxIndex != null
    && workbenchState.paint.selectedEdgeHitboxIndex !== activeIndex
  ) {
    clearWorkbenchEdgeSelection();
  }
  if (els.workbenchPaintControls) {
    els.workbenchPaintControls.classList.toggle('hidden', !hasObject || isPlayerSource);
  }
  if (els.wbPaintToolPoly) {
    els.wbPaintToolPoly.disabled = !hasObject || !guidesEditable;
    els.wbPaintToolPoly.classList.toggle('is-active', tool === 'poly');
  }
  if (els.wbPaintToolParallelogram) {
    els.wbPaintToolParallelogram.disabled = !hasObject || !guidesEditable;
    els.wbPaintToolParallelogram.classList.toggle('is-active', tool === 'parallelogram');
  }
  if (els.wbPaintToggle) {
    els.wbPaintToggle.disabled = !hasObject || !guidesEditable || isPlayerSource;
    els.wbPaintToggle.classList.toggle('is-active', workbenchState.paint.enabled && hasObject);
    els.wbPaintToggle.textContent = workbenchState.paint.enabled ? '생성 ON' : '생성 OFF';
  }
  if (els.wbPaintPointUndo) {
    els.wbPaintPointUndo.disabled = !canUsePointTools || points.length === 0;
  }
  if (els.wbPaintPointClose) {
    const canClose = tool === 'parallelogram' ? points.length >= 2 : points.length >= 3;
    els.wbPaintPointClose.disabled = !canUsePointTools || !canClose;
  }
  if (els.wbPaintPointClear) {
    els.wbPaintPointClear.disabled = !canUsePointTools || points.length === 0;
  }
  if (els.wbPaintPointInsert) {
    els.wbPaintPointInsert.disabled = !canInsertToPolygon;
    els.wbPaintPointInsert.classList.toggle('is-active', !!workbenchState.paint.insertMode && canInsertToPolygon);
    els.wbPaintPointInsert.textContent = workbenchState.paint.insertMode && canInsertToPolygon
      ? '점 사이 점 추가 ON'
      : '점 사이 점 추가 OFF';
  }
  if (els.wbPaintEdgeSlip) {
    els.wbPaintEdgeSlip.disabled = !canEditEdgeSlip;
    els.wbPaintEdgeSlip.classList.toggle('is-active', !!workbenchState.paint.edgeSlipMode && canEditEdgeSlip);
    els.wbPaintEdgeSlip.textContent = workbenchState.paint.edgeSlipMode && canEditEdgeSlip
      ? '선분 미끄러짐 편집 ON'
      : '선분 미끄러짐 편집 OFF';
  }
  if (els.wbPaintStats) {
    const count = hasObject && Array.isArray(selected.hitboxes) ? selected.hitboxes.length : 0;
    const warning = count > 300 ? ' (주의: 많음)' : '';
    const pointText = workbenchState.paint.enabled ? ` · 점: ${points.length}` : '';
    const toolText = workbenchState.paint.enabled ? ` · 도구: ${tool === 'parallelogram' ? '평행사변형' : '다각형'}` : '';
    const insertSelection = normalizeInsertPointSelection(
      workbenchState.paint.insertSelection,
      isPolygonHitbox(activeHitbox)
        ? (((normalizePolygonPoints ? normalizePolygonPoints(activeHitbox.points) : activeHitbox.points) || []).length)
        : 0
    );
    const insertEdge = getAdjacentPolygonEdgeFromSelection(
      isPolygonHitbox(activeHitbox)
        ? (((normalizePolygonPoints ? normalizePolygonPoints(activeHitbox.points) : activeHitbox.points) || []).length)
        : 0,
      insertSelection
    );
    let insertText = '';
    if (!workbenchState.paint.enabled && canInsertToPolygon && workbenchState.paint.insertMode) {
      if (insertSelection.length < 2) insertText = ' · 점 2개 선택';
      else if (!insertEdge) insertText = ' · 인접 점 2개 필요';
      else insertText = ' · 선분 클릭해 점 추가';
    }
    let edgeSlipText = '';
    if (!workbenchState.paint.enabled && canEditEdgeSlip && workbenchState.paint.edgeSlipMode) {
      const edgeSelection = normalizeInsertPointSelection(
        workbenchState.paint.insertSelection,
        isPolygonHitbox(activeHitbox)
          ? (((normalizePolygonPoints ? normalizePolygonPoints(activeHitbox.points) : activeHitbox.points) || []).length)
          : 0
      );
      const edgeFromPoints = getAdjacentPolygonEdgeFromSelection(
        isPolygonHitbox(activeHitbox)
          ? (((normalizePolygonPoints ? normalizePolygonPoints(activeHitbox.points) : activeHitbox.points) || []).length)
          : 0,
        edgeSelection
      );
      const selectedEdge = Number.isInteger(workbenchState.paint.selectedEdgeIndex)
        ? workbenchState.paint.selectedEdgeIndex
        : null;
      if (selectedEdge != null && isPolygonHitbox(activeHitbox)) {
        const slipEnabled = isPolygonEdgeSlipEnabled(activeHitbox, selectedEdge);
        edgeSlipText = ` · 선분 ${selectedEdge + 1}: ${slipEnabled ? '미끄러짐 ON' : '미끄러짐 OFF'}`;
      } else if (edgeSelection.length < 2) {
        edgeSlipText = ' · 점 2개 선택';
      } else if (!edgeFromPoints) {
        edgeSlipText = ' · 인접 점 2개 필요';
      } else {
        edgeSlipText = ' · 두 번째 점 클릭 시 ON/OFF 전환';
      }
      if (
        workbenchState.paint.edgeSlipFeedbackText
        && Date.now() <= (Number(workbenchState.paint.edgeSlipFeedbackUntil) || 0)
      ) {
        edgeSlipText += ` · ${workbenchState.paint.edgeSlipFeedbackText}`;
      }
    }
    els.wbPaintStats.textContent = hasObject ? `히트박스: ${count}개${warning}${pointText}${toolText}${insertText}${edgeSlipText}` : '히트박스: -';
    els.wbPaintStats.classList.toggle('is-warning', hasObject && count > 300);
  }
};

const computeWorkbenchFocusRect = (selected, meta, crop, options = {}) => {
  const offsetX = Number(options.offsetX) || 0;
  const offsetY = Number(options.offsetY) || 0;
  const minBoundX = Number.isFinite(options.minX) ? options.minX : 0;
  const minBoundY = Number.isFinite(options.minY) ? options.minY : 0;
  const maxBoundX = Number.isFinite(options.maxX) ? options.maxX : meta.w;
  const maxBoundY = Number.isFinite(options.maxY) ? options.maxY : meta.h;
  let minX = crop.x - offsetX;
  let minY = crop.y - offsetY;
  let maxX = crop.x + crop.w - offsetX;
  let maxY = crop.y + crop.h - offsetY;
  selected.hitboxes.forEach((hb) => {
    minX = Math.min(minX, hb.x - offsetX);
    minY = Math.min(minY, hb.y - offsetY);
    maxX = Math.max(maxX, hb.x + Math.max(1, hb.w) - offsetX);
    maxY = Math.max(maxY, hb.y + Math.max(1, hb.h) - offsetY);
  });
  const margin = 16;
  minX = Math.max(minBoundX, Math.floor(minX - margin));
  minY = Math.max(minBoundY, Math.floor(minY - margin));
  maxX = Math.min(maxBoundX, Math.ceil(maxX + margin));
  maxY = Math.min(maxBoundY, Math.ceil(maxY + margin));
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY)
  };
};

const getWorkbenchViewRect = (selected, meta, crop, options = {}) => {
  if (workbenchState.pinnedView) return { ...workbenchState.pinnedView };
  if (!workbenchState.focusMode) return { x: 0, y: 0, w: meta.w, h: meta.h };
  return computeWorkbenchFocusRect(selected, meta, crop, options);
};

const fitWorkbenchView = (mode = 'focus') => {
  const selected = getWorkbenchObject();
  if (!selected) return;
  const wrapper = els.workbenchCanvasWrap || els.workbenchCanvas?.parentElement;
  if (!wrapper) return;
  const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
  const objectAction = state.selectionTarget === 'object' ? getSelectionAction('object') : 'move';
  const crop = selected.crop ? getObjectCrop(selected) : getFullObjectCrop(selected);
  const useCroppedPreview = !!selected.crop && objectAction !== 'crop';
  const previewOffsetX = useCroppedPreview ? crop.x : 0;
  const previewOffsetY = useCroppedPreview ? crop.y : 0;
  const viewOptions = {
    offsetX: previewOffsetX,
    offsetY: previewOffsetY,
    minX: -previewOffsetX,
    minY: -previewOffsetY,
    maxX: meta.w - previewOffsetX,
    maxY: meta.h - previewOffsetY
  };
  const view = mode === 'object'
    ? {
        x: useCroppedPreview ? -previewOffsetX : 0,
        y: useCroppedPreview ? -previewOffsetY : 0,
        w: meta.w,
        h: meta.h
      }
    : computeWorkbenchFocusRect(selected, meta, crop, viewOptions);
  workbenchState.focusMode = mode !== 'object';
  workbenchState.pinnedView = null;
  const fitW = Math.max(40, wrapper.clientWidth - 28);
  const fitH = Math.max(40, wrapper.clientHeight - 28);
  const nextZoom = Math.min(fitW / Math.max(1, view.w), fitH / Math.max(1, view.h));
  setWorkbenchZoom(nextZoom);
  renderWorkbench();
  wrapper.scrollLeft = 0;
  wrapper.scrollTop = 0;
};

const zoomWorkbenchAroundPoint = (nextZoom, clientX, clientY) => {
  const wrapper = els.workbenchCanvasWrap || els.workbenchCanvas?.parentElement;
  if (!wrapper) return;
  const prev = clampWorkbenchZoom(workbenchState.zoom);
  const next = clampWorkbenchZoom(nextZoom);
  if (Math.abs(next - prev) < 0.0001) return;
  const rect = wrapper.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const anchorX = wrapper.scrollLeft + localX;
  const anchorY = wrapper.scrollTop + localY;
  setWorkbenchZoom(next);
  renderWorkbench();
  const ratio = next / prev;
  wrapper.scrollLeft = Math.max(0, anchorX * ratio - localX);
  wrapper.scrollTop = Math.max(0, anchorY * ratio - localY);
};

const WORKBENCH_HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

const getWorkbenchPointerLocal = (clientX, clientY, view, zoom, offsetX = 0, offsetY = 0) => {
  const stage = els.workbenchCanvas?.querySelector('.workbench-stage');
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  return {
    x: view.x + offsetX + (clientX - rect.left) / zoom,
    y: view.y + offsetY + (clientY - rect.top) / zoom
  };
};

const startWorkbenchCropDrag = (
  e,
  selected,
  view,
  zoom,
  crop,
  handle = null,
  offsetX = 0,
  offsetY = 0
) => {
  if (!areWorkbenchGuidesEditable()) return;
  const start = getWorkbenchPointerLocal(e.clientX, e.clientY, view, zoom, offsetX, offsetY);
  if (!start) return;
  workbenchState.historyDeferred = true;
  workbenchState.pinnedView = { ...view };
  state.selectedSpecial = null;
  setHitboxSelection([], null);
  workbenchDrag = {
    kind: 'crop',
    id: selected.id,
    handle,
    start,
    startCrop: { ...crop },
    view: { ...view },
    offsetX,
    offsetY,
    zoom
  };
  renderWorkbench();
};

const startWorkbenchHitboxDrag = (
  e,
  selected,
  view,
  zoom,
  index,
  handle = null,
  offsetX = 0,
  offsetY = 0,
  options = {}
) => {
  if (!areWorkbenchGuidesEditable()) return;
  const action = getSelectionAction('hitbox');
  if (action === 'crop' && !handle) return;
  const start = getWorkbenchPointerLocal(e.clientX, e.clientY, view, zoom, offsetX, offsetY);
  if (!start) return;
  const hb = selected.hitboxes[index];
  if (!hb) return;
  workbenchState.historyDeferred = true;
  const selectedIndices = getSelectedHitboxIndices(selected);
  const requestedGroupIndices = Array.isArray(options.groupIndices)
    ? options.groupIndices
        .map((idx) => Number(idx))
        .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < selected.hitboxes.length)
    : [];
  const hasRequestedGroupIndices = Array.isArray(options.groupIndices);
  const groupIndices = action === 'crop'
    ? (hasRequestedGroupIndices ? Array.from(new Set(requestedGroupIndices)) : [index])
    : [index];
  const cropScope = action === 'crop'
    ? (options.cropScope === 'region'
      ? 'region'
      : (options.cropScope === 'single' ? 'single' : 'all'))
    : null;
  const startBounds = options.startBounds
    || getHitboxBoundsByIndices(selected, groupIndices)
    || { x: hb.x, y: hb.y, w: hb.w, h: hb.h };
  workbenchState.pinnedView = { ...view };
  workbenchState.hitboxIndex = index;
  state.selectedSpecial = 'hitbox';
  setHitboxSelection(groupIndices, groupIndices.length ? index : null);
  if (cropScope === 'region') {
    workbenchState.hitboxCropRegionRect = normalizeWorkbenchRegionRect(selected, startBounds);
    workbenchState.hitboxCropRegionObjectId = selected.id;
  }
  workbenchDrag = {
    kind: 'hitbox',
    mode: action,
    id: selected.id,
    index,
    groupIndices,
    handle,
    start,
    startBounds: { x: startBounds.x, y: startBounds.y, w: startBounds.w, h: startBounds.h },
    sourceHitboxes: cloneHitboxes(selected.hitboxes),
    selectedIndicesAtStart: selectedIndices,
    cropScope,
    regionRect: options.regionRect ? { ...options.regionRect } : null,
    view: { ...view },
    offsetX,
    offsetY,
    zoom
  };
  renderWorkbench();
};

const startWorkbenchHitboxRegionDrag = (
  e,
  selected,
  view,
  zoom,
  regionRect,
  handle = null,
  offsetX = 0,
  offsetY = 0
) => {
  if (!areWorkbenchGuidesEditable()) return;
  const start = getWorkbenchPointerLocal(e.clientX, e.clientY, view, zoom, offsetX, offsetY);
  if (!start) return;
  const normalizedRegion = normalizeWorkbenchRegionRect(selected, regionRect);
  if (!normalizedRegion) return;
  workbenchState.historyDeferred = true;
  workbenchState.pinnedView = { ...view };
  workbenchDrag = {
    kind: 'hitboxRegion',
    id: selected.id,
    handle,
    start,
    startBounds: { ...normalizedRegion },
    view: { ...view },
    offsetX,
    offsetY,
    zoom
  };
  renderWorkbench();
};

const startWorkbenchGuideDrag = (
  e,
  selected,
  view,
  zoom,
  axis,
  index,
  offsetX = 0,
  offsetY = 0
) => {
  if (!areWorkbenchGuidesEditable()) return;
  const key = axis === 'horizontal' ? 'horizontal' : (axis === 'vertical' ? 'vertical' : null);
  if (!key) return;
  const guides = ensureWorkbenchGuides();
  const value = guides[key]?.[index];
  if (!Number.isFinite(value)) return;
  const start = getWorkbenchPointerLocal(e.clientX, e.clientY, view, zoom, offsetX, offsetY);
  if (!start) return;
  selectWorkbenchGuide(key, index);
  workbenchState.historyDeferred = true;
  workbenchState.pinnedView = { ...view };
  workbenchDrag = {
    kind: 'guide',
    id: selected.id,
    axis: key,
    index,
    start,
    startValue: value,
    view: { ...view },
    offsetX,
    offsetY,
    zoom
  };
  renderWorkbench();
};

const updateWorkbenchDrag = (e) => {
  if (!workbenchDrag) return;
  const selected = getWorkbenchObject();
  if (!selected || selected.id !== workbenchDrag.id) {
    workbenchDrag = null;
    workbenchState.historyDeferred = false;
    workbenchState.pinnedView = null;
    renderWorkbench();
    return;
  }
  const local = getWorkbenchPointerLocal(
    e.clientX,
    e.clientY,
    workbenchDrag.view,
    workbenchDrag.zoom,
    workbenchDrag.offsetX || 0,
    workbenchDrag.offsetY || 0
  );
  if (!local) return;
  const dx = local.x - workbenchDrag.start.x;
  const dy = local.y - workbenchDrag.start.y;
  if (workbenchDrag.kind === 'guide') {
    const guides = ensureWorkbenchGuides();
    const axis = workbenchDrag.axis === 'horizontal' ? 'horizontal' : 'vertical';
    const list = guides[axis];
    if (!Array.isArray(list) || !Number.isInteger(workbenchDrag.index) || workbenchDrag.index < 0 || workbenchDrag.index >= list.length) {
      return;
    }
    const delta = axis === 'horizontal' ? dy : dx;
    list[workbenchDrag.index] = Math.round((workbenchDrag.startValue + delta) * 1000) / 1000;
    selectWorkbenchGuide(axis, workbenchDrag.index);
    renderWorkbench();
    return;
  }
  if (workbenchDrag.kind === 'crop') {
    let { x, y, w, h } = workbenchDrag.startCrop;
    const handle = workbenchDrag.handle;
    if (!handle) {
      x += dx;
      y += dy;
    } else {
      if (handle.includes('n')) {
        y += dy;
        h -= dy;
      }
      if (handle.includes('w')) {
        x += dx;
        w -= dx;
      }
      if (handle.includes('s')) {
        h += dy;
      }
      if (handle.includes('e')) {
        w += dx;
      }
    }
    const snappedCrop = applyWorkbenchGuideSnapToRect({ x, y, w, h }, handle, workbenchDrag.zoom);
    selected.crop = clampCrop(selected, snappedCrop);
    markWorkbenchDirty();
    renderWorkbench();
    return;
  }
  if (workbenchDrag.kind === 'hitboxRegion') {
    if (workbenchState.hitboxCropRegionStep !== 'region') return;
    const handle = workbenchDrag.handle;
    let nextBounds = { ...workbenchDrag.startBounds };
    if (!handle) {
      nextBounds.x += dx;
      nextBounds.y += dy;
    } else {
      nextBounds = resizeHitboxBoundsByHandle(workbenchDrag.startBounds, handle, dx, dy, 1);
    }
    nextBounds = applyWorkbenchGuideSnapToRect(nextBounds, handle, workbenchDrag.zoom);
    const normalizedRegion = normalizeWorkbenchRegionRect(selected, nextBounds);
    if (!normalizedRegion) return;
    workbenchState.hitboxCropRegionRect = { ...normalizedRegion };
    workbenchState.hitboxCropRegionObjectId = selected.id;
    // 1단계 영역을 조절하면 2단계 자르기 박스 시작점도 항상 새 영역 전체로 리셋한다.
    workbenchState.hitboxCropRegionCropRect = { ...normalizedRegion };
    workbenchState.hitboxCropRegionCropObjectId = selected.id;
    renderWorkbench();
    return;
  }
  if (workbenchDrag.kind === 'hitboxPoint') {
    const hb = selected.hitboxes?.[workbenchDrag.index];
    if (!hb || !isPolygonHitbox(hb)) return;
    const points = Array.isArray(workbenchDrag.absolutePointsStart)
      ? workbenchDrag.absolutePointsStart.map((point) => ({ ...point }))
      : [];
    if (!points.length || !points[workbenchDrag.pointIndex]) return;
    const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
    const bounds = getWorkbenchPaintBounds(selected, meta.w, meta.h);
    const nextPoint = {
      x: workbenchDrag.startPoint.x + dx,
      y: workbenchDrag.startPoint.y + dy
    };
    points[workbenchDrag.pointIndex] = clampWorkbenchPointToBounds(nextPoint, bounds) || nextPoint;
    const rebuilt = rebuildPolygonHitboxFromAbsolutePoints(selected, hb, points);
    if (!rebuilt) return;
    selected.hitboxes[workbenchDrag.index] = rebuilt;
    markWorkbenchDirty();
    renderWorkbench();
    return;
  }
  if (workbenchDrag.kind === 'hitbox') {
    const handle = workbenchDrag.handle;
    const mode = workbenchDrag.mode || 'move';
    const hb = selected.hitboxes[workbenchDrag.index];
    if (mode !== 'crop' && !hb) return;
    if (mode === 'crop') {
      if (workbenchDrag.cropScope === 'region' && workbenchState.hitboxCropRegionStep !== 'crop') return;
      if (!handle) return;
      let cropRect = resizeHitboxBoundsByHandle(workbenchDrag.startBounds, handle, dx, dy, 1);
      cropRect = applyWorkbenchGuideSnapToRect(cropRect, handle, workbenchDrag.zoom);
      const sourceHitboxes = workbenchDrag.sourceHitboxes || cloneHitboxes(selected.hitboxes);
      const sourceSelected = { ...selected, hitboxes: sourceHitboxes };
      let regionRect = null;
      if (workbenchDrag.cropScope === 'region') {
        regionRect = normalizeWorkbenchRegionRect(
          sourceSelected,
          workbenchDrag.regionRect || workbenchState.hitboxCropRegionRect || cropRect
        );
        if (regionRect) {
          workbenchState.hitboxCropRegionRect = { ...regionRect };
          workbenchState.hitboxCropRegionObjectId = selected.id;
          cropRect = normalizeWorkbenchCropRectInRegion(sourceSelected, cropRect, regionRect) || cropRect;
          workbenchState.hitboxCropRegionCropRect = { ...cropRect };
          workbenchState.hitboxCropRegionCropObjectId = selected.id;
        }
      }
      const baseTargetIndices = workbenchDrag.cropScope === 'region'
        ? getHitboxIndicesIntersectingRect(sourceSelected, regionRect || cropRect)
        : ((workbenchDrag.groupIndices && workbenchDrag.groupIndices.length)
          ? workbenchDrag.groupIndices
          : [workbenchDrag.index]);
      const targetIndices = new Set(
        baseTargetIndices
          .map((idx) => Number(idx))
          .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < sourceHitboxes.length)
      );
      const replacement = new Map();
      targetIndices.forEach((oldIdx) => {
        const source = sourceHitboxes[oldIdx];
        if (!source) return;
        const clipped = clipHitboxToRect(source, cropRect);
        if (!clipped) return;
        const normalized = clampHitboxToObjectBounds(selected, clipped, { fallbackToNearest: false });
        if (!normalized) return;
        replacement.set(oldIdx, normalized);
      });
      const rebuilt = [];
      const indexMap = new Map();
      sourceHitboxes.forEach((source, oldIdx) => {
        if (!targetIndices.has(oldIdx)) {
          indexMap.set(oldIdx, rebuilt.length);
          rebuilt.push({ ...source });
          return;
        }
        const next = replacement.get(oldIdx);
        if (next) {
          indexMap.set(oldIdx, rebuilt.length);
          rebuilt.push(next);
        }
      });
      selected.hitboxes = rebuilt;
      const previousSelection = (workbenchDrag.selectedIndicesAtStart && workbenchDrag.selectedIndicesAtStart.length)
        ? workbenchDrag.selectedIndicesAtStart
        : baseTargetIndices;
      const nextSelection = previousSelection
        .map((oldIdx) => indexMap.get(oldIdx))
        .filter((idx) => Number.isInteger(idx));
      const nextPrimary =
        indexMap.get(workbenchDrag.index)
        ?? (nextSelection.length ? nextSelection[nextSelection.length - 1] : null);
      setHitboxSelection(nextSelection, nextPrimary);
      workbenchState.hitboxIndex = state.selectedHitboxIndex ?? 0;
      markWorkbenchDirty();
      renderWorkbench();
      return;
    }
    let nextBounds;
    if (!handle) {
      nextBounds = {
        x: workbenchDrag.startBounds.x + dx,
        y: workbenchDrag.startBounds.y + dy,
        w: Math.max(1, Number(workbenchDrag.startBounds.w) || 1),
        h: Math.max(1, Number(workbenchDrag.startBounds.h) || 1)
      };
    } else {
      nextBounds = resizeHitboxBoundsByHandle(workbenchDrag.startBounds, handle, dx, dy, 1);
    }
    nextBounds = applyWorkbenchGuideSnapToRect(nextBounds, handle, workbenchDrag.zoom);
    hb.x = Math.round(nextBounds.x);
    hb.y = Math.round(nextBounds.y);
    hb.w = Math.max(1, Math.round(nextBounds.w));
    hb.h = Math.max(1, Math.round(nextBounds.h));
    const normalized = clampHitboxToObjectBounds(selected, hb);
    hb.x = normalized.x;
    hb.y = normalized.y;
    hb.w = normalized.w;
    hb.h = normalized.h;
    markWorkbenchDirty();
    renderWorkbench();
  }
};

const endWorkbenchDrag = () => {
  if (!workbenchDrag) {
    workbenchState.historyDeferred = false;
    return;
  }
  workbenchDrag = null;
  workbenchState.historyDeferred = false;
  recordWorkbenchHistory();
  workbenchState.pinnedView = null;
  renderWorkbench();
};

const renderWorkbenchCanvas = (selected) => {
  if (!els.workbenchCanvas) return;
  els.workbenchCanvas.innerHTML = '';
  if (!selected) {
    workbenchState.renderContext = null;
    return;
  }
  const guidesVisible = areWorkbenchGuidesVisible();
  const guidesEditable = areWorkbenchGuidesEditable();
  const objectAction = state.selectionTarget === 'object' ? getSelectionAction('object') : 'move';
  const zoom = clampWorkbenchZoom(workbenchState.zoom);
  const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
  const crop = selected.crop ? getObjectCrop(selected) : getFullObjectCrop(selected);
  const useCroppedPreview = !!selected.crop && objectAction !== 'crop';
  const previewOffsetX = useCroppedPreview ? crop.x : 0;
  const previewOffsetY = useCroppedPreview ? crop.y : 0;
  const view = getWorkbenchViewRect(selected, meta, crop, {
    offsetX: previewOffsetX,
    offsetY: previewOffsetY,
    minX: -previewOffsetX,
    minY: -previewOffsetY,
    maxX: meta.w - previewOffsetX,
    maxY: meta.h - previewOffsetY
  });
  const paintEnabled = !!workbenchState.paint.enabled;
  workbenchState.renderContext = {
    view: { ...view },
    zoom,
    previewOffsetX,
    previewOffsetY,
    sourceObjectId: selected.id
  };
  const stage = document.createElement('div');
  stage.className = 'workbench-stage';
  stage.style.width = `${view.w * zoom}px`;
  stage.style.height = `${view.h * zoom}px`;
  stage.style.overflow = 'hidden';
  const guideTool = normalizeWorkbenchGuideTool(workbenchState.guideTool);
  if (guideTool !== 'none' && guidesVisible && guidesEditable && !paintEnabled) {
    stage.classList.add('is-guide-tool');
  }

  const isPlayerSource = workbenchState.sourceType === 'player';
  const source = isTextureSprite(selected.sprite)
    ? document.createElement('div')
    : document.createElement('img');
  source.className = 'workbench-source';
  if (isTextureSprite(selected.sprite)) {
    const textureType = getTextureTypeFromSprite(selected.sprite);
    const fillStyle = getTextureFillStyle(textureType, selected.textureColor);
    source.style.backgroundImage = fillStyle.image;
    source.style.backgroundColor = fillStyle.color;
    source.style.backgroundSize = fillStyle.size;
    source.style.backgroundRepeat = fillStyle.repeat;
  } else {
    source.src = isPlayerSource ? `${sejongBase}${selected.sprite}` : getSpriteSourcePath(selected.sprite);
  }
  source.style.width = `${meta.w * zoom}px`;
  source.style.height = `${meta.h * zoom}px`;
  if (useCroppedPreview) {
    const sourceWindow = document.createElement('div');
    sourceWindow.className = 'workbench-source-window';
    sourceWindow.style.position = 'absolute';
    sourceWindow.style.left = `${-view.x * zoom}px`;
    sourceWindow.style.top = `${-view.y * zoom}px`;
    sourceWindow.style.width = `${crop.w * zoom}px`;
    sourceWindow.style.height = `${crop.h * zoom}px`;
    sourceWindow.style.overflow = 'hidden';
    sourceWindow.style.pointerEvents = 'none';
    source.style.left = `${-crop.x * zoom}px`;
    source.style.top = `${-crop.y * zoom}px`;
    sourceWindow.appendChild(source);
    stage.appendChild(sourceWindow);
  } else {
    source.style.left = `${-view.x * zoom}px`;
    source.style.top = `${-view.y * zoom}px`;
    stage.appendChild(source);
  }

  if (guidesVisible) {
    const guides = ensureWorkbenchGuides();
    guides.horizontal.forEach((value, index) => {
      const y = (value - previewOffsetY - view.y) * zoom;
      if (y < -1 || y > view.h * zoom + 1) return;
      const line = document.createElement('div');
      line.className = 'wb-guide-line horizontal';
      const isSelected =
        workbenchState.selectedGuide?.axis === 'horizontal'
        && workbenchState.selectedGuide?.index === index;
      line.classList.toggle('is-selected', !!isSelected);
      line.style.top = `${y}px`;
      line.style.pointerEvents = guideTool === 'none' && guidesEditable ? 'auto' : 'none';
      if (guidesEditable) {
        line.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          if (normalizeWorkbenchGuideTool(workbenchState.guideTool) === 'none') {
            startWorkbenchGuideDrag(
              e,
              selected,
              view,
              zoom,
              'horizontal',
              index,
              previewOffsetX,
              previewOffsetY
            );
          } else {
            selectWorkbenchGuide('horizontal', index);
            renderWorkbench();
          }
        });
      }
      stage.appendChild(line);
    });
    guides.vertical.forEach((value, index) => {
      const x = (value - previewOffsetX - view.x) * zoom;
      if (x < -1 || x > view.w * zoom + 1) return;
      const line = document.createElement('div');
      line.className = 'wb-guide-line vertical';
      const isSelected =
        workbenchState.selectedGuide?.axis === 'vertical'
        && workbenchState.selectedGuide?.index === index;
      line.classList.toggle('is-selected', !!isSelected);
      line.style.left = `${x}px`;
      line.style.pointerEvents = guideTool === 'none' && guidesEditable ? 'auto' : 'none';
      if (guidesEditable) {
        line.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          if (normalizeWorkbenchGuideTool(workbenchState.guideTool) === 'none') {
            startWorkbenchGuideDrag(
              e,
              selected,
              view,
              zoom,
              'vertical',
              index,
              previewOffsetX,
              previewOffsetY
            );
          } else {
            selectWorkbenchGuide('vertical', index);
            renderWorkbench();
          }
        });
      }
      stage.appendChild(line);
    });
  }

  if (paintEnabled && guidesVisible && guidesEditable) {
    const paintTool = clampWorkbenchPaintTool(workbenchState.paint.tool);
    const shapeOverlay = renderWorkbenchPointToolOverlay(
      workbenchState.paint.points,
      view,
      zoom,
      previewOffsetX,
      previewOffsetY,
      paintTool
    );
    if (shapeOverlay) {
      stage.appendChild(shapeOverlay);
    }
    stage.addEventListener('pointerdown', (e) => {
      startWorkbenchPointToolTap(e, selected, view, zoom, meta, previewOffsetX, previewOffsetY);
    });
  }

  if (guidesVisible) {
    const objectAction = getSelectionAction('object');
    const hitboxAction = getSelectionAction('hitbox');
    const hitboxCropMode = !paintEnabled && state.selectionTarget === 'hitbox' && hitboxAction === 'crop';

    if (!paintEnabled && !hitboxCropMode) {
      const cropRect = document.createElement('div');
      cropRect.className = 'wb-crop-rect';
      cropRect.style.left = `${(crop.x - previewOffsetX - view.x) * zoom}px`;
      cropRect.style.top = `${(crop.y - previewOffsetY - view.y) * zoom}px`;
      cropRect.style.width = `${crop.w * zoom}px`;
      cropRect.style.height = `${crop.h * zoom}px`;
      cropRect.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const handle = e.target?.dataset?.handle || null;
        if (!canSelectObjectTarget()) return;
        if ((objectAction === 'move' && handle) || (objectAction === 'resize' && !handle)) {
          renderWorkbench();
          renderWorld();
          syncProperties();
          return;
        }
        if (!guidesEditable) return;
        startWorkbenchCropDrag(
          e,
          selected,
          view,
          zoom,
          crop,
          handle,
          previewOffsetX,
          previewOffsetY
        );
      });
      if (guidesEditable) {
        WORKBENCH_HANDLES.forEach((handle) => {
          const h = document.createElement('div');
          h.className = 'wb-crop-handle';
          h.dataset.handle = handle;
          cropRect.appendChild(h);
        });
      }
      stage.appendChild(cropRect);
    }

    const workbenchHitboxes = selected.crop
      ? selected.hitboxes
        .map((hitbox, idx) => ({
          index: idx,
          hitbox: clampHitboxToObjectBounds(selected, hitbox, { fallbackToNearest: false })
        }))
        .filter((entry) => !!entry.hitbox)
      : selected.hitboxes.map((hitbox, idx) => ({ index: idx, hitbox }));

    workbenchHitboxes.forEach((entry) => {
      const idx = entry.index;
      const hb = entry.hitbox;
      const isPoly = isPolygonHitbox(hb);
      const isActive = idx === workbenchState.hitboxIndex;
      const hbEl = document.createElement('div');
      hbEl.className = `wb-hitbox${isActive ? ' is-active' : ''}${paintEnabled ? ' is-passive' : ''}`;
      hbEl.style.left = `${(hb.x - previewOffsetX - view.x) * zoom}px`;
      hbEl.style.top = `${(hb.y - previewOffsetY - view.y) * zoom}px`;
      hbEl.style.width = `${Math.max(1, hb.w) * zoom}px`;
      hbEl.style.height = `${Math.max(1, hb.h) * zoom}px`;
      const rotation = normalizeHitboxRotation(hb.rotation, 0);
      hbEl.style.transformOrigin = 'center center';
      hbEl.style.transform = !isPoly && rotation ? `rotate(${rotation}deg)` : '';
      if (isPoly) {
        const safeW = Math.max(1, Number(hb.w) || 1);
        const safeH = Math.max(1, Number(hb.h) || 1);
        const polygonPoints = (normalizePolygonPoints ? normalizePolygonPoints(hb.points) : hb.points) || hb.points;
        const clipPath = (Array.isArray(polygonPoints) ? polygonPoints : [])
          .map((point) => {
            const px = Math.max(0, Math.min(100, ((Number(point.x) || 0) / safeW) * 100));
            const py = Math.max(0, Math.min(100, ((Number(point.y) || 0) / safeH) * 100));
            return `${px}% ${py}%`;
          })
          .join(', ');
        if (clipPath) hbEl.style.clipPath = `polygon(${clipPath})`;
        if (Array.isArray(polygonPoints) && polygonPoints.length >= 3) {
          const insertSelection = normalizeInsertPointSelection(
            workbenchState.paint.insertSelection,
            polygonPoints.length
          );
          const insertEdge = getAdjacentPolygonEdgeFromSelection(polygonPoints.length, insertSelection);
          const edgeSlip = normalizePolygonEdgeSlipForHitbox(hb) || new Array(polygonPoints.length).fill(true);
          const selectedEdgeIndex =
            workbenchState.paint.selectedEdgeHitboxIndex === idx
            && Number.isInteger(workbenchState.paint.selectedEdgeIndex)
              ? Math.max(0, Math.min(polygonPoints.length - 1, workbenchState.paint.selectedEdgeIndex))
              : null;
          const canEditEdgeSlip =
            isActive
            && guidesEditable
            && !paintEnabled
            && canSelectHitboxTarget()
            && getSelectionAction('hitbox') === 'move'
            && !!workbenchState.paint.edgeSlipMode;
          const canSelectEdgeSlipPoints = canEditEdgeSlip;
          const canDragPolygonPoints =
            isActive
            && guidesEditable
            && !paintEnabled
            && !workbenchState.paint.edgeSlipMode
            && !workbenchState.paint.insertMode
            && canSelectHitboxTarget()
            && getSelectionAction('hitbox') === 'move';
          const canInsertPolygonPoints =
            isActive
            && guidesEditable
            && !paintEnabled
            && !workbenchState.paint.edgeSlipMode
            && canSelectHitboxTarget()
            && getSelectionAction('hitbox') === 'move'
            && !!workbenchState.paint.insertMode;
          const edgeVisuals = [];
          const polySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          polySvg.setAttribute('class', 'wb-hitbox-poly-overlay');
          polySvg.setAttribute('viewBox', `0 0 ${safeW} ${safeH}`);
          polySvg.setAttribute('preserveAspectRatio', 'none');
          polySvg.style.pointerEvents = (canDragPolygonPoints || canInsertPolygonPoints || canEditEdgeSlip) ? 'auto' : 'none';
          if (canEditEdgeSlip && polygonPoints.length >= 2) {
            for (let edgeIndex = 0; edgeIndex < polygonPoints.length; edgeIndex += 1) {
              const from = polygonPoints[edgeIndex];
              const to = polygonPoints[(edgeIndex + 1) % polygonPoints.length];
              if (!from || !to) continue;
              const slipEnabled = edgeSlip[edgeIndex] !== false;
              edgeVisuals.push({
                edgeIndex,
                from,
                to,
                slipEnabled,
                selected: selectedEdgeIndex === edgeIndex
              });
            }
          }
          const polyShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          polyShape.setAttribute(
            'points',
            polygonPoints.map((point) => `${Number(point.x) || 0},${Number(point.y) || 0}`).join(' ')
          );
          polyShape.setAttribute('class', `wb-hitbox-poly-shape${isActive ? ' is-active' : ''}`);
          polyShape.style.pointerEvents = canInsertPolygonPoints ? 'all' : 'none';
          if (canInsertPolygonPoints) {
            polyShape.style.cursor = 'copy';
            polyShape.addEventListener('pointerdown', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!insertEdge) return;
              const local = getWorkbenchPointerLocal(
                e.clientX,
                e.clientY,
                view,
                zoom,
                previewOffsetX,
                previewOffsetY
              );
              if (!local) return;
              const hbNow = selected.hitboxes?.[idx];
              if (!hbNow || !isPolygonHitbox(hbNow)) return;
              const pointsNow = (normalizePolygonPoints ? normalizePolygonPoints(hbNow.points) : hbNow.points) || [];
              const absoluteNow = pointsNow.map((point) => ({
                x: (Number(hbNow.x) || 0) + (Number(point.x) || 0),
                y: (Number(hbNow.y) || 0) + (Number(point.y) || 0)
              }));
              if (!absoluteNow.length) return;
              const fromPoint = absoluteNow[insertEdge.from];
              const toPoint = absoluteNow[insertEdge.to];
              if (!fromPoint || !toPoint) return;
              const projected = projectPointToSegment(local, fromPoint, toPoint);
              const nextPoints = [...absoluteNow];
              nextPoints.splice(insertEdge.insertAt, 0, {
                x: Math.round(projected.x * 1000) / 1000,
                y: Math.round(projected.y * 1000) / 1000
              });
              const rebuilt = rebuildPolygonHitboxFromAbsolutePoints(selected, hbNow, nextPoints);
              if (!rebuilt) return;
              const priorEdgeSlip = normalizePolygonEdgeSlipForHitbox(hbNow) || new Array(absoluteNow.length).fill(true);
              if (Array.isArray(priorEdgeSlip) && priorEdgeSlip.length >= 3) {
                const nextEdgeSlip = [...priorEdgeSlip];
                const baseEdgeIndex = insertEdge.from;
                const copied = priorEdgeSlip[baseEdgeIndex] !== false;
                nextEdgeSlip.splice(insertEdge.insertAt, 0, copied);
                rebuilt.edgeSlip = normalizePolygonEdgeSlip(nextEdgeSlip, nextPoints.length) || nextEdgeSlip;
              }
              selected.hitboxes.splice(idx, 1, rebuilt);
              clearWorkbenchInsertSelection();
              renderWorkbench();
              syncProperties();
              markWorkbenchDirty();
            });
          }
          polySvg.appendChild(polyShape);
          if (edgeVisuals.length) {
            edgeVisuals.forEach((entry) => {
              const edgeStroke = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              edgeStroke.setAttribute('x1', String(Number(entry.from.x) || 0));
              edgeStroke.setAttribute('y1', String(Number(entry.from.y) || 0));
              edgeStroke.setAttribute('x2', String(Number(entry.to.x) || 0));
              edgeStroke.setAttribute('y2', String(Number(entry.to.y) || 0));
              edgeStroke.setAttribute(
                'class',
                `wb-hitbox-poly-edge${entry.slipEnabled ? ' is-slip-on' : ' is-slip-off'}${
                  entry.selected ? ' is-selected' : ''
                }`
              );
              edgeStroke.style.pointerEvents = 'none';
              polySvg.appendChild(edgeStroke);
              if (entry.selected) {
                const mx = ((Number(entry.from.x) || 0) + (Number(entry.to.x) || 0)) / 2;
                const my = ((Number(entry.from.y) || 0) + (Number(entry.to.y) || 0)) / 2;
                const edgeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                edgeLabel.setAttribute('x', String(mx));
                edgeLabel.setAttribute('y', String(my - 6));
                edgeLabel.setAttribute('text-anchor', 'middle');
                edgeLabel.setAttribute(
                  'class',
                  `wb-hitbox-poly-edge-label${entry.slipEnabled ? ' is-slip-on' : ' is-slip-off'}`
                );
                edgeLabel.textContent = entry.slipEnabled ? 'ON' : 'OFF';
                polySvg.appendChild(edgeLabel);
              }
            });
          }
          if (isActive || paintEnabled) {
            polygonPoints.forEach((point, pointIndex) => {
              const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              dot.setAttribute('cx', String(Number(point.x) || 0));
              dot.setAttribute('cy', String(Number(point.y) || 0));
              dot.setAttribute('r', String(isActive ? 2.6 : 2.2));
              dot.setAttribute('class', `wb-hitbox-poly-dot${isActive ? ' is-active' : ''}`);
              const isInsertSelected = (canInsertPolygonPoints || canSelectEdgeSlipPoints) && insertSelection.includes(pointIndex);
              if (isInsertSelected) {
                dot.setAttribute('class', `${dot.getAttribute('class')} is-selected`);
                dot.setAttribute('r', '4.2');
              }
              dot.style.pointerEvents = canDragPolygonPoints ? 'all' : 'none';
              if (canInsertPolygonPoints || canSelectEdgeSlipPoints) {
                const dotHit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dotHit.setAttribute('cx', String(Number(point.x) || 0));
                dotHit.setAttribute('cy', String(Number(point.y) || 0));
                dotHit.setAttribute('r', '8');
                dotHit.setAttribute('class', 'wb-hitbox-poly-dot-hit');
                dotHit.style.pointerEvents = 'all';
                dotHit.style.cursor = 'pointer';
                if (canSelectEdgeSlipPoints) {
                  dotHit.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const hbNow = selected.hitboxes?.[idx];
                    if (!hbNow || !isPolygonHitbox(hbNow)) return;
                    const pointsNow = (normalizePolygonPoints ? normalizePolygonPoints(hbNow.points) : hbNow.points) || [];
                    toggleWorkbenchInsertPointSelection(idx, pointIndex, pointsNow.length);
                    const selectionNow = normalizeInsertPointSelection(
                      workbenchState.paint.insertSelection,
                      pointsNow.length
                    );
                    const edgeNow = getAdjacentPolygonEdgeFromSelection(pointsNow.length, selectionNow);
                    let changed = false;
                    if (edgeNow) {
                      const edgeIndex = Math.max(0, Math.min(pointsNow.length - 1, edgeNow.from));
                      const nextEnabled = !isPolygonEdgeSlipEnabled(hbNow, edgeIndex);
                      workbenchState.paint.selectedEdgeHitboxIndex = idx;
                      workbenchState.paint.selectedEdgeIndex = edgeIndex;
                      changed = setPolygonEdgeSlipEnabled(hbNow, edgeIndex, nextEnabled);
                      setWorkbenchEdgeSlipFeedback(`선분 ${edgeIndex + 1} ${nextEnabled ? 'ON' : 'OFF'} 적용`);
                      clearWorkbenchInsertSelection();
                    } else if (selectionNow.length < 2) {
                      clearWorkbenchEdgeSelection();
                    }
                    renderWorkbench();
                    syncProperties();
                    if (changed) markWorkbenchDirty();
                  });
                } else if (canInsertPolygonPoints) {
                  dotHit.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWorkbenchInsertPointSelection(idx, pointIndex, polygonPoints.length);
                    renderWorkbench();
                    syncProperties();
                  });
                }
                polySvg.appendChild(dotHit);
              }
              if (canDragPolygonPoints) {
                dot.style.cursor = 'grab';
                dot.addEventListener('pointerdown', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startWorkbenchPolygonPointDrag(
                    e,
                    selected,
                    view,
                    zoom,
                    idx,
                    pointIndex,
                    previewOffsetX,
                    previewOffsetY
                  );
                });
              }
              polySvg.appendChild(dot);
            });
          }
          hbEl.appendChild(polySvg);
        }
      }
      hbEl.dataset.label = String(idx + 1);
      const shouldShowHandles = idx === workbenchState.hitboxIndex
        && !(state.selectionTarget === 'hitbox' && hitboxAction === 'crop')
        && !isPoly
        && !paintEnabled;
      if (shouldShowHandles) {
        WORKBENCH_HANDLES.forEach((handle) => {
          const h = document.createElement('div');
          h.className = 'wb-hitbox-handle';
          h.dataset.handle = handle;
          hbEl.appendChild(h);
        });
      }
      if (!paintEnabled) {
        hbEl.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canSelectHitboxTarget()) return;
          const handle = e.target?.dataset?.handle || null;
          const action = getSelectionAction('hitbox');
          if (isPoly && action !== 'move') {
            workbenchState.hitboxIndex = idx;
            state.selectedSpecial = 'hitbox';
            setHitboxSelection([idx], idx);
            renderWorkbench();
            renderWorld();
            syncProperties();
            return;
          }
          if (
            (action === 'move' && handle)
            || (action === 'resize' && !handle)
            || (action === 'crop' && !handle)
          ) {
            workbenchState.hitboxIndex = idx;
            state.selectedSpecial = 'hitbox';
            setHitboxSelection([idx], idx);
            renderWorkbench();
            renderWorld();
            syncProperties();
            return;
          }
          if (!guidesEditable) return;
          startWorkbenchHitboxDrag(
            e,
            selected,
            view,
            zoom,
            idx,
            handle,
            previewOffsetX,
            previewOffsetY
          );
        });
      }
      stage.appendChild(hbEl);
    });

    if (!paintEnabled && hitboxCropMode) {
      const allIndices = selected.hitboxes.map((_, idx) => idx);
      const activeIndex = clampWorkbenchHitboxIndex(selected);
      const cropScope = workbenchState.hitboxCropScope === 'single'
        ? 'single'
        : (workbenchState.hitboxCropScope === 'region' ? 'region' : 'all');
      if (cropScope === 'region') {
        const regionBounds = ensureWorkbenchHitboxCropRegion(selected);
        const cropTargetIndices = getHitboxIndicesIntersectingRect(selected, regionBounds);
        const cropBounds = ensureWorkbenchHitboxCropRegionCrop(selected, regionBounds);
        const regionStep = workbenchState.hitboxCropRegionStep === 'crop' ? 'crop' : 'region';
        if (regionBounds) {
          const regionBox = document.createElement('div');
          regionBox.className = `wb-hitbox-region-rect${regionStep !== 'region' ? ' is-inactive' : ''}`;
          regionBox.dataset.label = `1단계 영역 설정 (${cropTargetIndices.length})`;
          regionBox.style.left = `${(regionBounds.x - previewOffsetX - view.x) * zoom}px`;
          regionBox.style.top = `${(regionBounds.y - previewOffsetY - view.y) * zoom}px`;
          regionBox.style.width = `${Math.max(1, regionBounds.w) * zoom}px`;
          regionBox.style.height = `${Math.max(1, regionBounds.h) * zoom}px`;
          regionBox.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (regionStep !== 'region') return;
            if (!guidesEditable) return;
            safeSetPointerCapture(regionBox, e.pointerId);
            const handle = e.target?.dataset?.handle || null;
            startWorkbenchHitboxRegionDrag(
              e,
              selected,
              view,
              zoom,
              regionBounds,
              handle,
              previewOffsetX,
              previewOffsetY
            );
          });
          if (guidesEditable) {
            WORKBENCH_HANDLES.forEach((handle) => {
              const h = document.createElement('div');
              h.className = 'wb-crop-handle';
              h.dataset.handle = handle;
              regionBox.appendChild(h);
            });
          }
          stage.appendChild(regionBox);
        }
        if (regionStep === 'crop' && cropBounds) {
          const cropBox = document.createElement('div');
          cropBox.className = `wb-hitbox-crop-rect${regionStep !== 'crop' ? ' is-inactive' : ''}`;
          cropBox.dataset.label = `2단계 실제 자르기 (${cropTargetIndices.length})`;
          cropBox.style.left = `${(cropBounds.x - previewOffsetX - view.x) * zoom}px`;
          cropBox.style.top = `${(cropBounds.y - previewOffsetY - view.y) * zoom}px`;
          cropBox.style.width = `${Math.max(1, cropBounds.w) * zoom}px`;
          cropBox.style.height = `${Math.max(1, cropBounds.h) * zoom}px`;
          const primaryIndex = cropTargetIndices.includes(workbenchState.hitboxIndex)
            ? workbenchState.hitboxIndex
            : (cropTargetIndices.length ? cropTargetIndices[cropTargetIndices.length - 1] : activeIndex);
          cropBox.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (regionStep !== 'crop') return;
            const handle = e.target?.dataset?.handle || null;
            if (!handle) return;
            if (!guidesEditable) return;
            startWorkbenchHitboxDrag(
              e,
              selected,
              view,
              zoom,
              primaryIndex,
              handle,
              previewOffsetX,
              previewOffsetY,
              {
                groupIndices: cropTargetIndices,
                startBounds: cropBounds,
                cropScope,
                regionRect: regionBounds
              }
            );
          });
          if (guidesEditable) {
            WORKBENCH_HANDLES.forEach((handle) => {
              const h = document.createElement('div');
              h.className = 'wb-crop-handle';
              h.dataset.handle = handle;
              cropBox.appendChild(h);
            });
          }
          stage.appendChild(cropBox);
        }
      } else {
        const cropTargetIndices = cropScope === 'single' ? [activeIndex] : allIndices;
        const cropBounds = getHitboxBoundsByIndices(selected, cropTargetIndices);
        if (cropBounds) {
          const cropBox = document.createElement('div');
          cropBox.className = 'wb-hitbox-crop-rect';
          cropBox.dataset.label = cropScope === 'single'
            ? `히트박스 ${activeIndex + 1} 자르기`
            : `히트박스 전체 자르기 (${allIndices.length})`;
          cropBox.style.left = `${(cropBounds.x - previewOffsetX - view.x) * zoom}px`;
          cropBox.style.top = `${(cropBounds.y - previewOffsetY - view.y) * zoom}px`;
          cropBox.style.width = `${Math.max(1, cropBounds.w) * zoom}px`;
          cropBox.style.height = `${Math.max(1, cropBounds.h) * zoom}px`;
          const primaryIndex = cropTargetIndices.includes(workbenchState.hitboxIndex)
            ? workbenchState.hitboxIndex
            : cropTargetIndices[cropTargetIndices.length - 1];
          cropBox.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const handle = e.target?.dataset?.handle || null;
            if (!handle) return;
            if (!guidesEditable) return;
            startWorkbenchHitboxDrag(
              e,
              selected,
              view,
              zoom,
              primaryIndex,
              handle,
              previewOffsetX,
              previewOffsetY,
              {
                groupIndices: cropTargetIndices,
                startBounds: cropBounds,
                cropScope
              }
            );
          });
          if (guidesEditable) {
            WORKBENCH_HANDLES.forEach((handle) => {
              const h = document.createElement('div');
              h.className = 'wb-crop-handle';
              h.dataset.handle = handle;
              cropBox.appendChild(h);
            });
          }
          stage.appendChild(cropBox);
        }
      }
    }
  }

  els.workbenchCanvas.appendChild(stage);
};

const renderWorkbench = () => {
  if (!els.workbenchOverlay) return;
  els.workbenchOverlay.classList.toggle('hidden', !workbenchState.open);
  updateWorkbenchTitle();
  if (!workbenchState.open) {
    updateWorkbenchHistoryButtons();
    if (els.workbenchClearHitboxes) els.workbenchClearHitboxes.disabled = true;
    return;
  }
  updateWorkbenchZoomLabel();
  updateWorkbenchFocusButton();
  const selected = getWorkbenchObject();
  const hasObject = !!selected;
  updateWorkbenchHistoryButtons();
  if (els.workbenchClearHitboxes) {
    els.workbenchClearHitboxes.disabled = !(selected?.hitboxes?.length);
  }
  if (!hasObject) {
    resetWorkbenchPaintMask();
    workbenchState.paint.enabled = false;
  }
  if (!areWorkbenchGuidesEditable() && workbenchState.paint.enabled) {
    workbenchState.paint.enabled = false;
  }
  if (els.workbenchEmpty) els.workbenchEmpty.classList.toggle('hidden', hasObject);
  if (els.workbenchModeControls) els.workbenchModeControls.classList.toggle('hidden', !hasObject);
  if (els.workbenchRulerHorizontal) els.workbenchRulerHorizontal.classList.toggle('hidden', !hasObject);
  if (els.workbenchRulerVertical) els.workbenchRulerVertical.classList.toggle('hidden', !hasObject);
  if (els.workbenchRulerCorner) els.workbenchRulerCorner.classList.toggle('hidden', !hasObject);
  updateWorkbenchModeButtons(selected);
  updateWorkbenchGuideControls(selected);
  updateWorkbenchCropControls(selected);
  updateWorkbenchHitboxControls(selected);
  updateWorkbenchPaintControls(selected);
  renderWorkbenchCanvas(selected);
};

const openWorkbench = () => {
  const isPlayerSource = state.selectedSpecial === 'player';
  const selected = isPlayerSource ? createWorkbenchPlayerObject() : getSelected();
  if (!selected) {
    alert('오브젝트 또는 캐릭터를 먼저 선택하세요.');
    return;
  }
  workbenchState.open = true;
  workbenchState.sourceType = isPlayerSource ? 'player' : 'object';
  workbenchState.sourceObjectId = selected.id;
  workbenchState.sourcePlayerObject = isPlayerSource ? selected : null;
  workbenchState.paint.enabled = false;
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchPaintPoints();
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  workbenchState.guideTool = 'none';
  workbenchState.guideSnap = true;
  clearWorkbenchGuides();
  workbenchState.snapshot = cloneWorkbenchSnapshot(selected);
  initWorkbenchHistory(selected);
  workbenchState.hitboxCropRegionStep = 'region';
  workbenchState.hitboxCropRegionRect = null;
  workbenchState.hitboxCropRegionObjectId = null;
  workbenchState.hitboxCropRegionCropRect = null;
  workbenchState.hitboxCropRegionCropObjectId = null;
  if (els.workbenchZoom) {
    setWorkbenchZoom(Number(els.workbenchZoom.value) || workbenchState.zoom);
  }
  state.selectionTarget = 'object';
  state.selectedSpecial = null;
  setHitboxSelection([], null);
  workbenchState.focusMode = true;
  renderWorkbench();
  requestAnimationFrame(() => {
    if (!workbenchState.open) return;
    fitWorkbenchView('focus');
  });
  syncProperties();
};

const closeWorkbench = () => {
  const wasPlayerSource = workbenchState.sourceType === 'player';
  const selected = getWorkbenchObject();
  if (selected && workbenchState.snapshot && workbenchState.dirty) {
    applyWorkbenchSnapshot(selected, workbenchState.snapshot);
    renderWorld();
    syncProperties();
  }
  workbenchState.open = false;
  workbenchState.sourceType = 'object';
  workbenchState.sourceObjectId = null;
  workbenchState.sourcePlayerObject = null;
  workbenchState.snapshot = null;
  workbenchState.dirty = false;
  workbenchState.history = [];
  workbenchState.historyIndex = -1;
  workbenchState.historySignature = '';
  workbenchState.historyDeferred = false;
  workbenchState.historyApplying = false;
  workbenchState.guideTool = 'none';
  workbenchState.guideSnap = true;
  clearWorkbenchGuides();
  workbenchState.renderContext = null;
  workbenchState.hitboxCropRegionStep = 'region';
  workbenchState.hitboxCropRegionRect = null;
  workbenchState.hitboxCropRegionObjectId = null;
  workbenchState.hitboxCropRegionCropRect = null;
  workbenchState.hitboxCropRegionCropObjectId = null;
  workbenchDrag = null;
  workbenchPanDrag = null;
  workbenchState.pinnedView = null;
  workbenchState.paint.enabled = false;
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  resetWorkbenchPaintMask();
  if (els.workbenchCanvasWrap) {
    els.workbenchCanvasWrap.classList.remove('is-panning');
  }
  if (wasPlayerSource) {
    state.selectedId = null;
    state.selectedIds = [];
    state.selectedSpecial = 'player';
    state.selectionTarget = 'object';
    setHitboxSelection([], null);
    renderWorld();
    syncProperties();
  }
  renderWorkbench();
};

const updateWorkbenchCrop = (updater) => {
  const selected = getWorkbenchObject();
  if (!selected) return;
  const base = selected.crop ? getObjectCrop(selected) : getFullObjectCrop(selected);
  const nextRaw = typeof updater === 'function' ? updater(base) : { ...base, ...(updater || {}) };
  selected.crop = clampCrop(selected, nextRaw);
  markWorkbenchDirty();
  renderWorkbench();
};

const updateWorkbenchActiveHitbox = (updater) => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  const idx = clampWorkbenchHitboxIndex(selected);
  const hb = selected.hitboxes[idx];
  if (!hb) return;
  const next = typeof updater === 'function' ? updater(hb) : { ...hb, ...(updater || {}) };
  const normalized = clampHitboxToObjectBounds(selected, {
    ...hb,
    x: Math.round(Number(next.x) || 0),
    y: Math.round(Number(next.y) || 0),
    w: Math.max(1, Math.round(Number(next.w) || 1)),
    h: Math.max(1, Math.round(Number(next.h) || 1)),
    rotation: normalizeHitboxRotation(next.rotation, hb.rotation)
  });
  if (isPolygonHitbox(hb) && isPolygonHitbox(normalized)) {
    selected.hitboxes[idx] = normalized;
  } else {
    hb.x = normalized.x;
    hb.y = normalized.y;
    hb.w = normalized.w;
    hb.h = normalized.h;
    hb.rotation = normalized.rotation;
  }
  markWorkbenchDirty();
  renderWorkbench();
};

const requestRenderWorld = () => {
  if (queuedRenderWorld) return;
  queuedRenderWorld = true;
  requestAnimationFrame(() => {
    queuedRenderWorld = false;
    renderWorld();
  });
};

const requestSyncProperties = () => {
  if (queuedSyncProperties) return;
  queuedSyncProperties = true;
  requestAnimationFrame(() => {
    queuedSyncProperties = false;
    syncProperties();
  });
};

const flushRenderWorld = () => {
  queuedRenderWorld = false;
  renderWorld();
};

const flushSyncProperties = () => {
  queuedSyncProperties = false;
  syncProperties();
};

const createDefaultHitbox = (sprite) => {
  const meta = getSpriteMetaSize(sprite, { w: 512, h: 512 });
  return { x: 0, y: 0, w: meta.w, h: meta.h, rotation: 0, locked: false };
};

const createObject = (sprite, x, y) => {
  const id = `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const profile = getSpriteProfile(sprite);
  const defaultScale = profile?.scale ?? state.spriteDefaults[sprite]?.scale ?? (isTextureSprite(sprite) ? 1 : 0.55);
  const textureType = isTextureSprite(sprite) ? getTextureTypeFromSprite(sprite) : null;
  const obj = {
    id,
    sprite,
    x,
    y,
    scale: defaultScale,
    crop: profile?.crop ? cloneCrop(profile.crop) : null,
    rotation: 0,
    flipH: false,
    flipV: false,
    locked: false,
    textureColor:
      textureType === 'solid'
        ? normalizeHexColor(els.textureObjectColor?.value, DEFAULT_SOLID_TEXTURE_COLOR)
        : null,
    hitboxes: profile?.hitboxes?.length ? cloneHitboxes(profile.hitboxes) : (getPresetHitboxes(sprite) || [createDefaultHitbox(sprite)])
  };
  normalizeObjectHitboxesWithinBounds(obj, { preserveSetPosition: true });
  state.objects.push(obj);
  state.selectedId = id;
  state.selectedIds = [id];
  state.selectionAction.object = 'move';
  setHitboxSelection([], null);
};

const placeObjectGroupPreset = (presetId, x, y) => {
  const preset = state.objectGroupPresets?.[presetId];
  if (!preset || !Array.isArray(preset.objects) || !preset.objects.length) return false;
  const usedIds = new Set(state.objects.map((obj) => obj.id));
  const groupId = createObjectGroupId();
  const placed = preset.objects
    .map((raw, index) => sanitizeObjectGroupPresetObject(raw, index))
    .filter(Boolean)
    .map((obj) =>
      cloneObjectWithOptions(
        {
          ...obj,
          id: generateObjectId(usedIds),
          groupId
        },
        { regenerateId: false, offsetX: x, offsetY: y }
      )
    );
  if (!placed.length) return false;
  state.objects.push(...placed);
  const ids = placed.map((obj) => obj.id);
  setSelection(ids, ids[0]);
  setHitboxSelection([], null);
  return true;
};

const renderWorld = () => {
  ensureSelectionCoherence();
  const guidesVisible = areBoxGuidesVisible();
  const guidesEditable = areBoxGuidesEditable();
  if (els.world) {
    els.world.classList.toggle('hitbox-mode', state.selectionTarget === 'hitbox');
    els.world.classList.toggle('guides-hidden', !guidesVisible);
  }
  els.world.innerHTML = '';
  const selected = getSelected();
  const objectCropActive =
    guidesVisible &&
    guidesEditable &&
    state.selectionTarget === 'object' &&
    getSelectionAction('object') === 'crop' &&
    !!selected?.crop &&
    !!state.selectedId;
  const cropEditingObjectId = objectCropActive ? state.selectedId : null;
  const flatZones = normalizeFlatZones(state.physics?.flatZones, state.map);
  state.physics.flatZones = flatZones;
  flatZones.forEach((zone, index) => {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'flat-zone';
    zoneEl.style.left = `${zone.x}px`;
    zoneEl.style.top = `${zone.y}px`;
    zoneEl.style.width = `${zone.w}px`;
    zoneEl.style.height = `${zone.h}px`;
    zoneEl.dataset.label = `평면 ${index + 1}`;
    els.world.appendChild(zoneEl);
  });
  if (flatZoneDrag) {
    const previewRect = getFlatZoneRectFromDrag(flatZoneDrag);
    if (previewRect) {
      const preview = document.createElement('div');
      preview.className = 'flat-zone is-preview';
      preview.style.left = `${previewRect.x}px`;
      preview.style.top = `${previewRect.y}px`;
      preview.style.width = `${previewRect.w}px`;
      preview.style.height = `${previewRect.h}px`;
      preview.dataset.label = '평면 영역 생성';
      els.world.appendChild(preview);
    }
  }

  state.objects.forEach((obj) => {
    const el = document.createElement('div');
    const isSelected = guidesVisible && state.selectedIds.includes(obj.id) && !(objectCropActive && state.selectedId === obj.id);
    const cropEditingThisObject = cropEditingObjectId === obj.id;
    el.className = 'map-object' + (isSelected ? ' selected' : '') + (obj.locked ? ' locked' : '');
    if (cropEditingThisObject) el.style.visibility = 'hidden';
    el.dataset.id = obj.id;
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    const crop = obj.crop ? getObjectCrop(obj) : null;
    const meta = getSpriteMetaSize(obj.sprite, { w: 200, h: 80 });
    const renderW = crop && !cropEditingThisObject ? crop.w : meta.w;
    const renderH = crop && !cropEditingThisObject ? crop.h : meta.h;
    el.style.width = `${renderW}px`;
    el.style.height = `${renderH}px`;
    el.style.overflow = crop && !cropEditingThisObject ? 'hidden' : 'visible';
    const scaleX = obj.flipH ? -obj.scale : obj.scale;
    const scaleY = obj.flipV ? -obj.scale : obj.scale;
    // Keep object sprite transform order aligned with hitbox/geometry utilities:
    // local -> scale/flip -> rotate -> world.
    el.style.transform = `rotate(${obj.rotation}deg) scale(${scaleX}, ${scaleY})`;

    const source = isTextureSprite(obj.sprite) ? document.createElement('div') : document.createElement('img');
    if (isTextureSprite(obj.sprite)) {
      const textureType = getTextureTypeFromSprite(obj.sprite);
      const fillStyle = getTextureFillStyle(textureType, obj.textureColor);
      source.className = 'texture-object-fill';
      source.style.backgroundImage = fillStyle.image;
      source.style.backgroundColor = fillStyle.color;
      source.style.backgroundSize = fillStyle.size;
      source.style.backgroundRepeat = fillStyle.repeat;
    } else {
      source.src = `${plateBase}${obj.sprite}`;
      source.draggable = false;
    }
    source.style.position = 'absolute';
    source.style.left = crop && !cropEditingThisObject ? `-${crop.x}px` : '0px';
    source.style.top = crop && !cropEditingThisObject ? `-${crop.y}px` : '0px';
    source.style.width = `${meta.w}px`;
    source.style.height = `${meta.h}px`;
    el.appendChild(source);

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canSelectObjectTarget()) return;
      if (state.mode !== 'select') {
        setMode('select');
      }
      const pos = screenToWorld(e.clientX, e.clientY);
      const stack = getObjectsAtPoint(pos.x, pos.y);
      if ((e.altKey || e.shiftKey) && stack.length > 1) {
        const items = stack.map((hit) => ({
          type: 'object',
          obj: hit,
          label: getSpriteDisplayLabel(hit.sprite),
          meta: hit.id.replace('obj_', '')
        }));
        showLayerPicker(items.reverse(), e.clientX, e.clientY);
        return;
      }
      const isMulti = e.ctrlKey || e.metaKey;
      if (isMulti) {
        toggleSelection(obj.id);
      } else {
        setSelection([obj.id], obj.id);
      }
      if (!guidesEditable) return;
      if (getSelectionAction('object') !== 'move') return;
      const targets = state.selectedIds.includes(obj.id) ? state.selectedIds : [obj.id];
      const dragTargets = targets
        .map((targetId) => state.objects.find((o) => o.id === targetId))
        .filter((o) => o && !o.locked);
      if (!dragTargets.length) return;
      const start = screenToWorld(e.clientX, e.clientY);
      dragState = {
        ids: dragTargets.map((o) => o.id),
        offsets: dragTargets.map((o) => ({
          id: o.id,
          offsetX: start.x - o.x,
          offsetY: start.y - o.y
        }))
      };
      safeSetPointerCapture(el, e.pointerId);
    });

    els.world.appendChild(el);
  });

  if (
    guidesVisible &&
    selected &&
    state.selectionTarget === 'object' &&
    (getSelectionAction('object') === 'resize' || getSelectionAction('object') === 'rotate') &&
    !selected.locked
  ) {
    const objectAction = getSelectionAction('object');
    const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
    const crop = selected.crop ? getObjectCrop(selected) : null;
    const controlW = crop ? crop.w : meta.w;
    const controlH = crop ? crop.h : meta.h;
    const controls = document.createElement('div');
    controls.className = 'object-controls';
    if (objectAction === 'rotate') controls.classList.add('rotate-mode');
    controls.dataset.label = objectAction === 'rotate' ? '오브젝트 회전' : '오브젝트 박스';
    controls.style.width = `${controlW}px`;
    controls.style.height = `${controlH}px`;
    const scaleX = selected.flipH ? -selected.scale : selected.scale;
    const scaleY = selected.flipV ? -selected.scale : selected.scale;
    controls.style.transformOrigin = 'top left';
    controls.style.transform = `translate(${selected.x}px, ${selected.y}px) rotate(${selected.rotation}deg) scale(${scaleX}, ${scaleY})`;

    const startTransform = (e, type) => {
      if (!guidesEditable) return;
      e.stopPropagation();
      e.preventDefault();
      const start = screenToWorld(e.clientX, e.clientY);
      const centerLocalX = controlW / 2;
      const centerLocalY = controlH / 2;
      const centerWorld = getObjectCenterWorld(selected, centerLocalX, centerLocalY);
      objectTransform = {
        type,
        id: selected.id,
        startX: start.x,
        startY: start.y,
        startRotation: selected.rotation,
        startScale: selected.scale,
        centerLocalX,
        centerLocalY,
        centerWorldX: centerWorld.x,
        centerWorldY: centerWorld.y,
        baseW: controlW,
        baseH: controlH
      };
      safeSetPointerCapture(controls, e.pointerId);
    };

    if (guidesEditable) {
      if (objectAction === 'resize') {
        ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
          const scaleHandle = document.createElement('div');
          scaleHandle.className = 'object-handle scale-handle';
          scaleHandle.dataset.handle = handle;
          controls.appendChild(scaleHandle);
          scaleHandle.addEventListener('pointerdown', (e) => startTransform(e, 'scale'));
        });
      } else if (objectAction === 'rotate') {
        ['n', 'e', 's', 'w'].forEach((edge) => {
          const edgeHandle = document.createElement('div');
          edgeHandle.className = 'object-edge-handle';
          edgeHandle.dataset.edge = edge;
          controls.appendChild(edgeHandle);
          edgeHandle.addEventListener('pointerdown', (e) => startTransform(e, 'rotate'));
        });
      }
    }

    els.world.appendChild(controls);
  }

  if (guidesVisible && selected?.crop && state.selectionTarget === 'object' && getSelectionAction('object') === 'crop' && !selected.locked) {
    const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
    const crop = getObjectCrop(selected);
    const cropLayer = document.createElement('div');
    cropLayer.className = 'crop-controls';
    cropLayer.style.width = `${meta.w}px`;
    cropLayer.style.height = `${meta.h}px`;
    const scaleX = selected.flipH ? -selected.scale : selected.scale;
    const scaleY = selected.flipV ? -selected.scale : selected.scale;
    const cropAnchor = getActiveObjectCropAnchor(selected, crop);
    cropLayer.style.transformOrigin = 'top left';
    // During drag, crop anchor is frozen to the drag-start crop.
    // This prevents source sprite drift while trimming.
    cropLayer.style.transform = `translate(${selected.x}px, ${selected.y}px) rotate(${selected.rotation}deg) scale(${scaleX}, ${scaleY}) translate(${-cropAnchor.x}px, ${-cropAnchor.y}px)`;

    const sourcePreview = isTextureSprite(selected.sprite)
      ? document.createElement('div')
      : document.createElement('img');
    sourcePreview.className = isTextureSprite(selected.sprite) ? 'crop-source-fill' : 'crop-source-image';
    if (isTextureSprite(selected.sprite)) {
      const textureType = getTextureTypeFromSprite(selected.sprite);
      const fillStyle = getTextureFillStyle(textureType, selected.textureColor);
      sourcePreview.style.backgroundImage = fillStyle.image;
      sourcePreview.style.backgroundColor = fillStyle.color;
      sourcePreview.style.backgroundSize = fillStyle.size;
      sourcePreview.style.backgroundRepeat = fillStyle.repeat;
    } else {
      sourcePreview.src = `${plateBase}${selected.sprite}`;
    }
    sourcePreview.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canSelectObjectTarget()) return;
      setSelection([selected.id], selected.id);
    });
    cropLayer.appendChild(sourcePreview);

    const cropRect = document.createElement('div');
    cropRect.className = 'crop-rect';
    cropRect.dataset.label = '자르기 박스';
    cropRect.style.left = `${crop.x}px`;
    cropRect.style.top = `${crop.y}px`;
    cropRect.style.width = `${crop.w}px`;
    cropRect.style.height = `${crop.h}px`;
    const startCropDrag = (e, handle) => {
      if (!guidesEditable) return;
      e.preventDefault();
      e.stopPropagation();
      if (!handle) return;
      dragState = null;
      objectTransform = null;
      hitboxDrag = null;
      playerHitboxDrag = null;
      const pos = screenToWorld(e.clientX, e.clientY);
      const cropAnchor = getActiveObjectCropAnchor(selected, crop);
      const local = worldPointToLocal(pos.x, pos.y, selected);
      cropDrag = {
        type: 'object',
        id: selected.id,
        handle,
        anchor: { ...cropAnchor },
        startLocal: {
          x: local.x + cropAnchor.x,
          y: local.y + cropAnchor.y
        },
        cropStart: { ...crop }
      };
      safeSetPointerCapture(cropRect, e.pointerId);
    };
    cropRect.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target?.closest?.('.crop-handle')) return;
      if (!canSelectObjectTarget()) return;
      setSelection([selected.id], selected.id);
    });
    if (guidesEditable) {
      ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
        const h = document.createElement('div');
        h.className = 'crop-handle';
        h.dataset.handle = handle;
        h.addEventListener('pointerdown', (e) => startCropDrag(e, handle));
        cropRect.appendChild(h);
      });
    }
    cropLayer.appendChild(cropRect);
    cropLayer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canSelectObjectTarget()) return;
      setSelection([selected.id], selected.id);
    });
    els.world.appendChild(cropLayer);
  }

  if (Array.isArray(state.savePoints) && state.savePoints.length) {
    state.savePoints.forEach((point, index) => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      const marker = document.createElement('div');
      marker.className = 'save-point';
      marker.style.left = `${point.x}px`;
      marker.style.top = `${point.y}px`;
      const label = document.createElement('span');
      label.textContent = point.name || `SP ${index + 1}`;
      marker.appendChild(label);
      els.world.appendChild(marker);
    });
  }

  if (state.startPoint) {
    const metrics = getPlayerMetrics();
    const sprite = getPlayerSpriteRender();
    const playerAction = getSelectionAction('player');
    const playerObjectTarget = state.selectedSpecial === 'player' && state.selectionTarget === 'object';
    const playerHitboxTarget = state.selectedSpecial === 'player' && state.selectionTarget === 'hitbox';
    const playerCropEditing = playerObjectTarget && playerAction === 'crop' && state.playerCrop && !state.playerLocked;
    const markerSelected = guidesVisible && playerObjectTarget && playerAction !== 'crop';
    const baseLeft = state.startPoint.x - metrics.width / 2;
    const baseTop = state.startPoint.y - metrics.height;
    const fullLeft = state.startPoint.x - sprite.meta.w * sprite.scale / 2;
    const fullTop = state.startPoint.y - sprite.meta.h * sprite.scale;
    const spriteLeft = fullLeft + sprite.crop.x * sprite.scale;
    const spriteTop = fullTop + sprite.crop.y * sprite.scale;
    if (!playerCropEditing) {
      const marker = document.createElement('div');
      marker.className = `player-marker${markerSelected ? ' selected' : ''}`;
      marker.style.left = `${spriteLeft}px`;
      marker.style.top = `${spriteTop}px`;
      marker.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canSelectObjectTarget()) return;
        state.selectedId = null;
        state.selectedIds = [];
        state.selectedSpecial = 'player';
        setMode('select');
        if (guidesEditable && getSelectionAction('player') === 'move' && !state.playerLocked) {
          const pos = screenToWorld(e.clientX, e.clientY);
          dragState = {
            ids: ['__player__'],
            offsets: [{ id: '__player__', offsetX: pos.x - state.startPoint.x, offsetY: pos.y - state.startPoint.y }]
          };
          safeSetPointerCapture(marker, e.pointerId);
        }
        renderWorld();
        syncProperties();
      });
      const img = document.createElement('img');
      img.src = `${sejongBase}${SPRITES.idle}`;
      marker.appendChild(img);
      applyPlayerSpriteToElement(marker, img);
      const label = document.createElement('div');
      label.className = 'player-marker-label';
      label.textContent = 'START';
      marker.appendChild(label);
      els.world.appendChild(marker);

      if (guidesVisible && playerObjectTarget && playerAction === 'resize' && !state.playerLocked) {
        const controls = document.createElement('div');
        controls.className = 'object-controls player-object-controls';
        controls.dataset.label = '캐릭터';
        controls.style.width = `${sprite.spriteW}px`;
        controls.style.height = `${sprite.spriteH}px`;
        controls.style.transform = `translate(${spriteLeft}px, ${spriteTop}px)`;
        const startPlayerScaleTransform = (e) => {
          if (!guidesEditable) return;
          e.preventDefault();
          e.stopPropagation();
          const start = screenToWorld(e.clientX, e.clientY);
          objectTransform = {
            type: 'player-scale',
            startX: start.x,
            startY: start.y,
            startScale: state.playerScale,
            left: spriteLeft,
            top: spriteTop,
            baseW: sprite.crop.w,
            baseH: sprite.crop.h
          };
          safeSetPointerCapture(controls, e.pointerId);
        };
        if (guidesEditable) {
          ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
            const scaleHandle = document.createElement('div');
            scaleHandle.className = 'object-handle scale-handle';
            scaleHandle.dataset.handle = handle;
            scaleHandle.addEventListener('pointerdown', startPlayerScaleTransform);
            controls.appendChild(scaleHandle);
          });
        }
        els.world.appendChild(controls);
      }
    }

    if (guidesVisible && playerHitboxTarget && playerAction !== 'crop') {
      const hit = document.createElement('div');
      hit.className = 'player-hitbox';
      hit.dataset.label = '캐릭터 히트박스';
      const offset = getPlayerHitboxOffset();
      hit.style.left = `${baseLeft + offset.x}px`;
      hit.style.top = `${baseTop + offset.y}px`;
      hit.style.width = `${metrics.width}px`;
      hit.style.height = `${metrics.height}px`;
      hit.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (getPlayerPointToolState().active) {
          const pos = screenToWorld(e.clientX, e.clientY);
          if (addPlayerPointHitboxPoint(pos.x, pos.y)) {
            renderWorld();
            syncProperties();
          }
          return;
        }
        if (!canSelectHitboxTarget()) return;
        if (e.target.closest('.hitbox-handle')) return;
        state.selectedSpecial = 'player';
        if (guidesEditable && getSelectionAction('player') === 'move' && !state.playerLocked) {
          const pos = screenToWorld(e.clientX, e.clientY);
          const startLeft = baseLeft + offset.x;
          const startTop = baseTop + offset.y;
          playerHitboxDrag = {
            handle: null,
            startX: pos.x,
            startY: pos.y,
            startOffsetX: offset.x,
            startOffsetY: offset.y,
            startLeft,
            startTop,
            startW: state.playerHitbox.width,
            startH: state.playerHitbox.height
          };
          safeSetPointerCapture(hit, e.pointerId);
        }
        renderWorld();
        syncProperties();
      });
      const startPlayerHitboxDrag = (e, handle) => {
        if (!guidesEditable) return;
        e.preventDefault();
        e.stopPropagation();
        if (!canSelectHitboxTarget()) return;
        state.selectedSpecial = 'player';
        if (getSelectionAction('player') !== 'resize') return;
        const pos = screenToWorld(e.clientX, e.clientY);
        const startLeft = baseLeft + offset.x;
        const startTop = baseTop + offset.y;
        playerHitboxDrag = {
          handle,
          startX: pos.x,
          startY: pos.y,
          startOffsetX: offset.x,
          startOffsetY: offset.y,
          startLeft,
          startTop,
          startW: state.playerHitbox.width,
          startH: state.playerHitbox.height
        };
        safeSetPointerCapture(hit, e.pointerId);
      };
      if (guidesEditable && playerAction === 'resize') {
        ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
          const h = document.createElement('div');
          h.className = 'hitbox-handle player-hitbox-handle';
          h.dataset.handle = handle;
          h.addEventListener('pointerdown', (e) => startPlayerHitboxDrag(e, handle));
          hit.appendChild(h);
        });
      }
      const playerPointTool = getPlayerPointToolState();
      if (playerPointTool.active || playerPointTool.points.length) {
        const overlay = document.createElement('div');
        overlay.className = 'player-hitbox-point-overlay';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${Math.max(1, metrics.width)} ${Math.max(1, metrics.height)}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        const points = playerPointTool.points
          .map((point) => ({
            x: Math.max(0, Math.min(metrics.width, Number(point?.x) || 0)),
            y: Math.max(0, Math.min(metrics.height, Number(point?.y) || 0))
          }));
        if (points.length >= 2) {
          const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          polyline.setAttribute('class', 'player-hitbox-point-line');
          polyline.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
          svg.appendChild(polyline);
        }
        if (points.length >= 3) {
          const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          polygon.setAttribute('class', 'player-hitbox-point-fill');
          polygon.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
          svg.appendChild(polygon);
        }
        points.forEach((point, index) => {
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('class', 'player-hitbox-point-dot');
          dot.setAttribute('cx', String(point.x));
          dot.setAttribute('cy', String(point.y));
          dot.setAttribute('r', '4');
          svg.appendChild(dot);
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('class', 'player-hitbox-point-index');
          label.setAttribute('x', String(point.x + 6));
          label.setAttribute('y', String(point.y - 6));
          label.textContent = String(index + 1);
          svg.appendChild(label);
        });
        overlay.appendChild(svg);
        hit.appendChild(overlay);
      }
      els.world.appendChild(hit);
    }

    if (guidesVisible && playerCropEditing) {
      const cropAnchor = getActivePlayerCropAnchor(sprite.crop);
      const cropLayer = document.createElement('div');
      cropLayer.className = 'crop-controls player-crop-controls';
      cropLayer.style.width = `${sprite.meta.w}px`;
      cropLayer.style.height = `${sprite.meta.h}px`;
      cropLayer.style.transformOrigin = 'top left';
      cropLayer.style.transform = `translate(${fullLeft}px, ${fullTop}px) scale(${sprite.scale}) translate(${-cropAnchor.x}px, ${-cropAnchor.y}px)`;

      const sourcePreview = document.createElement('img');
      sourcePreview.className = 'crop-source-image';
      sourcePreview.src = `${sejongBase}${SPRITES.idle}`;
      cropLayer.appendChild(sourcePreview);

      const cropRect = document.createElement('div');
      cropRect.className = 'crop-rect';
      cropRect.dataset.label = '캐릭터 자르기 박스';
      cropRect.style.left = `${sprite.crop.x}px`;
      cropRect.style.top = `${sprite.crop.y}px`;
      cropRect.style.width = `${sprite.crop.w}px`;
      cropRect.style.height = `${sprite.crop.h}px`;
      const startPlayerCropDrag = (e, handle) => {
        if (!guidesEditable) return;
        e.preventDefault();
        e.stopPropagation();
        if (!handle) return;
        dragState = null;
        objectTransform = null;
        hitboxDrag = null;
        playerHitboxDrag = null;
        const pos = screenToWorld(e.clientX, e.clientY);
        const localX = (pos.x - fullLeft) / sprite.scale;
        const localY = (pos.y - fullTop) / sprite.scale;
        cropDrag = {
          type: 'player',
          handle,
          anchor: { ...cropAnchor },
          startLocal: { x: localX + cropAnchor.x, y: localY + cropAnchor.y },
          cropStart: { ...sprite.crop },
          scale: sprite.scale
        };
        safeSetPointerCapture(cropRect, e.pointerId);
      };
      cropRect.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      if (guidesEditable) {
        ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
          const h = document.createElement('div');
          h.className = 'crop-handle';
          h.dataset.handle = handle;
          h.addEventListener('pointerdown', (e) => startPlayerCropDrag(e, handle));
          cropRect.appendChild(h);
        });
      }
      cropLayer.appendChild(cropRect);
      els.world.appendChild(cropLayer);
    }
  }

  renderHitboxes();
  if (workbenchState.open) renderWorkbench();
  scheduleDraftSave();
};

const selectObject = (id) => {
  setSelection([id], id);
};

const getSelected = () => state.objects.find((obj) => obj.id === state.selectedId);

const getSelectedHitboxIndices = (selected = getSelected()) => {
  if (!selected || !Array.isArray(selected.hitboxes) || !selected.hitboxes.length) return [];
  const valid = new Set(
    (state.selectedHitboxIndices || [])
      .map((idx) => Number(idx))
      .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < selected.hitboxes.length)
  );
  if (state.selectedHitboxIndex != null && selected.hitboxes[state.selectedHitboxIndex]) {
    valid.add(state.selectedHitboxIndex);
  }
  return Array.from(valid).sort((a, b) => a - b);
};

const setHitboxSelection = (indices, primaryIndex = null) => {
  const selected = getSelected();
  if (!selected || !Array.isArray(selected.hitboxes) || !selected.hitboxes.length) {
    state.selectedHitboxIndices = [];
    state.selectedHitboxIndex = null;
    return;
  }
  const valid = Array.from(
    new Set(
      (indices || [])
        .map((idx) => Number(idx))
        .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < selected.hitboxes.length)
    )
  ).sort((a, b) => a - b);
  const nextPrimary =
    primaryIndex != null && valid.includes(primaryIndex)
      ? primaryIndex
      : (valid[valid.length - 1] ?? null);
  state.selectedHitboxIndices = valid;
  state.selectedHitboxIndex = nextPrimary;
};

const toggleHitboxSelection = (index) => {
  const selected = getSelected();
  if (!selected || !Array.isArray(selected.hitboxes) || !selected.hitboxes[index]) return;
  const set = new Set(getSelectedHitboxIndices(selected));
  if (set.has(index)) set.delete(index);
  else set.add(index);
  const next = Array.from(set).sort((a, b) => a - b);
  setHitboxSelection(next, index);
};

const getHitboxGroupIndices = (selected, index) => {
  if (!selected || !Array.isArray(selected.hitboxes)) return [];
  const hb = selected.hitboxes[index];
  if (!hb) return [];
  if (!hb.groupId) return [index];
  return selected.hitboxes
    .map((item, idx) => (item.groupId === hb.groupId ? idx : null))
    .filter((idx) => idx != null);
};

const getHitboxBoundsByIndices = (selected, indices) => {
  if (!selected || !Array.isArray(selected.hitboxes) || !indices?.length) return null;
  const boxes = indices
    .map((idx) => selected.hitboxes[idx])
    .filter(Boolean);
  if (!boxes.length) return null;
  const x1 = Math.min(...boxes.map((hb) => hb.x));
  const y1 = Math.min(...boxes.map((hb) => hb.y));
  const x2 = Math.max(...boxes.map((hb) => hb.x + hb.w));
  const y2 = Math.max(...boxes.map((hb) => hb.y + hb.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
};

const rectIntersects = (a, b) => {
  if (!a || !b) return false;
  const ax1 = Number(a.x) || 0;
  const ay1 = Number(a.y) || 0;
  const ax2 = ax1 + Math.max(1, Number(a.w) || 1);
  const ay2 = ay1 + Math.max(1, Number(a.h) || 1);
  const bx1 = Number(b.x) || 0;
  const by1 = Number(b.y) || 0;
  const bx2 = bx1 + Math.max(1, Number(b.w) || 1);
  const by2 = by1 + Math.max(1, Number(b.h) || 1);
  return ax2 > bx1 && ax1 < bx2 && ay2 > by1 && ay1 < by2;
};

const normalizeWorkbenchRegionRect = (selected, rect) => {
  if (!selected) return null;
  const bounds = getObjectHitboxBounds(selected);
  const base = rect || bounds;
  const safeW = Math.max(1, Math.round(Number(base?.w) || bounds.w));
  const safeH = Math.max(1, Math.round(Number(base?.h) || bounds.h));
  const minX = bounds.x;
  const minY = bounds.y;
  const maxX = bounds.x + bounds.w;
  const maxY = bounds.y + bounds.h;
  const x = Math.max(minX, Math.min(maxX - 1, Math.round(Number(base?.x) || minX)));
  const y = Math.max(minY, Math.min(maxY - 1, Math.round(Number(base?.y) || minY)));
  const w = Math.max(1, Math.min(maxX - x, safeW));
  const h = Math.max(1, Math.min(maxY - y, safeH));
  return { x, y, w, h };
};

const getHitboxIndicesIntersectingRect = (selected, rect) => {
  if (!selected || !Array.isArray(selected.hitboxes) || !rect) return [];
  return selected.hitboxes
    .map((hitbox, idx) => ({ idx, hitbox }))
    .filter((entry) => rectIntersects(entry.hitbox, rect))
    .map((entry) => entry.idx);
};

const ensureWorkbenchHitboxCropRegion = (selected) => {
  if (!selected || !Array.isArray(selected.hitboxes) || !selected.hitboxes.length) {
    workbenchState.hitboxCropRegionRect = null;
    workbenchState.hitboxCropRegionObjectId = null;
    workbenchState.hitboxCropRegionCropRect = null;
    workbenchState.hitboxCropRegionCropObjectId = null;
    return null;
  }
  const allIndices = selected.hitboxes.map((_, idx) => idx);
  const defaultBounds = getHitboxBoundsByIndices(selected, allIndices) || getObjectHitboxBounds(selected);
  const shouldReset = (
    workbenchState.hitboxCropRegionObjectId !== selected.id
    || !workbenchState.hitboxCropRegionRect
  );
  const nextRect = normalizeWorkbenchRegionRect(
    selected,
    shouldReset ? defaultBounds : workbenchState.hitboxCropRegionRect
  );
  workbenchState.hitboxCropRegionRect = nextRect;
  workbenchState.hitboxCropRegionObjectId = selected.id;
  return nextRect;
};

const normalizeWorkbenchCropRectInRegion = (selected, rect, regionRect) => {
  if (!selected) return null;
  const outer = normalizeWorkbenchRegionRect(selected, regionRect);
  if (!outer) return null;
  const base = normalizeWorkbenchRegionRect(selected, rect || outer) || { ...outer };
  const outerRight = outer.x + outer.w;
  const outerBottom = outer.y + outer.h;
  const x = Math.max(outer.x, Math.min(outerRight - 1, Math.round(base.x)));
  const y = Math.max(outer.y, Math.min(outerBottom - 1, Math.round(base.y)));
  const w = Math.max(1, Math.min(outerRight - x, Math.round(base.w)));
  const h = Math.max(1, Math.min(outerBottom - y, Math.round(base.h)));
  return { x, y, w, h };
};

const ensureWorkbenchHitboxCropRegionCrop = (selected, regionRect) => {
  if (!selected || !Array.isArray(selected.hitboxes) || !selected.hitboxes.length) {
    workbenchState.hitboxCropRegionCropRect = null;
    workbenchState.hitboxCropRegionCropObjectId = null;
    return null;
  }
  const normalizedRegion = normalizeWorkbenchRegionRect(selected, regionRect);
  if (!normalizedRegion) return null;
  const shouldReset = (
    workbenchState.hitboxCropRegionCropObjectId !== selected.id
    || !workbenchState.hitboxCropRegionCropRect
  );
  const nextRect = normalizeWorkbenchCropRectInRegion(
    selected,
    shouldReset ? normalizedRegion : workbenchState.hitboxCropRegionCropRect,
    normalizedRegion
  );
  workbenchState.hitboxCropRegionCropRect = nextRect;
  workbenchState.hitboxCropRegionCropObjectId = selected.id;
  return nextRect;
};

const resizeHitboxBoundsByHandle = (bounds, handle, dx, dy, minSize = 10) => {
  const startRight = bounds.x + bounds.w;
  const startBottom = bounds.y + bounds.h;
  let nx = bounds.x;
  let ny = bounds.y;
  let nw = bounds.w;
  let nh = bounds.h;
  if (handle.includes('n')) {
    ny = bounds.y + dy;
    nh = startBottom - ny;
  }
  if (handle.includes('w')) {
    nx = bounds.x + dx;
    nw = startRight - nx;
  }
  if (handle.includes('s')) {
    nh = bounds.h + dy;
  }
  if (handle.includes('e')) {
    nw = bounds.w + dx;
  }
  if (nw < minSize) {
    nw = minSize;
    if (handle.includes('w')) nx = startRight - minSize;
  }
  if (nh < minSize) {
    nh = minSize;
    if (handle.includes('n')) ny = startBottom - minSize;
  }
  return { x: nx, y: ny, w: nw, h: nh };
};

const ensureSelectionCoherence = () => {
  if (objectCropSession) {
    const sessionObj = state.objects.find((obj) => obj.id === objectCropSession.id);
    if (!sessionObj) {
      objectCropSession = null;
    }
  }
  if (playerCropSession && !isPlayerCropModeActive()) {
    playerCropSession = null;
  }
  if (state.selectedSpecial === 'player') return;
  const validIds = new Set(state.objects.map((obj) => obj.id));
  state.selectedIds = state.selectedIds.filter((id) => validIds.has(id));
  if (state.selectedId && !validIds.has(state.selectedId)) {
    state.selectedId = null;
  }
  if (!state.selectedId && state.selectedIds.length) {
    state.selectedId = state.selectedIds[0];
  }
  const selected = getSelected();
  if (!selected) {
    state.selectedHitboxIndex = null;
    state.selectedHitboxIndices = [];
    if (state.selectionTarget === 'hitbox') state.selectionTarget = 'object';
    if (state.selectedSpecial === 'hitbox') state.selectedSpecial = null;
    return;
  }
  if (!Array.isArray(selected.hitboxes) || !selected.hitboxes.length) {
    state.selectedHitboxIndex = null;
    state.selectedHitboxIndices = [];
    if (state.selectionTarget === 'hitbox') state.selectionTarget = 'object';
    if (state.selectedSpecial === 'hitbox') state.selectedSpecial = null;
    return;
  }
  state.selectedHitboxIndices = getSelectedHitboxIndices(selected);
  if (
    state.selectedHitboxIndex != null &&
    (state.selectedHitboxIndex < 0 || state.selectedHitboxIndex >= selected.hitboxes.length)
  ) {
    state.selectedHitboxIndex = 0;
  }
  if (state.selectionTarget === 'hitbox' && state.selectedHitboxIndex == null) {
    state.selectedHitboxIndex = state.selectedHitboxIndices[0] ?? 0;
    if (!state.selectedHitboxIndices.length) {
      state.selectedHitboxIndices = [state.selectedHitboxIndex];
    }
  }
};

const getActiveTarget = () => {
  if (state.selectedSpecial === 'player') return 'player';
  if (state.selectionTarget === 'hitbox') return 'hitbox';
  return 'object';
};

const areBoxGuidesVisible = () => state.boxGuidesVisible !== false;
const areBoxGuidesEditable = () => areBoxGuidesVisible() && state.boxGuidesEditable !== false;
const areWorkbenchGuidesVisible = () => (workbenchState.open ? true : areBoxGuidesVisible());
const areWorkbenchGuidesEditable = () => (workbenchState.open ? true : areBoxGuidesEditable());

const canSelectObjectTarget = () => state.selectionTarget === 'object';
const canSelectHitboxTarget = () => state.selectionTarget === 'hitbox';

const getSelectionAction = (target = getActiveTarget()) => state.selectionAction[target] || 'move';

let lastPointer = null;

const getObjectsAtPoint = (x, y) =>
  state.objects.filter((obj) => {
    const b = getObjectBounds(obj);
    return x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;
  });

const getHitboxesAtPoint = (x, y) => {
  const hits = [];
  state.objects.forEach((obj) => {
    const cropOffset = obj.crop ? getObjectCrop(obj) : null;
    const offsetX = cropOffset ? cropOffset.x : 0;
    const offsetY = cropOffset ? cropOffset.y : 0;
    const local = worldPointToLocal(x, y, obj);
    obj.hitboxes.forEach((hb, idx) => {
      const hx = hb.x - offsetX;
      const hy = hb.y - offsetY;
      if (isPolygonHitbox(hb)) {
        const relX = local.x - hx;
        const relY = local.y - hy;
        if (pointInPolygon(relX, relY, hb.points)) {
          hits.push({ obj, index: idx });
        }
        return;
      }
      const rotation = normalizeHitboxRotation(hb.rotation, 0);
      let testX = local.x;
      let testY = local.y;
      if (rotation !== 0) {
        const cx = hx + hb.w / 2;
        const cy = hy + hb.h / 2;
        const dx = local.x - cx;
        const dy = local.y - cy;
        const rad = (-rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        testX = cx + dx * cos - dy * sin;
        testY = cy + dx * sin + dy * cos;
      }
      if (testX >= hx && testX <= hx + hb.w && testY >= hy && testY <= hy + hb.h) {
        hits.push({ obj, index: idx });
      }
    });
  });
  return hits;
};

const hideLayerPicker = () => {
  if (!els.layerPicker) return;
  els.layerPicker.classList.add('hidden');
  els.layerPicker.innerHTML = '';
};

const showLayerPicker = (items, clientX, clientY, options = {}) => {
  if (!els.layerPicker) return;
  if (!items.length) return;
  const { multiToggle = false, title: pickerTitle = '겹친 항목 선택' } = options;
  els.layerPicker.innerHTML = '';
  const titleEl = document.createElement('div');
  titleEl.className = 'layer-title';
  titleEl.textContent = multiToggle ? `${pickerTitle} (포함/제외)` : pickerTitle;
  els.layerPicker.appendChild(titleEl);
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layer-item';
    btn.innerHTML = `
      <span>${item.label}</span>
      <span class="meta">${item.meta}</span>
    `;
    if (multiToggle && item.type === 'object' && state.selectedIds.includes(item.obj.id)) {
      btn.classList.add('is-selected');
    }
    btn.addEventListener('click', () => {
      if (multiToggle && item.type === 'object') {
        if (!canSelectObjectTarget()) return;
        toggleSelection(item.obj.id);
        btn.classList.toggle('is-selected', state.selectedIds.includes(item.obj.id));
        return;
      }
      if (item.type === 'hitbox' && !canSelectHitboxTarget()) return;
      if (item.type === 'object' && !canSelectObjectTarget()) return;
      if (item.type === 'hitbox') {
        setSelection([item.obj.id], item.obj.id);
        state.selectionTarget = 'hitbox';
        state.selectedSpecial = 'hitbox';
        setHitboxSelection([item.index], item.index);
        state.showHitboxes = true;
      } else {
        setSelection([item.obj.id], item.obj.id);
        state.selectionTarget = 'object';
        state.selectedSpecial = null;
        state.selectedHitboxIndex = null;
        state.selectedHitboxIndices = [];
      }
      hideLayerPicker();
      renderWorld();
      syncProperties();
    });
    els.layerPicker.appendChild(btn);
  });
  if (multiToggle) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'layer-item layer-item-close';
    closeBtn.textContent = '완료';
    closeBtn.addEventListener('click', () => hideLayerPicker());
    els.layerPicker.appendChild(closeBtn);
  }
  const wrap = els.viewport.parentElement;
  const rect = wrap.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  els.layerPicker.style.left = `${x}px`;
  els.layerPicker.style.top = `${y}px`;
  els.layerPicker.classList.remove('hidden');
  requestAnimationFrame(() => {
    const pickerRect = els.layerPicker.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + pickerRect.width > rect.width) nx = rect.width - pickerRect.width - 8;
    if (y + pickerRect.height > rect.height) ny = rect.height - pickerRect.height - 8;
    els.layerPicker.style.left = `${Math.max(8, nx)}px`;
    els.layerPicker.style.top = `${Math.max(8, ny)}px`;
  });
};

const renderHitboxes = () => {
  const guidesVisible = areBoxGuidesVisible();
  const guidesEditable = areBoxGuidesEditable();
  const selected = getSelected();
  if (!selected || !state.showHitboxes || !guidesVisible) return;
  if (state.selectionTarget === 'object' && getSelectionAction('object') === 'crop') return;
  const hitboxAction = getSelectionAction('hitbox');
  const allHitboxIndices = selected.hitboxes.map((_, idx) => idx);
  const selectedHitboxSet = new Set(getSelectedHitboxIndices(selected));
  const cropOffset = selected.crop ? getObjectCrop(selected) : null;
  const offsetX = cropOffset ? cropOffset.x : 0;
  const offsetY = cropOffset ? cropOffset.y : 0;

  selected.hitboxes.forEach((hb, index) => {
    const isPoly = isPolygonHitbox(hb);
    const hbEl = document.createElement('div');
    const isActive = state.selectionTarget === 'hitbox' && state.selectedHitboxIndex === index;
    const isMultiSelected = state.selectionTarget === 'hitbox' && selectedHitboxSet.has(index);
    const passive = state.selectionTarget !== 'hitbox';
    hbEl.className = `hitbox${isActive ? ' selected' : ''}${isMultiSelected ? ' selected-multi' : ''}${hb.locked ? ' locked' : ''}${passive ? ' passive' : ''}${isPoly ? ' polygon' : ''}`;
    hbEl.dataset.label = `히트박스 ${index + 1}`;
    hbEl.dataset.index = index;
    hbEl.style.width = `${hb.w}px`;
    hbEl.style.height = `${hb.h}px`;
    const scaleX = selected.flipH ? -selected.scale : selected.scale;
    const scaleY = selected.flipV ? -selected.scale : selected.scale;
    const hbRotation = normalizeHitboxRotation(hb.rotation, 0);
    const hbCx = hb.w / 2;
    const hbCy = hb.h / 2;
    hbEl.style.transformOrigin = 'top left';
    hbEl.style.transform = `translate(${selected.x}px, ${selected.y}px) rotate(${selected.rotation}deg) scale(${scaleX}, ${scaleY}) translate(${hb.x - offsetX}px, ${hb.y - offsetY}px) translate(${hbCx}px, ${hbCy}px) rotate(${isPoly ? 0 : hbRotation}deg) translate(${-hbCx}px, ${-hbCy}px)`;
    if (isPoly) {
      const points = Array.isArray(hb.points) ? hb.points : [];
      const safeW = Math.max(1, Number(hb.w) || 1);
      const safeH = Math.max(1, Number(hb.h) || 1);
      const clipPath = points
        .map((point) => {
          const px = Math.max(0, Math.min(100, ((Number(point.x) || 0) / safeW) * 100));
          const py = Math.max(0, Math.min(100, ((Number(point.y) || 0) / safeH) * 100));
          return `${px}% ${py}%`;
        })
        .join(', ');
      if (clipPath) hbEl.style.clipPath = `polygon(${clipPath})`;
    }
    hbEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!canSelectHitboxTarget()) return;
      if (e.altKey || e.shiftKey) {
        const pos = screenToWorld(e.clientX, e.clientY);
        const hitTargets = getHitboxesAtPoint(pos.x, pos.y);
        if (hitTargets.length > 1) {
          const items = hitTargets.map((hit) => ({
            type: 'hitbox',
            obj: hit.obj,
            index: hit.index,
            label: getSpriteDisplayLabel(hit.obj.sprite),
            meta: `히트박스 ${hit.index + 1}`
          }));
          showLayerPicker(items.reverse(), e.clientX, e.clientY);
          return;
        }
      }
      state.selectedIds = [selected.id];
      state.selectedId = selected.id;
      state.selectedSpecial = 'hitbox';
      if (e.ctrlKey || e.metaKey) {
        toggleHitboxSelection(index);
      } else {
        setHitboxSelection([index], index);
      }
      state.showHitboxes = true;
      let currentAction = getSelectionAction('hitbox');
      syncProperties();
      if (isPoly && currentAction !== 'move') return;
      if (!guidesEditable) return;
      if (currentAction === 'lock') return;
      if (hb.locked) return;
      const handle = e.target.dataset.handle;
      if (currentAction === 'crop' && !handle) {
        return;
      }
      if (!handle && currentAction !== 'move') return;
      dragState = null;
      objectTransform = null;
      cropDrag = null;
      const start = screenToWorld(e.clientX, e.clientY);
      const selectedIndices = getSelectedHitboxIndices(selected);
      const groupId = hb.groupId || null;
      const groupIndices = currentAction === 'crop'
        ? allHitboxIndices
        : (handle === 'rotate'
        ? [index]
        : (!handle && selectedIndices.length > 1 && selectedIndices.includes(index)
        ? selectedIndices
        : (groupId
          ? selected.hitboxes
              .map((item, idx) => (item.groupId === groupId ? idx : null))
              .filter((idx) => idx != null)
          : [index])));
      const groupOrigins = groupIndices.map((idx) => {
        const g = selected.hitboxes[idx];
        return { index: idx, x: g.x, y: g.y, w: g.w, h: g.h };
      });
      const groupBounds = groupIndices.length ? getHitboxBoundsByIndices(selected, groupIndices) : null;
      const hbCenterLocalX = hb.x - offsetX + hb.w / 2;
      const hbCenterLocalY = hb.y - offsetY + hb.h / 2;
      const hbCenterWorld = localPointToWorld(hbCenterLocalX, hbCenterLocalY, selected);
      const hbStartAngle = Math.atan2(start.y - hbCenterWorld.y, start.x - hbCenterWorld.x);
      hitboxDrag = {
        mode: currentAction,
        index,
        groupId,
        groupIndices,
        groupOrigins,
        groupBounds,
        sourceHitboxes: cloneHitboxes(selected.hitboxes),
        selectedIndicesAtStart: selectedIndices,
        startX: start.x,
        startY: start.y,
        origX: hb.x,
        origY: hb.y,
        origW: hb.w,
        origH: hb.h,
        origRotation: normalizeHitboxRotation(hb.rotation, 0),
        centerWorldX: hbCenterWorld.x,
        centerWorldY: hbCenterWorld.y,
        startAngle: hbStartAngle,
        pointerId: e.pointerId
      };
      if (handle) hitboxDrag.handle = handle;
      safeSetPointerCapture(hbEl, e.pointerId);
    });
    if (
      state.selectionTarget === 'hitbox' &&
      state.selectedHitboxIndex === index &&
      !hb.locked &&
      guidesEditable &&
      hitboxAction === 'resize' &&
      !isPoly
    ) {
      ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
        const h = document.createElement('div');
        h.className = 'hitbox-handle';
        h.dataset.handle = handle;
        hbEl.appendChild(h);
      });
      if (hitboxAction === 'resize') {
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'hitbox-handle';
        rotateHandle.dataset.handle = 'rotate';
        hbEl.appendChild(rotateHandle);
      }
    }
    els.world.appendChild(hbEl);
  });

  if (
    state.selectionTarget === 'hitbox' &&
    hitboxAction === 'crop' &&
    guidesEditable &&
    allHitboxIndices.length
  ) {
    const cropBounds = getHitboxBoundsByIndices(selected, allHitboxIndices);
    if (cropBounds) {
      const cropBox = document.createElement('div');
      cropBox.className = 'hitbox-crop-rect';
      cropBox.dataset.label = `히트박스 전체 자르기 (${allHitboxIndices.length})`;
      cropBox.style.width = `${Math.max(1, cropBounds.w)}px`;
      cropBox.style.height = `${Math.max(1, cropBounds.h)}px`;
      const scaleX = selected.flipH ? -selected.scale : selected.scale;
      const scaleY = selected.flipV ? -selected.scale : selected.scale;
      cropBox.style.transformOrigin = 'top left';
      cropBox.style.transform = `translate(${selected.x}px, ${selected.y}px) rotate(${selected.rotation}deg) scale(${scaleX}, ${scaleY}) translate(${cropBounds.x - offsetX}px, ${cropBounds.y - offsetY}px)`;
      ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach((handle) => {
        const h = document.createElement('div');
        h.className = 'hitbox-crop-handle';
        h.dataset.handle = handle;
        cropBox.appendChild(h);
      });
      cropBox.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!canSelectHitboxTarget()) return;
        const handle = e.target?.dataset?.handle || null;
        if (!handle) return;
        const start = screenToWorld(e.clientX, e.clientY);
        const primaryIndex = state.selectedHitboxIndex ?? 0;
        setHitboxSelection(allHitboxIndices, primaryIndex);
        state.selectedSpecial = 'hitbox';
        state.showHitboxes = true;
        hitboxDrag = {
          mode: 'crop',
          index: primaryIndex,
          groupId: '__all__',
          groupIndices: allHitboxIndices,
          groupOrigins: allHitboxIndices.map((idx) => {
            const g = selected.hitboxes[idx];
            return { index: idx, x: g.x, y: g.y, w: g.w, h: g.h };
          }),
          groupBounds: cropBounds,
          sourceHitboxes: cloneHitboxes(selected.hitboxes),
          selectedIndicesAtStart: allHitboxIndices,
          startX: start.x,
          startY: start.y,
          pointerId: e.pointerId,
          handle
        };
        safeSetPointerCapture(cropBox, e.pointerId);
        syncProperties();
      });
      els.world.appendChild(cropBox);
    }
  }
};

const screenToWorld = (clientX, clientY) => {
  const rect = els.viewport.getBoundingClientRect();
  const x = clientX - rect.left + els.viewport.scrollLeft;
  const y = clientY - rect.top + els.viewport.scrollTop;
  return { x, y };
};

const getObjectCrop = (obj) => {
  const meta = getSpriteMetaSize(obj.sprite, { w: 200, h: 80 });
  if (!obj.crop) {
    return { x: 0, y: 0, w: meta.w, h: meta.h };
  }
  return { ...obj.crop };
};

const getFullObjectCrop = (obj) => {
  const meta = getSpriteMetaSize(obj.sprite, { w: 200, h: 80 });
  return { x: 0, y: 0, w: meta.w, h: meta.h };
};

const getObjectHitboxBounds = (obj) => {
  if (!obj) return { x: 0, y: 0, w: 1, h: 1 };
  const base = obj.crop ? getObjectCrop(obj) : getFullObjectCrop(obj);
  return {
    x: Math.round(base.x),
    y: Math.round(base.y),
    w: Math.max(1, Math.round(base.w)),
    h: Math.max(1, Math.round(base.h))
  };
};

const clipHitboxToBounds = (hitbox, bounds, options = {}) => {
  if (!hitbox || !bounds) return null;
  const fallbackToNearest = options.fallbackToNearest !== false;
  const minX = bounds.x;
  const minY = bounds.y;
  const maxX = minX + bounds.w;
  const maxY = minY + bounds.h;
  if (isPolygonHitbox(hitbox)) {
    const points = (normalizePolygonPoints ? normalizePolygonPoints(hitbox.points) : hitbox.points) || hitbox.points;
    if (!Array.isArray(points) || points.length < 3) return null;
    const baseX = Math.round(Number(hitbox.x) || 0);
    const baseY = Math.round(Number(hitbox.y) || 0);
    const clampedAbs = points.map((point) => ({
      x: Math.max(minX, Math.min(maxX, baseX + Number(point.x || 0))),
      y: Math.max(minY, Math.min(maxY, baseY + Number(point.y || 0)))
    }));
    const deduped = [];
    clampedAbs.forEach((point) => {
      const prev = deduped[deduped.length - 1];
      if (!prev || Math.abs(prev.x - point.x) > 0.001 || Math.abs(prev.y - point.y) > 0.001) {
        deduped.push(point);
      }
    });
    if (deduped.length >= 2) {
      const first = deduped[0];
      const last = deduped[deduped.length - 1];
      if (Math.abs(first.x - last.x) <= 0.001 && Math.abs(first.y - last.y) <= 0.001) {
        deduped.pop();
      }
    }
    if (deduped.length < 3) return fallbackToNearest ? {
      x: minX,
      y: minY,
      w: 1,
      h: 1,
      rotation: 0,
      locked: !!hitbox.locked
    } : null;
    const minPX = Math.min(...deduped.map((point) => point.x));
    const minPY = Math.min(...deduped.map((point) => point.y));
    const maxPX = Math.max(...deduped.map((point) => point.x));
    const maxPY = Math.max(...deduped.map((point) => point.y));
    const relPoints = deduped.map((point) => ({
      x: Math.round((point.x - minPX) * 1000) / 1000,
      y: Math.round((point.y - minPY) * 1000) / 1000
    }));
    const nextEdgeSlip = normalizePolygonEdgeSlip
      ? normalizePolygonEdgeSlip(hitbox.edgeSlip, relPoints.length)
      : null;
    return {
      ...hitbox,
      type: 'polygon',
      x: Math.round(minPX),
      y: Math.round(minPY),
      w: Math.max(1, Math.round(maxPX - minPX)),
      h: Math.max(1, Math.round(maxPY - minPY)),
      rotation: 0,
      locked: !!hitbox.locked,
      points: relPoints,
      ...(nextEdgeSlip ? { edgeSlip: nextEdgeSlip } : {}),
      ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
    };
  }
  const rawX = Math.round(Number(hitbox.x) || 0);
  const rawY = Math.round(Number(hitbox.y) || 0);
  const rawW = Math.max(1, Math.round(Number(hitbox.w) || 1));
  const rawH = Math.max(1, Math.round(Number(hitbox.h) || 1));

  let x1 = Math.max(minX, rawX);
  let y1 = Math.max(minY, rawY);
  let x2 = Math.min(maxX, rawX + rawW);
  let y2 = Math.min(maxY, rawY + rawH);

  // Keep overlap as intersection first. If fully outside, optionally clamp to nearest 1px box.
  if (x2 <= x1) {
    if (!fallbackToNearest) return null;
    if (rawX + rawW <= minX) {
      x1 = minX;
      x2 = minX + 1;
    } else if (rawX >= maxX) {
      x2 = maxX;
      x1 = maxX - 1;
    } else {
      x1 = Math.max(minX, Math.min(rawX, maxX - 1));
      x2 = Math.min(maxX, x1 + 1);
    }
  }
  if (y2 <= y1) {
    if (!fallbackToNearest) return null;
    if (rawY + rawH <= minY) {
      y1 = minY;
      y2 = minY + 1;
    } else if (rawY >= maxY) {
      y2 = maxY;
      y1 = maxY - 1;
    } else {
      y1 = Math.max(minY, Math.min(rawY, maxY - 1));
      y2 = Math.min(maxY, y1 + 1);
    }
  }

  const x = Math.round(x1);
  const y = Math.round(y1);
  const w = Math.max(1, Math.round(x2 - x1));
  const h = Math.max(1, Math.round(y2 - y1));
  return {
    ...hitbox,
    x,
    y,
    w,
    h,
    rotation: normalizeHitboxRotation(hitbox.rotation, 0),
    locked: !!hitbox.locked,
    ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
  };
};

const clipHitboxToRect = (hitbox, rect) => {
  if (!hitbox || !rect) return null;
  if (isPolygonHitbox(hitbox)) {
    return clipHitboxToBounds(hitbox, rect, { fallbackToNearest: false });
  }
  const rawX = Math.round(Number(hitbox.x) || 0);
  const rawY = Math.round(Number(hitbox.y) || 0);
  const rawW = Math.max(1, Math.round(Number(hitbox.w) || 1));
  const rawH = Math.max(1, Math.round(Number(hitbox.h) || 1));
  const x1 = Math.max(rawX, Math.round(rect.x));
  const y1 = Math.max(rawY, Math.round(rect.y));
  const x2 = Math.min(rawX + rawW, Math.round(rect.x + rect.w));
  const y2 = Math.min(rawY + rawH, Math.round(rect.y + rect.h));
  if (x2 <= x1 || y2 <= y1) return null;
  return {
    ...hitbox,
    x: Math.round(x1),
    y: Math.round(y1),
    w: Math.max(1, Math.round(x2 - x1)),
    h: Math.max(1, Math.round(y2 - y1)),
    rotation: normalizeHitboxRotation(hitbox.rotation, 0),
    locked: !!hitbox.locked,
    ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
  };
};

const clampHitboxToObjectBounds = (obj, hitbox, options = {}) => {
  if (!obj || !hitbox) return null;
  const bounds = getObjectHitboxBounds(obj);
  return clipHitboxToBounds(hitbox, bounds, options);
};

const clipHitboxesToObjectBounds = (obj, hitboxes, options = {}) => {
  if (!obj) return [];
  const list = Array.isArray(hitboxes) ? hitboxes : [];
  const bounds = getObjectHitboxBounds(obj);
  return list
    .map((hitbox) => clipHitboxToBounds(hitbox, bounds, options))
    .filter(Boolean);
};

const maybeSnapDisplacedLargeSingleHitbox = (obj, hitboxes) => {
  if (!obj || !Array.isArray(hitboxes) || hitboxes.length !== 1) return;
  const hb = hitboxes[0];
  if (!hb) return;
  // This legacy correction is only safe for axis-aligned rect hitboxes.
  // Polygon hitboxes can intentionally have non-zero local x/y offsets
  // (e.g. ground contour under transparent top margin), so snapping them
  // to object bounds causes visible upward/downward drift after reload.
  if (isPolygonHitbox(hb)) return;
  const bounds = getObjectHitboxBounds(obj);
  const boundsW = Math.max(1, bounds.w);
  const boundsH = Math.max(1, bounds.h);
  const coverageW = Math.max(0, Math.min(1, (Number(hb.w) || 0) / boundsW));
  const coverageH = Math.max(0, Math.min(1, (Number(hb.h) || 0) / boundsH));
  const areaRatio = (Math.max(1, Number(hb.w) || 1) * Math.max(1, Number(hb.h) || 1)) / (boundsW * boundsH);
  const displacedX = Math.abs((Number(hb.x) || 0) - bounds.x);
  const displacedY = Math.abs((Number(hb.y) || 0) - bounds.y);
  const largeLike =
    areaRatio >= 0.35 ||
    (coverageW >= 0.7 && coverageH >= 0.45) ||
    (coverageW >= 0.45 && coverageH >= 0.7);
  const displacedLike =
    displacedX >= Math.max(4, boundsW * 0.05) ||
    displacedY >= Math.max(4, boundsH * 0.05);
  if (!largeLike || !displacedLike) return;
  hb.x = bounds.x;
  hb.y = bounds.y;
  hb.w = bounds.w;
  hb.h = bounds.h;
};

const arePolygonPointsEquivalent = (aPoints, bPoints, tolerance = 0.01) => {
  const a = normalizePolygonPoints(aPoints);
  const b = normalizePolygonPoints(bPoints);
  if (!a || !b || a.length !== b.length) return false;
  const tol = Math.max(0.0001, Number(tolerance) || 0.01);
  for (let i = 0; i < a.length; i += 1) {
    if (Math.abs((Number(a[i].x) || 0) - (Number(b[i].x) || 0)) > tol) return false;
    if (Math.abs((Number(a[i].y) || 0) - (Number(b[i].y) || 0)) > tol) return false;
  }
  return true;
};

const maybeRestorePolygonOffsetFromProfile = (obj, hitboxes) => {
  if (!obj || !Array.isArray(hitboxes) || hitboxes.length !== 1) return;
  const hb = hitboxes[0];
  if (!isPolygonHitbox(hb)) return;
  const profile = getSpriteProfile(obj.sprite);
  if (!profile?.hitboxes?.length || profile.hitboxes.length !== 1) return;
  const profileHitbox = profile.hitboxes[0];
  if (!isPolygonHitbox(profileHitbox)) return;
  if (!arePolygonPointsEquivalent(hb.points, profileHitbox.points)) return;

  const currentX = Number(hb.x) || 0;
  const currentY = Number(hb.y) || 0;
  const profileX = Number(profileHitbox.x) || 0;
  const profileY = Number(profileHitbox.y) || 0;
  const profileW = Math.max(1, Math.round(Number(profileHitbox.w) || 1));
  const profileH = Math.max(1, Math.round(Number(profileHitbox.h) || 1));
  const profileOffsetMagnitude = Math.abs(profileX) + Math.abs(profileY);
  const currentNearOrigin = Math.abs(currentX) <= 1 && Math.abs(currentY) <= 1;
  const alreadyAligned =
    Math.abs(currentX - profileX) <= 1 &&
    Math.abs(currentY - profileY) <= 1 &&
    Math.abs((Number(hb.w) || 0) - profileW) <= 1 &&
    Math.abs((Number(hb.h) || 0) - profileH) <= 1;
  if (alreadyAligned) return;
  if (!currentNearOrigin || profileOffsetMagnitude < 1) return;

  hb.x = Math.round(profileX);
  hb.y = Math.round(profileY);
  hb.w = profileW;
  hb.h = profileH;
  if (Array.isArray(profileHitbox.edgeSlip)) {
    hb.edgeSlip = normalizePolygonEdgeSlip(profileHitbox.edgeSlip, hb.points.length) || profileHitbox.edgeSlip;
  }
};

const getHitboxSetBounds = (hitboxes) => {
  if (!Array.isArray(hitboxes) || !hitboxes.length) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  hitboxes.forEach((hitbox) => {
    const x = Math.round(Number(hitbox?.x) || 0);
    const y = Math.round(Number(hitbox?.y) || 0);
    const w = Math.max(1, Math.round(Number(hitbox?.w) || 1));
    const h = Math.max(1, Math.round(Number(hitbox?.h) || 1));
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
};

const getHitboxSetCoverageScore = (hitboxes, boundsRect) => {
  if (!Array.isArray(hitboxes) || !hitboxes.length || !boundsRect) return 0;
  let overlap = 0;
  let total = 0;
  hitboxes.forEach((hitbox) => {
    const x = Math.round(Number(hitbox?.x) || 0);
    const y = Math.round(Number(hitbox?.y) || 0);
    const w = Math.max(1, Math.round(Number(hitbox?.w) || 1));
    const h = Math.max(1, Math.round(Number(hitbox?.h) || 1));
    const x1 = x;
    const y1 = y;
    const x2 = x + w;
    const y2 = y + h;
    total += w * h;
    const ix1 = Math.max(x1, boundsRect.minX);
    const iy1 = Math.max(y1, boundsRect.minY);
    const ix2 = Math.min(x2, boundsRect.maxX);
    const iy2 = Math.min(y2, boundsRect.maxY);
    if (ix2 > ix1 && iy2 > iy1) {
      overlap += (ix2 - ix1) * (iy2 - iy1);
    }
  });
  if (total <= 0) return 0;
  return overlap / total;
};

const shiftHitboxSet = (hitboxes, dx, dy) =>
  hitboxes.map((hitbox) => ({
    ...hitbox,
    x: Math.round(Number(hitbox.x) || 0) + dx,
    y: Math.round(Number(hitbox.y) || 0) + dy
  }));

const alignHitboxSetToObjectBounds = (obj, hitboxes) => {
  if (!obj || !Array.isArray(hitboxes) || !hitboxes.length) return hitboxes;
  const bounds = getObjectHitboxBounds(obj);
  const boundsRect = {
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.w,
    maxY: bounds.y + bounds.h
  };
  if (areHitboxesInsideRect(hitboxes, boundsRect)) return hitboxes;
  const setBounds = getHitboxSetBounds(hitboxes);
  if (!setBounds) return hitboxes;
  const setW = setBounds.w;
  const setH = setBounds.h;
  // If saved set is far larger than object bounds, skip global shift and rely on per-box clamp.
  if (setW > bounds.w * 1.5 || setH > bounds.h * 1.5) return hitboxes;
  const xCandidates = Array.from(
    new Set(
      [
        0,
        boundsRect.minX - setBounds.minX,
        Math.round(boundsRect.minX + (bounds.w - setW) / 2 - setBounds.minX),
        boundsRect.maxX - setBounds.maxX
      ].map((v) => Math.round(v))
    )
  );
  const yCandidates = Array.from(
    new Set(
      [
        0,
        boundsRect.minY - setBounds.minY,
        Math.round(boundsRect.minY + (bounds.h - setH) / 2 - setBounds.minY),
        boundsRect.maxY - setBounds.maxY
      ].map((v) => Math.round(v))
    )
  );
  let best = hitboxes;
  let bestScore = getHitboxSetCoverageScore(hitboxes, boundsRect);
  xCandidates.forEach((dx) => {
    yCandidates.forEach((dy) => {
      if (dx === 0 && dy === 0) return;
      const shifted = shiftHitboxSet(hitboxes, dx, dy);
      const score = getHitboxSetCoverageScore(shifted, boundsRect);
      if (score > bestScore + 0.001) {
        best = shifted;
        bestScore = score;
      }
    });
  });
  // Apply only when improvement is clear to avoid moving valid user layouts.
  if (best !== hitboxes && (bestScore >= 0.9 || bestScore >= getHitboxSetCoverageScore(hitboxes, boundsRect) + 0.2)) {
    return best;
  }
  return hitboxes;
};

const normalizeObjectHitboxesWithinBounds = (obj, options = {}) => {
  if (!obj) return;
  const normalizeCropSpace = options.normalizeCropSpace !== false;
  const preserveSetPosition = options.preserveSetPosition === true;
  const strictClip = options.strictClip === true;
  const allowEmpty = options.allowEmpty === true;
  let list = Array.isArray(obj.hitboxes) ? obj.hitboxes : [];
  if (obj.crop && normalizeCropSpace) {
    list = normalizeHitboxesForCropSpace(list, obj.crop);
  }
  const canClampToBounds = !!obj.crop || hasReliableSpriteBounds(obj.sprite);
  if (!canClampToBounds) {
    obj.hitboxes = list
      .filter((hitbox) => hitbox && typeof hitbox === 'object')
      .map((hitbox) => {
        if (isPolygonHitbox(hitbox)) {
          return normalizePolygonHitbox(hitbox);
        }
        return {
          ...hitbox,
          x: Math.round(Number(hitbox.x) || 0),
          y: Math.round(Number(hitbox.y) || 0),
          w: Math.max(1, Math.round(Number(hitbox.w) || 1)),
          h: Math.max(1, Math.round(Number(hitbox.h) || 1)),
          rotation: normalizeHitboxRotation(hitbox.rotation, 0),
          locked: !!hitbox.locked,
          ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
        };
      })
      .filter(Boolean);
    if (!obj.hitboxes.length) {
      obj.hitboxes = [createDefaultHitbox(obj.sprite)];
    }
    return;
  }
  if (!preserveSetPosition) {
    list = alignHitboxSetToObjectBounds(obj, list);
  }
  obj.hitboxes = list
    .map((hitbox) => clampHitboxToObjectBounds(obj, hitbox, { fallbackToNearest: !strictClip }))
    .filter(Boolean);
  if (!obj.hitboxes.length && !allowEmpty) {
    obj.hitboxes = [clampHitboxToObjectBounds(obj, createDefaultHitbox(obj.sprite))];
  }
  if (!preserveSetPosition) {
    maybeSnapDisplacedLargeSingleHitbox(obj, obj.hitboxes);
  }
};

// Keep hitboxes in object-local space even when object scale changes.
// Rendering/physics transforms (object scale/rotation/flip) are applied later.
const normalizeLocalHitboxGeometry = (obj) => {
  if (!obj || !Array.isArray(obj.hitboxes)) return;
  obj.hitboxes = obj.hitboxes
    .filter((hitbox) => hitbox && typeof hitbox === 'object')
    .map((hitbox) => {
      if (isPolygonHitbox(hitbox)) {
        return normalizePolygonHitbox(hitbox);
      }
      return {
        ...hitbox,
        x: Math.round(Number(hitbox.x) || 0),
        y: Math.round(Number(hitbox.y) || 0),
        w: Math.max(1, Math.round(Number(hitbox.w) || 1)),
        h: Math.max(1, Math.round(Number(hitbox.h) || 1)),
        rotation: normalizeHitboxRotation(hitbox.rotation, 0),
        locked: !!hitbox.locked,
        ...(hitbox.groupId ? { groupId: String(hitbox.groupId) } : {})
      };
    })
    .filter(Boolean);
};

const isObjectCropModeActive = (objId = state.selectedId) => {
  if (!objId) return false;
  if (state.selectedSpecial === 'player') return false;
  if (state.selectionTarget !== 'object') return false;
  if (getSelectionAction('object') !== 'crop') return false;
  const selected = state.objects.find((item) => item.id === objId);
  return !!selected?.crop;
};

const beginObjectCropSession = (obj) => {
  if (!obj?.crop) return null;
  if (!isObjectCropModeActive(obj.id)) return null;
  if (!objectCropSession || objectCropSession.id !== obj.id) {
    objectCropSession = {
      id: obj.id,
      anchor: { ...obj.crop }
    };
  }
  return objectCropSession;
};

const endObjectCropSession = ({ preserveVisual = true } = {}) => {
  if (!objectCropSession) return;
  const obj = state.objects.find((item) => item.id === objectCropSession.id);
  if (preserveVisual && obj?.crop) {
    const anchor = objectCropSession.anchor || obj.crop;
    const dx = (obj.crop.x || 0) - (anchor.x || 0);
    const dy = (obj.crop.y || 0) - (anchor.y || 0);
    if (dx !== 0 || dy !== 0) {
      const delta = localDeltaToWorld(obj, dx, dy);
      obj.x += delta.x;
      obj.y += delta.y;
    }
  }
  objectCropSession = null;
};

const getActiveObjectCropAnchor = (obj, crop) => {
  if (isObjectCropModeActive(obj.id)) {
    const session = beginObjectCropSession(obj);
    if (session?.anchor) return session.anchor;
  }
  return crop;
};

const finalizeObjectCropDragAnchor = (drag) => {
  if (!drag || drag.type !== 'object') return;
  const obj = state.objects.find((item) => item.id === drag.id);
  if (!obj || !obj.crop) return;
  // Crop finalize keeps world position fixed and only normalizes hitbox bounds.
  normalizeObjectHitboxesWithinBounds(obj, { normalizeCropSpace: false, preserveSetPosition: true });
};

const isPlayerCropModeActive = () => (
  state.selectedSpecial === 'player'
  && state.selectionTarget === 'object'
  && getSelectionAction('player') === 'crop'
  && !!state.playerCrop
);

const beginPlayerCropSession = () => {
  if (!isPlayerCropModeActive()) return null;
  const crop = getPlayerCrop();
  if (!playerCropSession) {
    playerCropSession = {
      anchor: { ...crop }
    };
  }
  return playerCropSession;
};

const endPlayerCropSession = ({ preserveVisual = true } = {}) => {
  if (!playerCropSession) return;
  if (preserveVisual && state.playerCrop && state.startPoint) {
    const anchor = playerCropSession.anchor || state.playerCrop;
    const dx = ((state.playerCrop.x || 0) - (anchor.x || 0)) * state.playerScale;
    const dy = ((state.playerCrop.y || 0) - (anchor.y || 0)) * state.playerScale;
    if (dx !== 0 || dy !== 0) {
      state.startPoint = {
        x: state.startPoint.x - dx,
        y: state.startPoint.y - dy
      };
      ensureStartPoint();
    }
  }
  playerCropSession = null;
};

const getActivePlayerCropAnchor = (crop) => {
  if (isPlayerCropModeActive()) {
    const session = beginPlayerCropSession();
    if (session?.anchor) return session.anchor;
  }
  return crop;
};

const clampCrop = (obj, crop) => {
  const meta = getSpriteMetaSize(obj.sprite, { w: 200, h: 80 });
  const x = Math.max(0, Math.min(meta.w - 1, crop.x));
  const y = Math.max(0, Math.min(meta.h - 1, crop.y));
  const w = Math.max(1, Math.min(meta.w - x, crop.w));
  const h = Math.max(1, Math.min(meta.h - y, crop.h));
  return { x, y, w, h };
};

const syncProperties = () => {
  ensureSelectionCoherence();
  updateSelectionActionButtons();
  const guidesVisible = areBoxGuidesVisible();
  const guidesEditable = areBoxGuidesEditable();
  const canSaveGroupPreset = (
    state.selectionTarget === 'object'
    && state.selectedSpecial !== 'player'
    && getSelectedObjects().length >= 2
  );
  if (els.saveGroupPreset) {
    els.saveGroupPreset.disabled = !canSaveGroupPreset;
  }
  if (els.groupPresetName && !els.groupPresetName.value.trim()) {
    els.groupPresetName.placeholder = `묶음 ${Object.keys(state.objectGroupPresets || {}).length + 1}`;
  }
  if (state.selectedSpecial === 'player') {
    els.noSelection.classList.add('hidden');
    els.propFields.classList.add('hidden');
    if (els.playerFields) els.playerFields.classList.remove('hidden');
    if (els.selectionActions) els.selectionActions.classList.remove('hidden');
    if (els.quickOpenObjectWorkbench) els.quickOpenObjectWorkbench.disabled = false;
    if (els.quickSaveHitboxPreset) els.quickSaveHitboxPreset.disabled = true;
    if (els.quickApplyHitboxPreset) els.quickApplyHitboxPreset.disabled = true;
    if (els.autoAlphaHitbox) els.autoAlphaHitbox.classList.add('hidden');
    setAutoAlphaStatus('');
    ensureStartPoint();
    if (els.startX) els.startX.value = Math.round(state.startPoint?.x ?? 0);
    if (els.startY) els.startY.value = Math.round(state.startPoint?.y ?? 0);
    if (els.playerSprite) {
      els.playerSprite.textContent = SPRITES.idle.replace('.png', '');
    }
    updatePlayerProfileStatus();
    if (els.playerCropEnabled && els.playerCropFields) {
      const crop = state.playerCrop ? getPlayerCrop() : null;
      els.playerCropEnabled.checked = !!state.playerCrop;
      els.playerCropFields.classList.toggle('hidden', !state.playerCrop);
      if (crop) {
        els.playerCropX.value = Math.round(crop.x);
        els.playerCropY.value = Math.round(crop.y);
        els.playerCropW.value = Math.round(crop.w);
        els.playerCropH.value = Math.round(crop.h);
      } else {
        els.playerCropX.value = '';
        els.playerCropY.value = '';
        els.playerCropW.value = '';
        els.playerCropH.value = '';
      }
    }
    syncPlayerHitboxInputs();
    const pointTool = getPlayerPointToolState();
    if (els.playerHitboxPointToggle) {
      els.playerHitboxPointToggle.textContent = pointTool.active ? '점 찍기 종료' : '점 찍기 시작';
      els.playerHitboxPointToggle.classList.toggle('is-active', pointTool.active);
    }
    if (els.playerHitboxPointUndo) {
      els.playerHitboxPointUndo.disabled = pointTool.points.length < 1;
    }
    if (els.playerHitboxPointClear) {
      els.playerHitboxPointClear.disabled = pointTool.points.length < 1;
    }
    if (els.playerHitboxPointApply) {
      els.playerHitboxPointApply.disabled = !pointTool.active || pointTool.points.length < 3;
    }
    if (els.playerHitboxPointStatus) {
      els.playerHitboxPointStatus.textContent = pointTool.active
        ? `점 기반 히트박스: 활성 (${pointTool.points.length}개)`
        : '점 기반 히트박스: 비활성';
    }
    if (els.actionCrop) els.actionCrop.disabled = !guidesEditable;
    if (els.actionResize) els.actionResize.disabled = !guidesEditable;
    if (els.actionMove) els.actionMove.disabled = !guidesEditable;
    if (els.actionLock) {
      els.actionLock.textContent = state.playerLocked ? '잠금 해제' : '잠금';
      els.actionLock.disabled = !guidesEditable;
    }
    return;
  }
  const selected = getSelected();
  if (!selected) {
    els.noSelection.classList.remove('hidden');
    els.propFields.classList.add('hidden');
    if (els.playerFields) els.playerFields.classList.add('hidden');
    if (els.selectionActions) els.selectionActions.classList.add('hidden');
    if (els.quickOpenObjectWorkbench) els.quickOpenObjectWorkbench.disabled = true;
    if (els.quickSaveHitboxPreset) els.quickSaveHitboxPreset.disabled = true;
    if (els.quickApplyHitboxPreset) els.quickApplyHitboxPreset.disabled = true;
    if (els.autoAlphaHitbox) els.autoAlphaHitbox.classList.add('hidden');
    setAutoAlphaStatus('');
    const pointTool = getPlayerPointToolState();
    pointTool.active = false;
    pointTool.points = [];
    return;
  }
  els.noSelection.classList.add('hidden');
  els.propFields.classList.remove('hidden');
  if (els.playerFields) els.playerFields.classList.add('hidden');
  if (els.selectionActions) els.selectionActions.classList.remove('hidden');
  els.propSprite.textContent = getSpriteDisplayLabel(selected.sprite);
  if (els.propTextureField && els.propTextureType) {
    const textureType = getTextureTypeFromSprite(selected.sprite);
    const isTexture = !!textureType;
    els.propTextureField.classList.toggle('hidden', !isTexture);
    if (isTexture) {
      els.propTextureType.value = textureType;
      if (els.propTextureColorRow && els.propTextureColor) {
        const showSolidColor = textureType === 'solid';
        els.propTextureColorRow.classList.toggle('hidden', !showSolidColor);
        els.propTextureColor.value = normalizeHexColor(selected.textureColor);
      }
    } else if (els.propTextureColorRow) {
      els.propTextureColorRow.classList.add('hidden');
    }
  }
  els.propX.value = Math.round(selected.x);
  els.propY.value = Math.round(selected.y);
  els.propScale.value = selected.scale;
  els.propRotation.value = selected.rotation;
  if (els.propRotationRange) els.propRotationRange.value = selected.rotation;
  els.propFlipH.checked = selected.flipH;
  els.propFlipV.checked = selected.flipV;

  if (els.cropEnabled && els.cropFields) {
    const crop = selected.crop ? getObjectCrop(selected) : null;
    els.cropEnabled.checked = !!selected.crop;
    els.cropFields.classList.toggle('hidden', !selected.crop);
    if (crop) {
      els.cropX.value = Math.round(crop.x);
      els.cropY.value = Math.round(crop.y);
      els.cropW.value = Math.round(crop.w);
      els.cropH.value = Math.round(crop.h);
    } else {
      els.cropX.value = '';
      els.cropY.value = '';
      els.cropW.value = '';
      els.cropH.value = '';
    }
    if (state.selectionTarget === 'hitbox') {
      els.cropEnabled.checked = !!selected.crop;
      els.cropEnabled.disabled = true;
      els.cropFields.classList.add('hidden');
    } else {
      els.cropEnabled.disabled = false;
    }
  }

  if (els.hitboxToggle && els.hitboxControls) {
    els.hitboxToggle.textContent = state.showHitboxes ? '숨기기' : '비치하기';
    els.hitboxControls.classList.toggle('hidden', false);
    els.hitboxToggle.disabled = !guidesVisible;
  }
  if (els.clearAllHitboxes) {
    els.clearAllHitboxes.disabled = !Array.isArray(selected.hitboxes) || !selected.hitboxes.length;
  }
  if (els.applyHitboxPreset) {
    const profile = getSpriteProfile(selected.sprite);
    els.applyHitboxPreset.disabled = !(profile?.hitboxes?.length);
    if (els.quickApplyHitboxPreset) {
      els.quickApplyHitboxPreset.disabled = els.applyHitboxPreset.disabled;
    }
  }
  if (els.quickOpenObjectWorkbench) els.quickOpenObjectWorkbench.disabled = false;
  if (els.quickSaveHitboxPreset) els.quickSaveHitboxPreset.disabled = false;
  if (els.autoAlphaHitbox) {
    const canAutoAlpha = canAutoAlphaExtract(selected.sprite);
    els.autoAlphaHitbox.classList.toggle('hidden', !canAutoAlpha);
    els.autoAlphaHitbox.disabled = !canAutoAlpha;
    if (!canAutoAlpha) setAutoAlphaStatus('');
  }

  els.hitboxList.innerHTML = '';
  const selectedHitboxSet = new Set(getSelectedHitboxIndices(selected));
  selected.hitboxes.forEach((hb, idx) => {
    const isPoly = isPolygonHitbox(hb);
    const item = document.createElement('div');
    const isPrimary = state.selectedHitboxIndex === idx;
    const isSelected = selectedHitboxSet.has(idx);
    item.className = `hitbox-item${isPrimary ? ' is-selected' : ''}${isSelected ? ' is-multi-selected' : ''}`;
    item.innerHTML = `
      <div class="row">
        <input type="number" data-field="x" value="${hb.x}" />
        <input type="number" data-field="y" value="${hb.y}" />
        <input type="number" data-field="w" value="${hb.w}" ${isPoly ? 'disabled' : ''} />
        <input type="number" data-field="h" value="${hb.h}" ${isPoly ? 'disabled' : ''} />
        <input type="number" data-field="rotation" min="0" max="359" step="1" value="${normalizeHitboxRotation(hb.rotation, 0)}" ${isPoly ? 'disabled' : ''} />
      </div>
      <button type="button" class="secondary" data-remove>삭제</button>
    `;
    item.addEventListener('click', (e) => {
      if (e.target.closest('input') || e.target.closest('button')) return;
      if (!canSelectHitboxTarget()) return;
      state.selectedSpecial = 'hitbox';
      if (e.ctrlKey || e.metaKey) {
        toggleHitboxSelection(idx);
      } else {
        setHitboxSelection([idx], idx);
      }
      state.showHitboxes = true;
      renderWorld();
      syncProperties();
    });
    item.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        const numeric = Number(input.value);
        if (field === 'rotation') {
          hb.rotation = normalizeHitboxRotation(numeric, 0);
          input.value = hb.rotation;
        } else if (field === 'w' || field === 'h' || field === 'x' || field === 'y') {
          const next = {
            ...hb,
            [field]: Math.round(numeric || 0)
          };
          if (field === 'w' || field === 'h') {
            next[field] = Math.max(1, next[field]);
          }
          const normalized = clampHitboxToObjectBounds(selected, next);
          if (isPolygonHitbox(hb) && isPolygonHitbox(normalized)) {
            selected.hitboxes[idx] = normalized;
          } else {
            hb.x = normalized.x;
            hb.y = normalized.y;
            hb.w = normalized.w;
            hb.h = normalized.h;
          }
          const current = selected.hitboxes[idx] || hb;
          input.value = current[field];
        }
        renderWorld();
        syncProperties();
      });
    });
    item.querySelector('[data-remove]').addEventListener('click', () => {
      selected.hitboxes.splice(idx, 1);
      const nextIndices = getSelectedHitboxIndices(selected).filter((index) => index !== idx).map((index) => (index > idx ? index - 1 : index));
      setHitboxSelection(nextIndices, nextIndices[nextIndices.length - 1] ?? null);
      renderWorld();
      syncProperties();
    });
    els.hitboxList.appendChild(item);
  });

  if (els.groupHitboxes || els.ungroupHitboxes || els.lockHitboxGroup) {
    const indices = getSelectedHitboxIndices(selected);
    const canGroup = indices.length >= 2;
    const hasGrouped = indices.some((idx) => selected.hitboxes[idx]?.groupId);
    const shouldUnlockGroup = indices.length > 0 && indices.every((idx) => selected.hitboxes[idx]?.locked);
    if (els.groupHitboxes) els.groupHitboxes.disabled = !canGroup;
    if (els.ungroupHitboxes) els.ungroupHitboxes.disabled = !hasGrouped;
    if (els.lockHitboxGroup) {
      els.lockHitboxGroup.disabled = !indices.length;
      els.lockHitboxGroup.textContent = shouldUnlockGroup ? '그룹 잠금 해제' : '그룹 잠금';
    }
  }

  const multi = state.selectedIds.length > 1;
  const activeTarget = getActiveTarget();
  if (els.actionCrop) {
    if (activeTarget === 'object') {
      els.actionCrop.disabled = !guidesEditable || multi;
    } else {
      els.actionCrop.disabled = !guidesEditable;
    }
  }
  if (els.actionResize) {
    const blockedByMulti = activeTarget === 'object' ? multi : false;
    els.actionResize.disabled = !guidesEditable || blockedByMulti;
  }
  if (els.actionRotate) {
    const blockedByMulti = activeTarget === 'object' ? multi : true;
    els.actionRotate.disabled = !guidesEditable || blockedByMulti;
  }
  if (els.actionMove) els.actionMove.disabled = !guidesEditable;
  if (els.actionLock) {
    if (activeTarget === 'player') {
      els.actionLock.textContent = state.playerLocked ? '잠금 해제' : '잠금';
      els.actionLock.disabled = !guidesEditable;
    } else if (activeTarget === 'hitbox') {
      const indices = getSelectedHitboxIndices(selected);
      if (!indices.length) {
        els.actionLock.textContent = '잠금';
        els.actionLock.disabled = true;
      } else {
        const shouldUnlock = indices.every((idx) => selected.hitboxes[idx]?.locked);
        els.actionLock.textContent = shouldUnlock ? '잠금 해제' : '잠금';
        els.actionLock.disabled = !guidesEditable;
      }
    } else {
      const allLocked = state.selectedIds.length
        ? state.selectedIds.every((id) => {
          const obj = state.objects.find((o) => o.id === id);
          return obj && obj.locked;
        })
        : selected.locked;
      els.actionLock.textContent = allLocked ? '잠금 해제' : '잠금';
      els.actionLock.disabled = !guidesEditable;
    }
  }

  if (els.groupObjects || els.ungroupObjects) {
    const objectTargets = state.selectedIds
      .map((id) => state.objects.find((obj) => obj.id === id))
      .filter(Boolean);
    const canGroupObjects = activeTarget === 'object' && objectTargets.length >= 2;
    const canUngroupObjects = activeTarget === 'object' && objectTargets.some((obj) => !!obj.groupId);
    if (els.groupObjects) els.groupObjects.disabled = !guidesEditable || !canGroupObjects;
    if (els.ungroupObjects) els.ungroupObjects.disabled = !guidesEditable || !canUngroupObjects;
  }
};

const updateSelected = (updates) => {
  const selected = getSelected();
  if (!selected) return;
  const hadScaleUpdate = Object.prototype.hasOwnProperty.call(updates, 'scale');
  if (Object.prototype.hasOwnProperty.call(updates, 'scale')) {
    const rawScale = Number(updates.scale);
    const fallback = Number.isFinite(selected.scale) ? selected.scale : 1;
    updates.scale = Math.max(OBJECT_SCALE_MIN, Math.min(OBJECT_SCALE_MAX, Number.isFinite(rawScale) ? rawScale : fallback));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'rotation')) {
    updates.rotation = normalizeObjectRotation(updates.rotation, selected.rotation);
  }
  Object.assign(selected, updates);
  if (hadScaleUpdate) {
    normalizeLocalHitboxGeometry(selected);
  }
  renderWorld();
  syncProperties();
};

const updateSelectionActionButtons = () => {
  if (!els.actionSelect || !els.actionMove || !els.actionResize || !els.actionCrop) return;
  const action = getSelectionAction();
  const guidesVisible = areBoxGuidesVisible();
  const guidesEditable = areBoxGuidesEditable();
  els.actionSelect.classList.toggle('is-active', action === 'select');
  els.actionMove.classList.toggle('is-active', action === 'move');
  els.actionResize.classList.toggle('is-active', action === 'resize');
  if (els.actionRotate) els.actionRotate.classList.toggle('is-active', action === 'rotate');
  els.actionCrop.classList.toggle('is-active', action === 'crop');
  els.actionSelect.disabled = false;
  els.actionMove.disabled = !guidesEditable;
  els.actionResize.disabled = !guidesEditable;
  if (els.actionRotate) els.actionRotate.disabled = !guidesEditable;
  els.actionCrop.disabled = !guidesEditable;
  if (els.actionLock) els.actionLock.disabled = !guidesEditable;
  if (els.targetObject) els.targetObject.classList.toggle('is-active', state.selectionTarget === 'object');
  if (els.targetHitbox) {
    els.targetHitbox.classList.toggle('is-active', state.selectionTarget === 'hitbox');
    els.targetHitbox.disabled = !guidesVisible;
  }
  if (els.boxViewToggle) {
    els.boxViewToggle.classList.toggle('is-active', guidesVisible);
    els.boxViewToggle.textContent = guidesVisible ? '보기 ON' : '보기 OFF';
  }
  if (els.boxEditToggle) {
    els.boxEditToggle.classList.toggle('is-active', guidesEditable);
    els.boxEditToggle.textContent = guidesEditable ? '작업 ON' : '작업 OFF';
    els.boxEditToggle.disabled = !guidesVisible;
  }
  const canReorder = guidesEditable
    && state.selectionTarget === 'object'
    && state.selectedSpecial !== 'player'
    && Array.isArray(state.selectedIds)
    && state.selectedIds.length > 0;
  if (els.orderSendBack) els.orderSendBack.disabled = !canReorder;
  if (els.orderBackward) els.orderBackward.disabled = !canReorder;
  if (els.orderForward) els.orderForward.disabled = !canReorder;
  if (els.orderBringFront) els.orderBringFront.disabled = !canReorder;
};

const createObjectGroupId = () =>
  `obj_group_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

const getObjectSelectionIdsWithGroup = (ids) => {
  const expanded = new Set();
  const sourceIds = Array.isArray(ids) ? ids : [];
  sourceIds.forEach((id) => {
    const obj = state.objects.find((item) => item.id === id);
    if (!obj) return;
    if (obj.groupId) {
      state.objects.forEach((item) => {
        if (item.groupId === obj.groupId) expanded.add(item.id);
      });
      return;
    }
    expanded.add(obj.id);
  });
  return Array.from(expanded);
};

const canReorderSelectedObjects = () =>
  state.selectionTarget === 'object'
  && state.selectedSpecial !== 'player'
  && Array.isArray(state.selectedIds)
  && state.selectedIds.length > 0;

const reorderSelectedObjects = (mode) => {
  if (!canReorderSelectedObjects()) return false;
  const selected = new Set(state.selectedIds);
  const before = state.objects.map((obj) => obj.id).join(',');
  let next = [...state.objects];

  if (mode === 'front') {
    const moved = next.filter((obj) => selected.has(obj.id));
    const rest = next.filter((obj) => !selected.has(obj.id));
    next = [...rest, ...moved];
  } else if (mode === 'back') {
    const moved = next.filter((obj) => selected.has(obj.id));
    const rest = next.filter((obj) => !selected.has(obj.id));
    next = [...moved, ...rest];
  } else if (mode === 'forward') {
    for (let i = next.length - 2; i >= 0; i -= 1) {
      if (selected.has(next[i].id) && !selected.has(next[i + 1].id)) {
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
      }
    }
  } else if (mode === 'backward') {
    for (let i = 1; i < next.length; i += 1) {
      if (selected.has(next[i].id) && !selected.has(next[i - 1].id)) {
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
      }
    }
  } else {
    return false;
  }

  const after = next.map((obj) => obj.id).join(',');
  if (before === after) return false;
  state.objects = next;
  return true;
};

const applySelectedObjectsOrder = (mode) => {
  if (!canReorderSelectedObjects()) return;
  pushHistory();
  const changed = reorderSelectedObjects(mode);
  if (!changed) {
    state.history.pop();
    return;
  }
  renderWorld();
  syncProperties();
};

const setSelection = (ids, primaryId = null) => {
  const wasObjectCrop = isObjectCropModeActive();
  const wasPlayerCrop = isPlayerCropModeActive();
  const groupedIds = getObjectSelectionIdsWithGroup(ids);
  state.selectedIds = Array.from(new Set(groupedIds));
  state.selectedId = state.selectedIds.includes(primaryId)
    ? primaryId
    : (state.selectedIds[0] || null);
  state.selectionTarget = 'object';
  state.selectedSpecial = null;
  state.selectedHitboxIndex = null;
  state.selectedHitboxIndices = [];
  if (wasObjectCrop) {
    endObjectCropSession();
  }
  if (wasPlayerCrop && !isPlayerCropModeActive()) {
    endPlayerCropSession();
  }
  renderWorld();
  syncProperties();
};

const generateObjectId = (usedIds = null) => {
  let id = '';
  do {
    id = `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  } while (usedIds?.has(id));
  if (usedIds) usedIds.add(id);
  return id;
};

const toggleSelection = (id) => {
  const wasObjectCrop = isObjectCropModeActive();
  const wasPlayerCrop = isPlayerCropModeActive();
  const set = new Set(state.selectedIds);
  const targetIds = getObjectSelectionIdsWithGroup([id]);
  const hasAnySelected = targetIds.some((targetId) => set.has(targetId));
  if (hasAnySelected) {
    targetIds.forEach((targetId) => set.delete(targetId));
  } else {
    targetIds.forEach((targetId) => set.add(targetId));
  }
  const ids = Array.from(set);
  state.selectedIds = ids;
  if (!ids.length) {
    state.selectedId = null;
  } else if (!ids.includes(state.selectedId)) {
    state.selectedId = id;
  }
  state.selectionTarget = 'object';
  state.selectedSpecial = null;
  state.selectedHitboxIndex = null;
  state.selectedHitboxIndices = [];
  if (wasObjectCrop) {
    endObjectCropSession();
  }
  if (wasPlayerCrop && !isPlayerCropModeActive()) {
    endPlayerCropSession();
  }
  renderWorld();
  syncProperties();
};

const cloneObject = (obj) => {
  const bounds = getObjectBounds(obj);
  const shiftX = Math.max(1, Math.ceil(bounds.x2 - bounds.x1));
  return {
    ...obj,
    id: generateObjectId(),
    // Keep Y fixed and place clone to the immediate right without overlap.
    x: Math.round((Number(obj.x) || 0) + shiftX),
    y: Math.round(Number(obj.y) || 0),
    crop: cloneCrop(obj.crop),
    hitboxes: cloneHitboxes(obj.hitboxes)
  };
};

const cloneObjectWithOptions = (obj, options = {}) => {
  const usedIds = options.usedIds || null;
  const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : 0;
  const offsetY = Number.isFinite(options.offsetY) ? options.offsetY : 0;
  const regenerateId = options.regenerateId !== false;
  const cloned = {
    ...obj,
    id: regenerateId ? generateObjectId(usedIds) : obj.id,
    x: Math.round((Number(obj.x) || 0) + offsetX),
    y: Math.round((Number(obj.y) || 0) + offsetY),
    crop: cloneCrop(obj.crop),
    hitboxes: cloneHitboxes(Array.isArray(obj.hitboxes) ? obj.hitboxes : [])
  };
  if (!cloned.hitboxes.length) {
    cloned.hitboxes = [createDefaultHitbox(cloned.sprite)];
  }
  normalizeObjectHitboxesWithinBounds(cloned, { preserveSetPosition: true });
  return cloned;
};

const remapPastedObjectGroups = (objects) => {
  const groupMap = new Map();
  objects.forEach((obj) => {
    if (!obj?.groupId) return;
    const prev = String(obj.groupId);
    if (!groupMap.has(prev)) {
      groupMap.set(prev, createObjectGroupId());
    }
    obj.groupId = groupMap.get(prev);
  });
};

const getSelectedObjects = () =>
  (state.selectedIds?.length ? state.selectedIds : (state.selectedId ? [state.selectedId] : []))
    .map((id) => state.objects.find((obj) => obj.id === id))
    .filter(Boolean);

const saveSelectedObjectsAsGroupPreset = (nameInput) => {
  const objects = getSelectedObjects();
  if (objects.length < 2) return { ok: false, error: '오브젝트를 2개 이상 선택하세요.' };
  const presetId = createObjectGroupPresetId();
  const minX = Math.min(...objects.map((obj) => Number(obj.x) || 0));
  const minY = Math.min(...objects.map((obj) => Number(obj.y) || 0));
  const normalizedObjects = objects
    .map((obj, index) =>
      sanitizeObjectGroupPresetObject(
        {
          ...obj,
          x: Math.round((Number(obj.x) || 0) - minX),
          y: Math.round((Number(obj.y) || 0) - minY)
        },
        index
      )
    )
    .filter(Boolean);
  if (!normalizedObjects.length) return { ok: false, error: '저장 가능한 오브젝트가 없습니다.' };
  const fallbackName = `묶음 ${Object.keys(state.objectGroupPresets || {}).length + 1}`;
  const name = normalizeObjectGroupPresetName(nameInput, fallbackName) || fallbackName;
  state.objectGroupPresets[presetId] = {
    name,
    savedAt: new Date().toISOString(),
    objects: normalizedObjects
  };
  persistObjectGroupPresetState();
  return { ok: true, presetId, name, count: normalizedObjects.length };
};

const getSelectedObjectIdsForClipboard = () => {
  const sourceIds = state.selectedIds?.length
    ? state.selectedIds
    : (state.selectedId ? [state.selectedId] : []);
  const valid = new Set(state.objects.map((obj) => obj.id));
  return sourceIds.filter((id, index, arr) => valid.has(id) && arr.indexOf(id) === index);
};

const boundsOverlap = (a, b) => (
  a.x1 < b.x2
  && a.x2 > b.x1
  && a.y1 < b.y2
  && a.y2 > b.y1
);

const wouldClipboardPasteOverlap = (offsetX, offsetY) => {
  if (!objectClipboard?.objects?.length) return false;
  const existingBounds = state.objects.map((obj) => getObjectBounds(obj));
  return objectClipboard.objects.some((obj) => {
    const shifted = {
      ...obj,
      x: Math.round((Number(obj.x) || 0) + offsetX),
      y: Math.round((Number(obj.y) || 0) + offsetY)
    };
    const pastedBounds = getObjectBounds(shifted);
    return existingBounds.some((existing) => boundsOverlap(pastedBounds, existing));
  });
};

const getClipboardPasteOffset = () => {
  const width = Number(objectClipboard?.width);
  const height = Number(objectClipboard?.height);
  const strideX = Math.max(1, (Number.isFinite(width) ? width : 1) + 1);
  const strideY = Math.max(1, (Number.isFinite(height) ? height : 1) + 1);
  const itemCount = Math.max(1, Number(objectClipboard?.count) || objectClipboard?.objects?.length || 1);
  const isMultiPaste = itemCount > 1;

  // Single object: keep current behavior (shift to the right).
  if (!isMultiPaste) {
    return { offsetX: strideX * clipboardPasteCount, offsetY: 0 };
  }

  // Multi objects: find a non-overlapping position upward first.
  const boundsTop = Number(objectClipboard?.boundsTop) || 0;
  let step = Math.max(1, clipboardPasteCount);
  while (step < 2000) {
    const candidateY = -strideY * step;
    if (boundsTop + candidateY < 0) break;
    if (!wouldClipboardPasteOverlap(0, candidateY)) {
      return { offsetX: 0, offsetY: candidateY };
    }
    step += 1;
  }

  // If upward space is tight, try top-clamped position once.
  const topClampedY = -Math.max(0, boundsTop);
  if (!wouldClipboardPasteOverlap(0, topClampedY)) {
    return { offsetX: 0, offsetY: topClampedY };
  }

  // Fallback: preserve non-overlap by shifting right.
  let rightStep = Math.max(1, clipboardPasteCount);
  while (rightStep < 2000) {
    const candidateX = strideX * rightStep;
    if (!wouldClipboardPasteOverlap(candidateX, 0)) {
      return { offsetX: candidateX, offsetY: 0 };
    }
    rightStep += 1;
  }

  return { offsetX: strideX * clipboardPasteCount, offsetY: 0 };
};

const copySelectedObjectsToClipboard = () => {
  const ids = getSelectedObjectIdsForClipboard();
  if (!ids.length) return false;
  const objectById = new Map(state.objects.map((obj) => [obj.id, obj]));
  const source = ids
    .map((id) => objectById.get(id))
    .filter(Boolean);
  const copied = source
    .map((obj) => cloneObjectWithOptions(obj, { regenerateId: false }));
  if (!copied.length) return false;
  const minX = Math.min(...copied.map((obj) => obj.x));
  const minY = Math.min(...copied.map((obj) => obj.y));
  const sourceBounds = source.map((obj) => getObjectBounds(obj));
  const minBX = Math.min(...sourceBounds.map((b) => b.x1));
  const maxBX = Math.max(...sourceBounds.map((b) => b.x2));
  const minBY = Math.min(...sourceBounds.map((b) => b.y1));
  const maxBY = Math.max(...sourceBounds.map((b) => b.y2));
  const width = Math.max(1, Math.round(maxBX - minBX));
  const height = Math.max(1, Math.round(maxBY - minBY));
  objectClipboard = {
    anchor: { x: minX, y: minY },
    width,
    height,
    count: copied.length,
    boundsTop: minBY,
    objects: copied
  };
  clipboardPasteCount = 0;
  return true;
};

const pasteObjectsFromClipboard = () => {
  if (!objectClipboard?.objects?.length) return false;
  clipboardPasteCount += 1;
  const { offsetX, offsetY } = getClipboardPasteOffset();
  const usedIds = new Set(state.objects.map((obj) => obj.id));
  const pasted = objectClipboard.objects.map((obj) =>
    cloneObjectWithOptions(obj, { offsetX, offsetY, regenerateId: true, usedIds })
  );
  if (!pasted.length) return false;
  remapPastedObjectGroups(pasted);
  pushHistory();
  state.objects.push(...pasted);
  const pastedIds = pasted.map((obj) => obj.id);
  state.selectedIds = pastedIds;
  state.selectedId = pastedIds[0] || null;
  state.selectionTarget = 'object';
  state.selectedSpecial = null;
  setHitboxSelection([], null);
  renderWorld();
  syncProperties();
  return true;
};

const worldToViewport = (x, y) => ({
  x: x - els.viewport.scrollLeft,
  y: y - els.viewport.scrollTop
});

const getObjectBounds = (obj) => {
  const meta = getSpriteMetaSize(obj.sprite, { w: 200, h: 80 });
  const crop = obj.crop ? getObjectCrop(obj) : null;
  const renderW = crop ? crop.w : meta.w;
  const renderH = crop ? crop.h : meta.h;
  return computeRotatedBounds(obj, renderW, renderH);
};

// Events
els.paletteSearch.addEventListener('input', renderPalette);
els.paletteRefresh?.addEventListener('click', async () => {
  let refreshed = false;
  const serverNames = await loadPlatesFromServer();
  if (serverNames) {
    saveLocalPlates(serverNames);
    refreshed = true;
    if (!serverNames.length) {
      alert('`quiz_plate` 폴더에 PNG 발판 이미지가 없습니다.');
    }
  }
  if (!refreshed && window.showDirectoryPicker) {
    try {
      const names = await loadPlatesFromDirectory();
      if (names && names.length) {
        saveLocalPlates(names);
        refreshed = true;
      } else if (names && names.length === 0) {
        alert('선택한 폴더에 PNG 발판 이미지가 없습니다.');
      }
    } catch (err) {
      // user cancelled or not allowed
    }
  } else if (!refreshed) {
    alert('브라우저에서 폴더 선택이 지원되지 않습니다. (Chrome/Edge + localhost 권장)');
  }
  await loadPlates({ bustCache: true });
});

els.textureObjectAdd?.addEventListener('click', () => {
  const textureType = normalizeTextureType(els.textureObjectType?.value || 'hanji');
  if (textureType === 'solid' && els.textureObjectColor) {
    els.textureObjectColor.value = normalizeHexColor(els.textureObjectColor.value);
  }
  const sprite = makeTextureSprite(textureType);
  const centerX = els.viewport.scrollLeft + els.viewport.clientWidth / 2;
  const centerY = els.viewport.scrollTop + els.viewport.clientHeight / 2;
  const x = snapValue(centerX);
  const y = snapValue(centerY);
  pushHistory();
  createObject(sprite, x, y);
  setMode('select');
  renderWorld();
  syncProperties();
  renderPalette();
});

els.textureObjectType?.addEventListener('change', () => {
  syncTextureObjectControls();
  renderPalette();
});

els.textureObjectColor?.addEventListener('input', () => {
  const nextColor = normalizeHexColor(els.textureObjectColor.value);
  els.textureObjectColor.value = nextColor;
  const selected = getSelected();
  if (selected && isTextureSprite(selected.sprite) && getTextureTypeFromSprite(selected.sprite) === 'solid') {
    selected.textureColor = nextColor;
    renderWorld();
    syncProperties();
  } else {
    renderPalette();
  }
});

els.presetClearAll?.addEventListener('click', () => {
  if (!Object.keys(state.spriteProfiles || {}).length && !Object.keys(state.hitboxPresets || {}).length) return;
  const ok = window.confirm('저장된 프로파일을 모두 해제할까요?');
  if (!ok) return;
  state.spriteProfiles = {};
  persistSpriteProfiles();
  renderPalette();
  syncProperties();
});

els.groupPresetClearAll?.addEventListener('click', () => {
  if (!Object.keys(state.objectGroupPresets || {}).length) return;
  const ok = window.confirm('저장된 묶음 오브젝트 프리셋을 모두 삭제할까요?');
  if (!ok) return;
  state.objectGroupPresets = {};
  persistObjectGroupPresetState();
  if (isGroupPresetSelectionKey(selectedSprite)) {
    selectedSprite = null;
  }
  renderPalette();
  syncProperties();
});

els.saveGroupPreset?.addEventListener('click', () => {
  const selectedObjects = getSelectedObjects();
  if (selectedObjects.length < 2) {
    alert('묶음 저장은 오브젝트를 2개 이상 선택해야 합니다.');
    return;
  }
  pushHistory();
  const result = saveSelectedObjectsAsGroupPreset(els.groupPresetName?.value || '');
  if (!result.ok) {
    state.history.pop();
    alert(result.error || '묶음 저장에 실패했습니다.');
    return;
  }
  if (els.groupPresetName) {
    els.groupPresetName.value = result.name;
  }
  selectedSprite = makeGroupPresetSelectionKey(result.presetId);
  setMode('place');
  renderPalette();
  syncProperties();
});

els.groupPresetName?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  els.saveGroupPreset?.click();
});

els.modeSelect.addEventListener('click', () => setMode('select'));
els.modePlace.addEventListener('click', () => setMode('place'));
els.modeStart?.addEventListener('click', () => setMode('start'));

const setSelectionAction = (action) => {
  if (action !== 'select' && !areBoxGuidesEditable()) return;
  if (dragState || hitboxDrag || cropDrag || playerHitboxDrag || objectTransform || selectionDrag || workbenchDrag) {
    return;
  }
  const keepLeft = els.viewport.scrollLeft;
  const keepTop = els.viewport.scrollTop;
  const wasObjectCrop = isObjectCropModeActive();
  const wasPlayerCrop = isPlayerCropModeActive();
  if (action === 'select') {
    state.selectionTarget = 'object';
    state.selectedSpecial = null;
    setHitboxSelection([], null);
  }
  if (
    (action === 'crop' || action === 'resize' || action === 'rotate')
    && state.selectedSpecial !== 'player'
    && state.selectionTarget !== 'hitbox'
  ) {
    if (state.selectedSpecial === 'hitbox') state.selectedSpecial = null;
    setHitboxSelection([], null);
    state.selectionTarget = 'object';
  }
  const target = getActiveTarget();
  state.selectionAction[target] = action;
  const selected = getSelected();
  if (action === 'crop') {
    if (target === 'player') {
      if (!state.playerCrop) state.playerCrop = getPlayerCrop();
    } else if (target === 'object') {
      if (selected && !selected.crop) selected.crop = getObjectCrop(selected);
    }
  }
  const nowObjectCrop = isObjectCropModeActive();
  const nowPlayerCrop = isPlayerCropModeActive();
  if (wasObjectCrop && !nowObjectCrop) {
    endObjectCropSession();
  } else if (!wasObjectCrop && nowObjectCrop && selected) {
    beginObjectCropSession(selected);
  }
  if (wasPlayerCrop && !nowPlayerCrop) {
    endPlayerCropSession();
  } else if (!wasPlayerCrop && nowPlayerCrop) {
    beginPlayerCropSession();
  }
  renderWorld();
  syncProperties();
  restoreViewportScroll(keepLeft, keepTop);
};

const setBoxGuidesVisible = (visible) => {
  const nextVisible = !!visible;
  if (state.boxGuidesVisible === nextVisible) return;
  const wasObjectCrop = isObjectCropModeActive();
  const wasPlayerCrop = isPlayerCropModeActive();
  state.boxGuidesVisible = nextVisible;
  if (!nextVisible) {
    state.boxGuidesEditable = false;
    if (state.selectionTarget === 'hitbox') {
      state.selectionTarget = 'object';
      if (state.selectedSpecial === 'hitbox') state.selectedSpecial = null;
      setHitboxSelection([], null);
    }
    workbenchState.paint.enabled = false;
  }
  if (wasObjectCrop && !isObjectCropModeActive()) {
    endObjectCropSession();
  }
  if (wasPlayerCrop && !isPlayerCropModeActive()) {
    endPlayerCropSession();
  }
  renderWorld();
  syncProperties();
};

const setBoxGuidesEditable = (editable) => {
  const nextEditable = !!editable;
  if (state.boxGuidesEditable === nextEditable) return;
  const wasObjectCrop = isObjectCropModeActive();
  const wasPlayerCrop = isPlayerCropModeActive();
  state.boxGuidesEditable = nextEditable;
  if (!nextEditable) {
    dragState = null;
    hitboxDrag = null;
    objectTransform = null;
    cropDrag = null;
    playerHitboxDrag = null;
    workbenchDrag = null;
    workbenchState.paint.enabled = false;
  } else if (!state.boxGuidesVisible) {
    state.boxGuidesVisible = true;
  }
  if (wasObjectCrop && !isObjectCropModeActive()) {
    endObjectCropSession();
  }
  if (wasPlayerCrop && !isPlayerCropModeActive()) {
    endPlayerCropSession();
  }
  renderWorld();
  syncProperties();
};

els.actionMove?.addEventListener('click', () => setSelectionAction('move'));
els.actionSelect?.addEventListener('click', () => setSelectionAction('select'));
els.actionResize?.addEventListener('click', () => setSelectionAction('resize'));
els.actionRotate?.addEventListener('click', () => setSelectionAction('rotate'));
els.actionCrop?.addEventListener('click', () => setSelectionAction('crop'));
els.boxViewToggle?.addEventListener('click', () => {
  setBoxGuidesVisible(!state.boxGuidesVisible);
});
els.boxEditToggle?.addEventListener('click', () => {
  setBoxGuidesEditable(!state.boxGuidesEditable);
});
els.actionLock?.addEventListener('click', () => {
  if (!areBoxGuidesEditable()) return;
  const target = getActiveTarget();
  let changed = false;
  if (target === 'player') {
    pushHistory();
    state.playerLocked = !state.playerLocked;
    changed = true;
  } else if (target === 'hitbox') {
    const selected = getSelected();
    if (!selected) return;
    const indices = getSelectedHitboxIndices(selected);
    if (!indices.length) return;
    const before = indices.map((idx) => !!selected.hitboxes[idx]?.locked);
    const shouldLock = before.some((locked) => !locked);
    pushHistory();
    indices.forEach((idx) => {
      if (selected.hitboxes[idx]) selected.hitboxes[idx].locked = shouldLock;
    });
    changed = indices.some((idx, order) => !!selected.hitboxes[idx]?.locked !== before[order]);
  } else {
    if (!state.selectedIds.length) return;
    const lockTargets = state.selectedIds
      .map((id) => state.objects.find((o) => o.id === id))
      .filter(Boolean);
    if (!lockTargets.length) return;
    const before = lockTargets.map((obj) => !!obj.locked);
    const shouldLock = lockTargets.some((obj) => !obj.locked);
    pushHistory();
    lockTargets.forEach((obj) => {
      obj.locked = shouldLock;
    });
    changed = lockTargets.some((obj, index) => !!obj.locked !== before[index]);
  }
  if (!changed) {
    state.history.pop();
    return;
  }
  renderWorld();
  syncProperties();
});

const setSelectionTarget = (target) => {
  if (target === 'hitbox' && !areBoxGuidesVisible()) return;
  if (dragState || hitboxDrag || cropDrag || playerHitboxDrag || objectTransform || selectionDrag || workbenchDrag) {
    return;
  }
  const keepLeft = els.viewport.scrollLeft;
  const keepTop = els.viewport.scrollTop;
  const wasObjectCrop = isObjectCropModeActive();
  const wasPlayerCrop = isPlayerCropModeActive();
  state.selectionTarget = target;
  if (target === 'hitbox') {
    state.showHitboxes = true;
    const selected = getSelected();
    if (selected && selected.hitboxes?.length && state.selectedHitboxIndex == null) {
      setHitboxSelection([0], 0);
    } else if (selected && state.selectedHitboxIndex != null) {
      setHitboxSelection([state.selectedHitboxIndex], state.selectedHitboxIndex);
    }
    if (selected) state.selectedSpecial = 'hitbox';
  } else {
    state.selectedHitboxIndex = null;
    state.selectedHitboxIndices = [];
    if (state.selectedSpecial === 'hitbox') state.selectedSpecial = null;
  }
  const selected = getSelected();
  const nowObjectCrop = isObjectCropModeActive();
  const nowPlayerCrop = isPlayerCropModeActive();
  if (wasObjectCrop && !nowObjectCrop) {
    endObjectCropSession();
  } else if (!wasObjectCrop && nowObjectCrop && selected) {
    beginObjectCropSession(selected);
  }
  if (wasPlayerCrop && !nowPlayerCrop) {
    endPlayerCropSession();
  } else if (!wasPlayerCrop && nowPlayerCrop) {
    beginPlayerCropSession();
  }
  renderWorld();
  syncProperties();
  restoreViewportScroll(keepLeft, keepTop);
};

els.targetObject?.addEventListener('click', () => setSelectionTarget('object'));
els.targetHitbox?.addEventListener('click', () => setSelectionTarget('hitbox'));
els.groupObjects?.addEventListener('click', () => {
  const objects = state.selectedIds
    .map((id) => state.objects.find((obj) => obj.id === id))
    .filter(Boolean);
  if (objects.length < 2) return;
  pushHistory();
  const groupId = createObjectGroupId();
  objects.forEach((obj) => {
    obj.groupId = groupId;
  });
  setSelection(objects.map((obj) => obj.id), state.selectedId);
});
els.ungroupObjects?.addEventListener('click', () => {
  const objects = state.selectedIds
    .map((id) => state.objects.find((obj) => obj.id === id))
    .filter(Boolean);
  if (!objects.length) return;
  const hasGroup = objects.some((obj) => !!obj.groupId);
  if (!hasGroup) return;
  pushHistory();
  objects.forEach((obj) => {
    delete obj.groupId;
  });
  setSelection(objects.map((obj) => obj.id), state.selectedId);
});
els.layerPick?.addEventListener('click', () => {
  if (!lastPointer) return;
  if (state.selectionTarget === 'hitbox') {
    const hitTargets = getHitboxesAtPoint(lastPointer.x, lastPointer.y);
    if (!hitTargets.length) return;
    const items = hitTargets.map((hit) => ({
      type: 'hitbox',
      obj: hit.obj,
      index: hit.index,
      label: getSpriteDisplayLabel(hit.obj.sprite),
      meta: `히트박스 ${hit.index + 1}`
    }));
    showLayerPicker(items.reverse(), lastPointer.clientX, lastPointer.clientY);
    return;
  }
  const selection = getObjectsAtPoint(lastPointer.x, lastPointer.y);
  if (!selection.length) return;
  const items = selection.map((hit) => ({
    type: 'object',
    obj: hit,
    label: getSpriteDisplayLabel(hit.sprite),
    meta: hit.id.replace('obj_', '')
  }));
  showLayerPicker(items.reverse(), lastPointer.clientX, lastPointer.clientY, { multiToggle: true });
});
els.orderSendBack?.addEventListener('click', () => applySelectedObjectsOrder('back'));
els.orderBackward?.addEventListener('click', () => applySelectedObjectsOrder('backward'));
els.orderForward?.addEventListener('click', () => applySelectedObjectsOrder('forward'));
els.orderBringFront?.addEventListener('click', () => applySelectedObjectsOrder('front'));

els.stageToolbarToggle?.addEventListener('click', () => {
  els.stageToolbar.classList.toggle('collapsed');
  updateToolbarToggleLabel();
});

els.applyMap.addEventListener('click', () => {
  pushHistory();
  state.map.width = Number(els.mapWidth.value) || state.map.width;
  state.map.height = Number(els.mapHeight.value) || state.map.height;
  applyMapSize();
});

els.expandWidth.addEventListener('click', () => {
  pushHistory();
  state.map.width += 800;
  applyMapSize({ autoScroll: false, preserveViewport: true });
});

els.expandHeight.addEventListener('click', () => {
  pushHistory();
  state.map.height += 3000;
  applyMapSize({ autoScroll: false, preserveViewport: true });
});

els.expandTop?.addEventListener('click', () => {
  const delta = 3000;
  const prevLeft = els.viewport.scrollLeft;
  const prevTop = els.viewport.scrollTop;
  pushHistory();
  state.map.height += delta;
  state.objects.forEach((obj) => {
    obj.y += delta;
  });
  if (state.startPoint) {
    state.startPoint = {
      ...state.startPoint,
      y: state.startPoint.y + delta
    };
  }
  applyMapSize({ autoScroll: false, preserveViewport: false });
  renderWorld();
  syncProperties();
  requestAnimationFrame(() => {
    const maxScrollLeft = Math.max(0, state.map.width - els.viewport.clientWidth);
    const maxScrollTop = Math.max(0, state.map.height - els.viewport.clientHeight);
    els.viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, prevLeft));
    els.viewport.scrollTop = Math.max(0, Math.min(maxScrollTop, prevTop + delta));
    updateMiniMap();
  });
});

els.gridVisible.addEventListener('change', (e) => {
  state.grid.visible = e.target.checked;
  updateGrid();
});

els.gridSnap.addEventListener('change', (e) => {
  state.grid.snap = e.target.checked;
});

els.gridSize.addEventListener('change', (e) => {
  state.grid.size = Number(e.target.value);
  updateGrid();
});

document.addEventListener('pointerdown', (e) => {
  if (!els.layerPicker || els.layerPicker.classList.contains('hidden')) return;
  if (e.target.closest('#layer-picker')) return;
  hideLayerPicker();
});

els.optAutoBase?.addEventListener('change', (e) => {
  state.editorOptions.autoBasePlatform = e.target.checked;
  if (state.editorOptions.autoBasePlatform && !state.objects.length) {
    ensureBasePlatform();
    renderWorld();
  }
});

els.optAutoScroll?.addEventListener('change', (e) => {
  state.editorOptions.autoScrollStart = e.target.checked;
  if (state.editorOptions.autoScrollStart) {
    scrollToStart();
  }
});

els.optAutoSelect?.addEventListener('change', (e) => {
  state.editorOptions.autoSelectAfterPlace = e.target.checked;
});

els.bgColor?.addEventListener('input', (e) => {
  state.background.color = e.target.value;
  applyBackground();
});

els.bgTexture?.addEventListener('change', (e) => {
  const nextTexture = e.target.value ? normalizeTextureType(e.target.value) : '';
  state.background.texture = nextTexture;
  e.target.value = nextTexture;
  applyBackground();
});

els.bgImage?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.background.image = reader.result;
    applyBackground();
  };
  reader.readAsDataURL(file);
});

els.bgUseGeumgang?.addEventListener('click', () => {
  state.background.image = DEFAULT_GEUMGANG_BACKGROUND;
  applyBackground();
});

const setBackgroundOpacity = (raw) => {
  const value = clampNumber(raw, 0, 1, state.background.imageOpacity ?? 1);
  state.background.imageOpacity = value;
  if (els.bgImageOpacity) els.bgImageOpacity.value = String(value);
  if (els.bgImageOpacityInput) els.bgImageOpacityInput.value = String(value);
  applyBackground();
};

els.bgImageOpacity?.addEventListener('input', (e) => {
  setBackgroundOpacity(Number(e.target.value));
});

els.bgImageOpacityInput?.addEventListener('input', (e) => {
  setBackgroundOpacity(Number(e.target.value));
});

els.bgClear?.addEventListener('click', () => {
  state.background.image = '';
  if (els.bgImage) els.bgImage.value = '';
  applyBackground();
});

els.gravity?.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  state.physics.fallSpeed = Math.max(0, Number.isFinite(value) ? value : state.physics.fallSpeed);
  updateJumpStats();
});

els.maxFallSpeed?.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  state.physics.jumpHeight = Math.max(0, Number.isFinite(value) ? value : state.physics.jumpHeight);
  updateJumpStats();
});

els.jumpSpeed?.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  state.physics.jumpSpeed = Math.max(0, Number.isFinite(value) ? value : state.physics.jumpSpeed);
  updateJumpStats();
});

els.moveSpeed?.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  state.physics.moveSpeed = Math.max(0, Number.isFinite(value) ? value : state.physics.moveSpeed);
});

els.walkableSlopeMaxAngle?.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  const fallback = Number.isFinite(state.physics.walkableSlopeMaxAngle)
    ? state.physics.walkableSlopeMaxAngle
    : DEFAULT_WALKABLE_SLOPE_MAX_ANGLE;
  state.physics.walkableSlopeMaxAngle = Math.max(0, Math.min(90, Number.isFinite(value) ? value : fallback));
  if (state.physics.slopeFallStartAngle < state.physics.walkableSlopeMaxAngle) {
    state.physics.slopeFallStartAngle = state.physics.walkableSlopeMaxAngle;
  }
  syncPhysicsInputs();
});

els.slopeFallStartAngle?.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  const fallback = Number.isFinite(state.physics.slopeFallStartAngle)
    ? state.physics.slopeFallStartAngle
    : DEFAULT_SLOPE_FALL_START_ANGLE;
  state.physics.slopeFallStartAngle = Math.max(0, Math.min(90, Number.isFinite(value) ? value : fallback));
  if (state.physics.slopeFallStartAngle < state.physics.walkableSlopeMaxAngle) {
    state.physics.slopeFallStartAngle = state.physics.walkableSlopeMaxAngle;
  }
  syncPhysicsInputs();
});

els.slopeSlideEnabled?.addEventListener('change', (e) => {
  state.physics.slopeSlideEnabled = false;
  e.target.checked = false;
  renderSlopeProfileInputs();
});

els.flatInertiaEnabled?.addEventListener('change', (e) => {
  state.physics.flatInertiaEnabled = false;
  e.target.checked = false;
  syncPhysicsInputs();
});

els.flatInertiaPercent?.addEventListener('input', (e) => {
  state.physics.flatInertiaPercent = DEFAULT_FLAT_INERTIA_PERCENT;
  e.target.value = String(Math.round(DEFAULT_FLAT_INERTIA_PERCENT));
});

els.slopeProfileReset?.addEventListener('click', () => {
  state.physics.slopeSpeedProfile = cloneDefaultSlopeSpeedProfile();
  renderSlopeProfileInputs();
});

els.slopeProfileAdd?.addEventListener('click', () => {
  addSlopeProfileRow();
});

els.slopeProfileList?.addEventListener('click', (e) => {
  const button = e.target instanceof HTMLElement
    ? e.target.closest('button[data-slope-action]')
    : null;
  if (!(button instanceof HTMLButtonElement)) return;
  const action = button.dataset.slopeAction;
  const index = Number(button.dataset.slopeIndex);
  if (action === 'delete') {
    removeSlopeProfileRow(index);
  }
});

els.slopeProfileList?.addEventListener('input', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  const index = Number(target.dataset.slopeIndex);
  const field = target.dataset.slopeField;
  if (!Number.isInteger(index) || index < 0) return;
  if (!field) return;
  const profile = normalizeSlopeSpeedProfile(state.physics?.slopeSpeedProfile);
  if (index >= profile.length) return;
  const next = profile.map((entry) => ({ ...entry }));
  const rawValue = Number(target.value);
  if (!Number.isFinite(rawValue)) return;
  if (field === 'startAngle') {
    next[index].minAngle = Math.round(rawValue);
    if (index > 0) {
      next[index - 1].maxAngle = next[index].minAngle - 1;
    }
  } else if (field === 'maxAngle') {
    if (index >= next.length - 1) return;
    next[index].maxAngle = Math.round(rawValue);
    if (index + 1 < next.length) {
      next[index + 1].minAngle = next[index].maxAngle + 1;
    }
  } else if (field === 'up' || field === 'down') {
    next[index][field] = rawValue / 100;
  } else {
    return;
  }
  state.physics.slopeSpeedProfile = normalizeSlopeSpeedProfile(next);
  renderSlopeProfileInputs();
});

els.flatZoneEditToggle?.addEventListener('click', () => {
  if (state.mode !== 'select') {
    setMode('select');
  }
  state.flatZoneEdit = !state.flatZoneEdit;
  flatZoneDrag = null;
  updateFlatZoneControls();
  renderWorld();
});

els.flatZoneClearAll?.addEventListener('click', () => {
  if (!Array.isArray(state.physics?.flatZones) || !state.physics.flatZones.length) return;
  pushHistory();
  state.physics.flatZones = [];
  flatZoneDrag = null;
  updateFlatZoneControls();
  renderWorld();
  scheduleDraftSave();
});

els.cameraYBias?.addEventListener('input', (e) => {
  state.camera.yBias = clampCameraBias(e.target.value);
  syncCameraInputs();
});

els.cameraYBiasInput?.addEventListener('input', (e) => {
  state.camera.yBias = clampCameraBias(e.target.value);
  syncCameraInputs();
});

els.viewport.addEventListener('scroll', updateMiniMap);

const moveViewportToMini = (clientX, clientY) => {
  const rect = els.miniMap.getBoundingClientRect();
  const mapW = state.map.width;
  const mapH = state.map.height;
  const scaleX = rect.width / mapW;
  const scaleY = rect.height / mapH;
  const x = (clientX - rect.left) / scaleX;
  const y = (clientY - rect.top) / scaleY;
  els.viewport.scrollLeft = Math.max(0, Math.min(mapW - els.viewport.clientWidth, x - els.viewport.clientWidth / 2));
  els.viewport.scrollTop = Math.max(0, Math.min(mapH - els.viewport.clientHeight, y - els.viewport.clientHeight / 2));
  updateMiniMap();
};

els.miniMap?.addEventListener('pointerdown', (e) => {
  if (els.miniMap?.classList.contains('collapsed')) return;
  e.preventDefault();
  miniDrag = true;
  safeSetPointerCapture(els.miniMap, e.pointerId);
  moveViewportToMini(e.clientX, e.clientY);
});

els.miniMap?.addEventListener('pointermove', (e) => {
  if (!miniDrag) return;
  moveViewportToMini(e.clientX, e.clientY);
});

els.miniMap?.addEventListener('pointerup', () => {
  miniDrag = null;
});

els.miniMapToggle?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

els.miniMapToggle?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  els.miniMap?.classList.toggle('collapsed');
  updateMiniMapToggleLabel();
  updateMiniMap();
});

const setScrollFromThumb = (axis, clientPos) => {
  const viewW = els.viewport.clientWidth;
  const viewH = els.viewport.clientHeight;
  const mapW = state.map.width;
  const mapH = state.map.height;
  if (axis === 'x') {
    const trackRect = els.scrollbarX.getBoundingClientRect();
    const trackW = els.scrollbarX.clientWidth;
    const thumbW = Math.max(24, Math.round(trackW * (viewW / mapW)));
    const maxThumbX = Math.max(0, trackW - thumbW);
    const maxScrollX = Math.max(0, mapW - viewW);
    const click = clientPos - trackRect.left;
    const left = Math.max(0, Math.min(maxThumbX, click - thumbW / 2));
    els.viewport.scrollLeft = maxScrollX ? (left / maxThumbX) * maxScrollX : 0;
  } else {
    const trackRect = els.scrollbarY.getBoundingClientRect();
    const trackH = els.scrollbarY.clientHeight;
    const thumbH = Math.max(24, Math.round(trackH * (viewH / mapH)));
    const maxThumbY = Math.max(0, trackH - thumbH);
    const maxScrollY = Math.max(0, mapH - viewH);
    const click = clientPos - trackRect.top;
    const top = Math.max(0, Math.min(maxThumbY, click - thumbH / 2));
    els.viewport.scrollTop = maxScrollY ? (top / maxThumbY) * maxScrollY : 0;
  }
  updateMiniMap();
};

const startScrollbarDrag = (axis, e) => {
  e.preventDefault();
  scrollbarDrag = {
    axis,
    startPos: axis === 'x' ? e.clientX : e.clientY,
    startScroll: axis === 'x' ? els.viewport.scrollLeft : els.viewport.scrollTop
  };
  safeSetPointerCapture(e.target, e.pointerId);
};

els.scrollbarXThumb?.addEventListener('pointerdown', (e) => startScrollbarDrag('x', e));
els.scrollbarYThumb?.addEventListener('pointerdown', (e) => startScrollbarDrag('y', e));

els.scrollbarX?.addEventListener('pointerdown', (e) => {
  if (e.target === els.scrollbarXThumb) return;
  setScrollFromThumb('x', e.clientX);
});

els.scrollbarY?.addEventListener('pointerdown', (e) => {
  if (e.target === els.scrollbarYThumb) return;
  setScrollFromThumb('y', e.clientY);
});

els.world.addEventListener('pointerdown', (e) => {
  if (state.mode === 'start') {
    const pos = screenToWorld(e.clientX, e.clientY);
    const x = snapValue(pos.x);
    const y = snapValue(pos.y);
    pushHistory();
    state.startPoint = { x, y };
    ensureStartPoint();
    renderWorld();
    return;
  }
  if (state.mode !== 'place' || !selectedSprite) return;
  const pos = screenToWorld(e.clientX, e.clientY);
  const x = snapValue(pos.x);
  const y = snapValue(pos.y);
  pushHistory();
  if (isGroupPresetSelectionKey(selectedSprite)) {
    const presetId = getGroupPresetIdFromSelectionKey(selectedSprite);
    const placed = placeObjectGroupPreset(presetId, x, y);
    if (!placed) {
      state.history.pop();
      alert('묶음 프리셋 배치에 실패했습니다. 프리셋을 다시 저장해 주세요.');
      return;
    }
  } else {
    createObject(selectedSprite, x, y);
  }
  renderWorld();
  syncProperties();
  if (state.editorOptions.autoSelectAfterPlace) {
    setMode('select');
  }
});

els.viewport.addEventListener('pointermove', (e) => {
  const pos = screenToWorld(e.clientX, e.clientY);
  lastPointer = { x: pos.x, y: pos.y, clientX: e.clientX, clientY: e.clientY };
  if (flatZoneDrag) {
    flatZoneDrag.currentX = snapValue(pos.x);
    flatZoneDrag.currentY = snapValue(pos.y);
    requestRenderWorld();
    return;
  }
  if (selectionDrag) {
    const currentWorld = screenToWorld(e.clientX, e.clientY);
    const rect = els.viewport.getBoundingClientRect();
    const currentClient = {
      x: currentWorld.x - els.viewport.scrollLeft,
      y: currentWorld.y - els.viewport.scrollTop
    };
    const left = Math.min(selectionDrag.startClient.x, currentClient.x);
    const top = Math.min(selectionDrag.startClient.y, currentClient.y);
    const width = Math.abs(selectionDrag.startClient.x - currentClient.x);
    const height = Math.abs(selectionDrag.startClient.y - currentClient.y);
    if (els.selectionBox) {
      els.selectionBox.style.left = `${left}px`;
      els.selectionBox.style.top = `${top}px`;
      els.selectionBox.style.width = `${width}px`;
      els.selectionBox.style.height = `${height}px`;
    }
    return;
  }
  if (scrollbarDrag) {
    const viewW = els.viewport.clientWidth;
    const viewH = els.viewport.clientHeight;
    const mapW = state.map.width;
    const mapH = state.map.height;
    if (scrollbarDrag.axis === 'x') {
      const trackW = els.scrollbarX.clientWidth;
      const thumbW = Math.max(24, Math.round(trackW * (viewW / mapW)));
      const maxThumbX = Math.max(0, trackW - thumbW);
      const maxScrollX = Math.max(0, mapW - viewW);
      const dx = e.clientX - scrollbarDrag.startPos;
      const scrollDelta = maxThumbX ? (dx / maxThumbX) * maxScrollX : 0;
      els.viewport.scrollLeft = Math.max(0, Math.min(maxScrollX, scrollbarDrag.startScroll + scrollDelta));
    } else {
      const trackH = els.scrollbarY.clientHeight;
      const thumbH = Math.max(24, Math.round(trackH * (viewH / mapH)));
      const maxThumbY = Math.max(0, trackH - thumbH);
      const maxScrollY = Math.max(0, mapH - viewH);
      const dy = e.clientY - scrollbarDrag.startPos;
      const scrollDelta = maxThumbY ? (dy / maxThumbY) * maxScrollY : 0;
      els.viewport.scrollTop = Math.max(0, Math.min(maxScrollY, scrollbarDrag.startScroll + scrollDelta));
    }
    updateMiniMap();
    return;
  }
  if (panState) {
    const dx = e.clientX - panState.startX;
    const dy = e.clientY - panState.startY;
    els.viewport.scrollLeft = Math.max(0, Math.min(state.map.width - els.viewport.clientWidth, panState.scrollLeft - dx));
    els.viewport.scrollTop = Math.max(0, Math.min(state.map.height - els.viewport.clientHeight, panState.scrollTop - dy));
    updateMiniMap();
    return;
  }
  if (objectTransform) {
    const selected = getSelected();
    if (objectTransform.type !== 'player-scale' && (!selected || selected.id !== objectTransform.id)) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    if (objectTransform.type === 'player-scale') {
      const localX = pos.x - objectTransform.left;
      const localY = pos.y - objectTransform.top;
      let nextScale = Math.max(localX / objectTransform.baseW, localY / objectTransform.baseH);
      if (!Number.isFinite(nextScale)) nextScale = objectTransform.startScale;
      nextScale = Math.max(0.2, Math.min(3, nextScale));
      state.playerScale = Number(nextScale.toFixed(3));
      syncPlayerHitboxInputs();
      applyPlayerHitboxToViews();
    } else if (objectTransform.type === 'scale') {
      const centerWorldX = objectTransform.centerWorldX;
      const centerWorldY = objectTransform.centerWorldY;
      const baseW = Math.max(1, Number(objectTransform.baseW) || 1);
      const baseH = Math.max(1, Number(objectTransform.baseH) || 1);
      const centerDeltaWorldX = pos.x - centerWorldX;
      const centerDeltaWorldY = pos.y - centerWorldY;
      const centerLocalScaled = worldToLocal(
        centerDeltaWorldX,
        centerDeltaWorldY,
        {
          x: 0,
          y: 0,
          scale: 1,
          rotation: selected.rotation,
          flipH: selected.flipH,
          flipV: selected.flipV
        }
      );
      let scale = Math.max(
        Math.abs(centerLocalScaled.x) / (baseW / 2),
        Math.abs(centerLocalScaled.y) / (baseH / 2)
      );
      if (!Number.isFinite(scale)) scale = selected.scale;
      scale = Math.max(OBJECT_SCALE_MIN, Math.min(OBJECT_SCALE_MAX, scale));
      selected.scale = Number(scale.toFixed(3));
      normalizeLocalHitboxGeometry(selected);
      setObjectPositionFromCenter(
        selected,
        objectTransform.centerLocalX,
        objectTransform.centerLocalY,
        centerWorldX,
        centerWorldY
      );
    } else if (objectTransform.type === 'rotate') {
      const angle = Math.atan2(pos.y - selected.y, pos.x - selected.x);
      const startAngle = Math.atan2(objectTransform.startY - selected.y, objectTransform.startX - selected.x);
      let delta = angle - startAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      let deg = objectTransform.startRotation + (delta * 180) / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      selected.rotation = normalizeObjectRotation(deg, selected.rotation);
    }
    requestRenderWorld();
    requestSyncProperties();
    return;
  }
  if (cropDrag) {
    if (cropDrag.type === 'player') {
      const pos = screenToWorld(e.clientX, e.clientY);
      const fullLeft = state.startPoint.x - playerSpriteMeta.w * cropDrag.scale / 2;
      const fullTop = state.startPoint.y - playerSpriteMeta.h * cropDrag.scale;
      const localX = (pos.x - fullLeft) / cropDrag.scale;
      const localY = (pos.y - fullTop) / cropDrag.scale;
      const cropAnchor = cropDrag.anchor || { x: 0, y: 0 };
      const dx = (localX + cropAnchor.x) - cropDrag.startLocal.x;
      const dy = (localY + cropAnchor.y) - cropDrag.startLocal.y;
      let { x, y, w, h } = cropDrag.cropStart;
      if (!cropDrag.handle) {
        x += dx;
        y += dy;
      } else {
        if (cropDrag.handle.includes('n')) {
          y += dy;
          h -= dy;
        }
        if (cropDrag.handle.includes('w')) {
          x += dx;
          w -= dx;
        }
        if (cropDrag.handle.includes('s')) {
          h += dy;
        }
        if (cropDrag.handle.includes('e')) {
          w += dx;
        }
      }
      state.playerCrop = clampPlayerCrop({ x, y, w, h });
      requestRenderWorld();
      applyPlayerHitboxToViews();
      requestSyncProperties();
      return;
    }

    const selected = getSelected();
    if (!selected || selected.id !== cropDrag.id) return;
    const pos = screenToWorld(e.clientX, e.clientY);
    const local = worldPointToLocal(pos.x, pos.y, selected);
    const cropAnchor = cropDrag.anchor || { x: 0, y: 0 };
    const dx = (local.x + cropAnchor.x) - cropDrag.startLocal.x;
    const dy = (local.y + cropAnchor.y) - cropDrag.startLocal.y;
    let { x, y, w, h } = cropDrag.cropStart;
    if (!cropDrag.handle) {
      x += dx;
      y += dy;
    } else {
      if (cropDrag.handle.includes('n')) {
        y += dy;
        h -= dy;
      }
      if (cropDrag.handle.includes('w')) {
        x += dx;
        w -= dx;
      }
      if (cropDrag.handle.includes('s')) {
        h += dy;
      }
      if (cropDrag.handle.includes('e')) {
        w += dx;
      }
    }
    const nextCrop = clampCrop(selected, { x, y, w, h });
    selected.crop = nextCrop;
    // Crop editing keeps source pixels stable by finalizing anchor on pointerup.
    normalizeObjectHitboxesWithinBounds(selected, { normalizeCropSpace: false, preserveSetPosition: true });
    requestRenderWorld();
    requestSyncProperties();
    return;
  }
  if (playerHitboxDrag) {
    const pos = screenToWorld(e.clientX, e.clientY);
    const dx = pos.x - playerHitboxDrag.startX;
    const dy = pos.y - playerHitboxDrag.startY;
    if (!playerHitboxDrag.handle) {
      const nx = Math.round(playerHitboxDrag.startOffsetX + dx);
      const ny = Math.round(playerHitboxDrag.startOffsetY + dy);
      state.playerHitboxOffset = { x: nx, y: ny };
      requestRenderWorld();
      return;
    }
    const minSize = 20;
    let left = playerHitboxDrag.startLeft;
    let top = playerHitboxDrag.startTop;
    let w = playerHitboxDrag.startW;
    let h = playerHitboxDrag.startH;
    const handle = playerHitboxDrag.handle;
    if (handle.includes('w')) {
      left += dx;
      w -= dx;
    }
    if (handle.includes('e')) {
      w += dx;
    }
    if (handle.includes('n')) {
      top += dy;
      h -= dy;
    }
    if (handle.includes('s')) {
      h += dy;
    }
    if (w < minSize) {
      if (handle.includes('w')) {
        left -= minSize - w;
      }
      w = minSize;
    }
    if (h < minSize) {
      if (handle.includes('n')) {
        top -= minSize - h;
      }
      h = minSize;
    }
    const offsetX = Math.round(left - (state.startPoint.x - w / 2));
    const offsetY = Math.round(top - (state.startPoint.y - h));
    state.playerHitboxOffset = { x: offsetX, y: offsetY };
    state.playerHitbox.width = Math.round(w);
    state.playerHitbox.height = Math.round(h);
    const insetMax = Math.max(0, w / 2 - 1);
    state.playerHitbox.footInset = Math.min(state.playerHitbox.footInset, insetMax);
    syncPlayerHitboxInputs();
    requestRenderWorld();
    applyPlayerHitboxToViews();
    return;
  }
  if (hitboxDrag) {
    const selected = getSelected();
    if (!selected) return;
    const mode = hitboxDrag.mode || 'move';
    const hb = selected.hitboxes[hitboxDrag.index];
    if (mode !== 'crop') {
      if (!hb || hb.locked) return;
    }
    const pos = screenToWorld(e.clientX, e.clientY);
    const dxWorld = pos.x - hitboxDrag.startX;
    const dyWorld = pos.y - hitboxDrag.startY;
    const local = worldToLocal(dxWorld, dyWorld, selected);
    const handle = hitboxDrag.handle;
    if (mode === 'crop') {
      if (!handle || !hitboxDrag.groupBounds) return;
      const cropRect = resizeHitboxBoundsByHandle(hitboxDrag.groupBounds, handle, local.x, local.y, 1);
      const sourceHitboxes = hitboxDrag.sourceHitboxes || cloneHitboxes(selected.hitboxes);
      const targetIndices = new Set(hitboxDrag.groupIndices || []);
      const replacement = new Map();
      (hitboxDrag.groupOrigins || []).forEach((orig) => {
        const source = sourceHitboxes[orig.index];
        if (!source) return;
        const clipped = clipHitboxToRect(source, cropRect);
        if (!clipped) return;
        const normalized = clampHitboxToObjectBounds(selected, clipped, { fallbackToNearest: false });
        if (normalized) replacement.set(orig.index, normalized);
      });
      const rebuilt = [];
      const indexMap = new Map();
      sourceHitboxes.forEach((source, oldIdx) => {
        if (!targetIndices.has(oldIdx)) {
          indexMap.set(oldIdx, rebuilt.length);
          rebuilt.push({ ...source });
          return;
        }
        const next = replacement.get(oldIdx);
        if (next) {
          indexMap.set(oldIdx, rebuilt.length);
          rebuilt.push(next);
        }
      });
      selected.hitboxes = rebuilt;
      const previousSelection = hitboxDrag.selectedIndicesAtStart || [];
      const nextSelection = previousSelection
        .map((oldIdx) => indexMap.get(oldIdx))
        .filter((idx) => Number.isInteger(idx));
      const nextPrimary =
        indexMap.get(hitboxDrag.index) ??
        (nextSelection.length ? nextSelection[nextSelection.length - 1] : null);
      setHitboxSelection(nextSelection, nextPrimary);
      requestRenderWorld();
      requestSyncProperties();
      return;
    }
    if (handle === 'rotate') {
      const angle = Math.atan2(pos.y - hitboxDrag.centerWorldY, pos.x - hitboxDrag.centerWorldX);
      let delta = angle - hitboxDrag.startAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      const deltaDeg = (delta * 180) / Math.PI;
      let nextRotation = hitboxDrag.origRotation + deltaDeg;
      if (e.shiftKey) nextRotation = Math.round(nextRotation / 15) * 15;
      hb.rotation = normalizeHitboxRotation(nextRotation, hb.rotation);
      requestRenderWorld();
      requestSyncProperties();
      return;
    }
    if (!handle) {
      const targets = hitboxDrag.groupOrigins || [
        { index: hitboxDrag.index, x: hitboxDrag.origX, y: hitboxDrag.origY }
      ];
      targets.forEach((orig) => {
        const target = selected.hitboxes[orig.index];
        if (!target) return;
        target.x = Math.round(orig.x + local.x);
        target.y = Math.round(orig.y + local.y);
        const normalized = clampHitboxToObjectBounds(selected, target);
        target.x = normalized.x;
        target.y = normalized.y;
        target.w = normalized.w;
        target.h = normalized.h;
      });
    } else {
      if (hitboxDrag.groupBounds && hitboxDrag.groupOrigins?.length > 1) {
        const startBounds = hitboxDrag.groupBounds;
        const nextBounds = resizeHitboxBoundsByHandle(startBounds, handle, local.x, local.y, 10);
        const scaleX = startBounds.w === 0 ? 1 : nextBounds.w / startBounds.w;
        const scaleY = startBounds.h === 0 ? 1 : nextBounds.h / startBounds.h;
        hitboxDrag.groupOrigins.forEach((orig) => {
          const target = selected.hitboxes[orig.index];
          if (!target) return;
          const relX = orig.x - startBounds.x;
          const relY = orig.y - startBounds.y;
          target.x = Math.round(nextBounds.x + relX * scaleX);
          target.y = Math.round(nextBounds.y + relY * scaleY);
          target.w = Math.max(1, Math.round(orig.w * scaleX));
          target.h = Math.max(1, Math.round(orig.h * scaleY));
          const normalized = clampHitboxToObjectBounds(selected, target);
          target.x = normalized.x;
          target.y = normalized.y;
          target.w = normalized.w;
          target.h = normalized.h;
        });
      } else {
        let resizeDx = local.x;
        let resizeDy = local.y;
        const hbRotation = normalizeHitboxRotation(hb.rotation, 0);
        if (hbRotation !== 0) {
          const rad = (hbRotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          resizeDx = local.x * cos + local.y * sin;
          resizeDy = -local.x * sin + local.y * cos;
        }
        const next = resizeHitboxBoundsByHandle(
          { x: hitboxDrag.origX, y: hitboxDrag.origY, w: hitboxDrag.origW, h: hitboxDrag.origH },
          handle,
          resizeDx,
          resizeDy,
          10
        );
        hb.x = Math.round(next.x);
        hb.y = Math.round(next.y);
        hb.w = Math.round(next.w);
        hb.h = Math.round(next.h);
        const normalized = clampHitboxToObjectBounds(selected, hb);
        hb.x = normalized.x;
        hb.y = normalized.y;
        hb.w = normalized.w;
        hb.h = normalized.h;
      }
    }
    requestRenderWorld();
    requestSyncProperties();
    return;
  }
  if (dragState) {
    const pos = screenToWorld(e.clientX, e.clientY);
    if (dragState.ids?.includes('__player__')) {
      const off = dragState.offsets?.find((o) => o.id === '__player__');
      if (!off) return;
      const x = snapValue(pos.x - off.offsetX);
      const y = snapValue(pos.y - off.offsetY);
      state.startPoint = { x, y };
      ensureStartPoint();
      requestRenderWorld();
      requestSyncProperties();
      return;
    }
    const offsets = dragState.offsets || [];
    offsets.forEach((off) => {
      const obj = state.objects.find((o) => o.id === off.id);
      if (!obj || obj.locked) return;
      obj.x = snapValue(pos.x - off.offsetX);
      obj.y = snapValue(pos.y - off.offsetY);
    });
    requestRenderWorld();
    requestSyncProperties();
  }
});

els.viewport.addEventListener('pointerup', (e) => {
  if (flatZoneDrag) {
    const rect = getFlatZoneRectFromDrag(flatZoneDrag);
    flatZoneDrag = null;
    if (rect) {
      pushHistory();
      state.physics.flatZones = normalizeFlatZones([...(state.physics.flatZones || []), rect], state.map);
      updateFlatZoneControls();
      flushRenderWorld();
      scheduleDraftSave();
    } else {
      flushRenderWorld();
    }
    return;
  }
  if (selectionDrag) {
    const start = selectionDrag.startWorld;
    const end = screenToWorld(e.clientX, e.clientY);
    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);
    const hits = state.objects
      .filter((obj) => {
        const b = getObjectBounds(obj);
        return b.x2 >= x1 && b.x1 <= x2 && b.y2 >= y1 && b.y1 <= y2;
      })
      .map((obj) => obj.id);
    if (hits.length || !selectionDrag.additive) {
      const merged = selectionDrag.additive
        ? Array.from(new Set([...state.selectedIds, ...hits]))
        : hits;
      setSelection(merged, merged[0] || null);
    }
    selectionDrag = null;
    if (els.selectionBox) els.selectionBox.classList.remove('visible');
    return;
  }
  const hadEditDrag = Boolean(dragState || hitboxDrag || cropDrag || playerHitboxDrag || objectTransform);
  if (cropDrag?.type === 'object') {
    finalizeObjectCropDragAnchor(cropDrag);
  }
  if (hadEditDrag) pushHistory();
  dragState = null;
  hitboxDrag = null;
  panState = null;
  objectTransform = null;
  scrollbarDrag = null;
  cropDrag = null;
  playerHitboxDrag = null;
  selectionDrag = null;
  if (hadEditDrag) {
    flushRenderWorld();
    flushSyncProperties();
  }
});

els.viewport.addEventListener('pointerdown', (e) => {
  if (e.button === 2 || e.button === 1) {
    e.preventDefault();
    panState = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: els.viewport.scrollLeft,
      scrollTop: els.viewport.scrollTop
    };
    safeSetPointerCapture(els.viewport, e.pointerId);
  }
  if (e.button !== 0) return;
  if (state.mode === 'select' && state.selectedSpecial === 'player' && getPlayerPointToolState().active) {
    const pos = screenToWorld(e.clientX, e.clientY);
    const rect = getPlayerHitboxWorldRect();
    if (
      pos.x >= rect.left &&
      pos.x <= rect.left + rect.width &&
      pos.y >= rect.top &&
      pos.y <= rect.top + rect.height
    ) {
      e.preventDefault();
      if (addPlayerPointHitboxPoint(pos.x, pos.y)) {
        renderWorld();
        syncProperties();
      }
      return;
    }
  }
  if (state.mode !== 'select') return;
  if (state.flatZoneEdit) {
    const startWorld = screenToWorld(e.clientX, e.clientY);
    flatZoneDrag = {
      pointerId: e.pointerId,
      startX: snapValue(startWorld.x),
      startY: snapValue(startWorld.y),
      currentX: snapValue(startWorld.x),
      currentY: snapValue(startWorld.y)
    };
    safeSetPointerCapture(els.viewport, e.pointerId);
    renderWorld();
    return;
  }
  const ignore = e.target.closest('.map-object,.object-controls,.hitbox,.player-marker,.crop-controls,.crop-source-image,.crop-source-fill,.player-crop-controls,.crop-rect,.crop-handle,.hitbox-handle,.scrollbar');
  if (ignore) return;
  const startWorld = screenToWorld(e.clientX, e.clientY);
  const rect = els.viewport.getBoundingClientRect();
  selectionDrag = {
    startWorld,
    startClient: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    additive: e.ctrlKey || e.metaKey
  };
  if (!els.selectionBox) {
    const box = document.createElement('div');
    box.id = 'selection-box';
    box.className = 'selection-box';
    els.viewport.parentElement.appendChild(box);
    els.selectionBox = box;
  }
  els.selectionBox.style.left = `${selectionDrag.startClient.x}px`;
  els.selectionBox.style.top = `${selectionDrag.startClient.y}px`;
  els.selectionBox.style.width = '0px';
  els.selectionBox.style.height = '0px';
  els.selectionBox.classList.add('visible');
});

els.viewport.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

els.propX.addEventListener('input', () => updateSelected({ x: Number(els.propX.value) }));
els.propY.addEventListener('input', () => updateSelected({ y: Number(els.propY.value) }));
els.propScale.addEventListener('input', () => updateSelected({ scale: Number(els.propScale.value) }));
const updateRotationControls = (value) => {
  const normalized = normalizeObjectRotation(value);
  if (els.propRotation) els.propRotation.value = normalized;
  if (els.propRotationRange) els.propRotationRange.value = normalized;
  updateSelected({ rotation: normalized });
};
els.propRotation?.addEventListener('input', () => updateRotationControls(els.propRotation.value));
els.propRotation?.addEventListener('change', () => updateRotationControls(els.propRotation.value));
els.propRotationRange?.addEventListener('input', () => updateRotationControls(els.propRotationRange.value));
els.propRotationRange?.addEventListener('change', () => updateRotationControls(els.propRotationRange.value));
els.propFlipH.addEventListener('change', () => updateSelected({ flipH: els.propFlipH.checked }));
els.propFlipV.addEventListener('change', () => updateSelected({ flipV: els.propFlipV.checked }));
els.propTextureType?.addEventListener('change', () => {
  const selected = getSelected();
  if (!selected || !isTextureSprite(selected.sprite)) return;
  const nextType = normalizeTextureType(els.propTextureType.value);
  if (!TEXTURE_OBJECT_TYPES.includes(nextType)) return;
  els.propTextureType.value = nextType;
  const nextSprite = makeTextureSprite(nextType);
  if (selected.sprite === nextSprite) {
    if (nextType === 'solid') {
      selected.textureColor = normalizeHexColor(selected.textureColor, normalizeHexColor(els.propTextureColor?.value));
      if (els.propTextureColor) els.propTextureColor.value = selected.textureColor;
      renderWorld();
      syncProperties();
    }
    return;
  }
  pushHistory();
  selected.sprite = nextSprite;
  selected.textureColor = nextType === 'solid'
    ? normalizeHexColor(selected.textureColor, normalizeHexColor(els.propTextureColor?.value))
    : null;
  if (nextType === 'solid' && els.propTextureColor) {
    els.propTextureColor.value = selected.textureColor;
  }
  renderPalette();
  renderWorld();
  syncProperties();
});

els.propTextureColor?.addEventListener('input', () => {
  const selected = getSelected();
  if (!selected || !isTextureSprite(selected.sprite)) return;
  if (getTextureTypeFromSprite(selected.sprite) !== 'solid') return;
  const nextColor = normalizeHexColor(els.propTextureColor.value);
  selected.textureColor = nextColor;
  els.propTextureColor.value = nextColor;
  renderWorld();
  syncProperties();
});

els.saveDefaultScale.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const current = getSpriteProfile(selected.sprite) || {};
  state.spriteProfiles[selected.sprite] = {
    ...current,
    scale: selected.scale,
    source: getSpriteSourcePath(selected.sprite)
  };
  persistSpriteProfiles();
  renderPalette();
  syncProperties();
});

els.addHitbox.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const bounds = getObjectHitboxBounds(selected);
  const next = clampHitboxToObjectBounds(selected, {
    x: bounds.x,
    y: bounds.y,
    w: Math.max(10, Math.round(bounds.w * 0.5)),
    h: Math.max(10, Math.round(bounds.h * 0.25)),
    rotation: 0,
    locked: false
  });
  selected.hitboxes.push(next);
  setHitboxSelection([selected.hitboxes.length - 1], selected.hitboxes.length - 1);
  state.boxGuidesVisible = true;
  state.selectionTarget = 'hitbox';
  state.selectedSpecial = 'hitbox';
  state.selectionAction.hitbox = 'move';
  state.showHitboxes = true;
  renderWorld();
  syncProperties();
});

els.clearAllHitboxes?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected || !Array.isArray(selected.hitboxes) || !selected.hitboxes.length) return;
  pushHistory();
  selected.hitboxes = [];
  setHitboxSelection([], null);
  if (state.selectionTarget === 'hitbox') {
    state.selectionTarget = 'object';
    state.selectedSpecial = null;
  }
  renderWorld();
  syncProperties();
  if (workbenchState.open) renderWorkbench();
});

els.saveHitboxPreset?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const current = getSpriteProfile(selected.sprite) || {};
  state.spriteProfiles[selected.sprite] = {
    ...current,
    scale: selected.scale,
    crop: selected.crop ? cloneCrop(getObjectCrop(selected)) : null,
    hitboxes: cloneHitboxes(selected.hitboxes),
    source: getSpriteSourcePath(selected.sprite)
  };
  persistSpriteProfiles();
  renderPalette();
  syncProperties();
});

els.applyHitboxPreset?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const profile = getSpriteProfile(selected.sprite);
  if (!profile) return;
  if (profile.hitboxes?.length) {
    selected.hitboxes = cloneHitboxes(profile.hitboxes);
    setHitboxSelection([0], 0);
    state.boxGuidesVisible = true;
    state.selectionTarget = 'hitbox';
    state.selectedSpecial = 'hitbox';
    state.selectionAction.hitbox = 'move';
    state.showHitboxes = true;
  }
  if (Number.isFinite(profile.scale) && profile.scale > 0) {
    selected.scale = profile.scale;
  }
  if (profile.crop) {
    selected.crop = cloneCrop(profile.crop);
  } else {
    selected.crop = null;
  }
  normalizeObjectHitboxesWithinBounds(selected, { preserveSetPosition: true });
  renderWorld();
  syncProperties();
  if (workbenchState.open) renderWorkbench();
});

els.autoAlphaHitbox?.addEventListener('click', async () => {
  const selected = getSelected();
  if (!selected || !canAutoAlphaExtract(selected.sprite)) return;
  const prevLabel = els.autoAlphaHitbox.textContent;
  els.autoAlphaHitbox.disabled = true;
  els.autoAlphaHitbox.textContent = '추출 중...';
  setAutoAlphaStatus('PNG 알파 채널을 읽는 중입니다...');
  try {
    const nextHitboxes = await buildAlphaHitboxesForObject(selected, 1);
    if (!nextHitboxes.length) {
      setAutoAlphaStatus('알파 영역에서 히트박스를 만들지 못했습니다.', true);
      return;
    }
    pushHistory();
    selected.hitboxes = nextHitboxes;
    setHitboxSelection([0], 0);
    state.boxGuidesVisible = true;
    state.selectionTarget = 'hitbox';
    state.selectedSpecial = 'hitbox';
    state.selectionAction.hitbox = 'move';
    state.showHitboxes = true;
    renderWorld();
    syncProperties();
    if (workbenchState.open) renderWorkbench();
    setAutoAlphaStatus(`완료: ${selected.sprite} 알파 기반 히트박스 ${nextHitboxes.length}개 생성`);
  } catch (error) {
    setAutoAlphaStatus(`실패: ${error?.message || '알파 추출 오류'}`, true);
  } finally {
    els.autoAlphaHitbox.disabled = false;
    els.autoAlphaHitbox.textContent = prevLabel;
  }
});

els.mergeHitboxes?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const result = groupTouchingHitboxes(selected.hitboxes);
  if (!result.changed) return;
  pushHistory();
  selected.hitboxes = result.list;
  const indices = getSelectedHitboxIndices(selected);
  setHitboxSelection(indices.length ? indices : [0], indices[indices.length - 1] ?? 0);
  renderWorld();
  syncProperties();
});

els.groupHitboxes?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const indices = getSelectedHitboxIndices(selected);
  if (indices.length < 2) return;
  pushHistory();
  const groupId = createHitboxGroupId();
  indices.forEach((idx) => {
    if (selected.hitboxes[idx]) selected.hitboxes[idx].groupId = groupId;
  });
  renderWorld();
  syncProperties();
});

els.ungroupHitboxes?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const indices = getSelectedHitboxIndices(selected);
  if (!indices.length) return;
  pushHistory();
  indices.forEach((idx) => {
    const hb = selected.hitboxes[idx];
    if (hb?.groupId) delete hb.groupId;
  });
  renderWorld();
  syncProperties();
});

els.lockHitboxGroup?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  const baseIndices = getSelectedHitboxIndices(selected);
  if (!baseIndices.length) return;
  const expanded = new Set();
  baseIndices.forEach((idx) => {
    const hb = selected.hitboxes[idx];
    if (!hb) return;
    if (hb.groupId) {
      getHitboxGroupIndices(selected, idx).forEach((gIdx) => expanded.add(gIdx));
    } else {
      expanded.add(idx);
    }
  });
  const indices = Array.from(expanded);
  if (!indices.length) return;
  pushHistory();
  const shouldLock = indices.some((idx) => !selected.hitboxes[idx]?.locked);
  indices.forEach((idx) => {
    if (selected.hitboxes[idx]) selected.hitboxes[idx].locked = shouldLock;
  });
  renderWorld();
  syncProperties();
});

els.hitboxToggle?.addEventListener('click', () => {
  state.showHitboxes = !state.showHitboxes;
  if (state.showHitboxes) {
    state.selectionTarget = 'hitbox';
    state.selectedSpecial = 'hitbox';
    const selected = getSelected();
    if (selected && selected.hitboxes?.length && state.selectedHitboxIndex == null) {
      setHitboxSelection([0], 0);
    }
  } else if (state.selectionTarget === 'hitbox') {
    state.selectionTarget = 'object';
    state.selectedSpecial = null;
    setHitboxSelection([], null);
  }
  renderWorld();
  syncProperties();
});

const updateCropFromInputs = () => {
  const selected = getSelected();
  if (!selected || !selected.crop) return;
  if (isObjectCropModeActive(selected.id)) {
    beginObjectCropSession(selected);
  }
  const crop = clampCrop(selected, {
    x: Number(els.cropX.value) || 0,
    y: Number(els.cropY.value) || 0,
    w: Number(els.cropW.value) || 1,
    h: Number(els.cropH.value) || 1
  });
  selected.crop = crop;
  normalizeObjectHitboxesWithinBounds(selected, { normalizeCropSpace: false, preserveSetPosition: true });
  renderWorld();
  syncProperties();
};

const updatePlayerCropFromInputs = () => {
  if (!state.playerCrop) return;
  if (isPlayerCropModeActive()) {
    beginPlayerCropSession();
  }
  const crop = clampPlayerCrop({
    x: Number(els.playerCropX.value) || 0,
    y: Number(els.playerCropY.value) || 0,
    w: Number(els.playerCropW.value) || 1,
    h: Number(els.playerCropH.value) || 1
  });
  state.playerCrop = crop;
  renderWorld();
  applyPlayerHitboxToViews();
  syncProperties();
};

els.cropEnabled?.addEventListener('change', (e) => {
  const selected = getSelected();
  if (!selected) return;
  const wasObjectCrop = isObjectCropModeActive(selected.id);
  if (e.target.checked) {
    selected.crop = getObjectCrop(selected);
    if (isObjectCropModeActive(selected.id)) {
      beginObjectCropSession(selected);
    }
  } else {
    if (wasObjectCrop) {
      endObjectCropSession();
    }
    selected.crop = null;
  }
  normalizeObjectHitboxesWithinBounds(selected, { normalizeCropSpace: false, preserveSetPosition: true });
  renderWorld();
  syncProperties();
});

els.cropX?.addEventListener('input', updateCropFromInputs);
els.cropY?.addEventListener('input', updateCropFromInputs);
els.cropW?.addEventListener('input', updateCropFromInputs);
els.cropH?.addEventListener('input', updateCropFromInputs);

els.cropReset?.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  selected.crop = getFullObjectCrop(selected);
  normalizeObjectHitboxesWithinBounds(selected, { normalizeCropSpace: false, preserveSetPosition: true });
  renderWorld();
  syncProperties();
});

els.playerCropEnabled?.addEventListener('change', (e) => {
  const wasPlayerCrop = isPlayerCropModeActive();
  if (e.target.checked) {
    state.playerCrop = getPlayerCrop();
    if (isPlayerCropModeActive()) {
      beginPlayerCropSession();
    }
  } else {
    if (wasPlayerCrop) {
      endPlayerCropSession();
    }
    state.playerCrop = null;
  }
  renderWorld();
  applyPlayerHitboxToViews();
  syncProperties();
});

els.playerCropX?.addEventListener('input', updatePlayerCropFromInputs);
els.playerCropY?.addEventListener('input', updatePlayerCropFromInputs);
els.playerCropW?.addEventListener('input', updatePlayerCropFromInputs);
els.playerCropH?.addEventListener('input', updatePlayerCropFromInputs);

els.playerCropReset?.addEventListener('click', () => {
  state.playerCrop = getFullPlayerCrop();
  renderWorld();
  applyPlayerHitboxToViews();
  syncProperties();
});

els.quickOpenObjectWorkbench?.addEventListener('click', () => {
  openWorkbench();
});

els.quickSaveHitboxPreset?.addEventListener('click', () => {
  els.saveHitboxPreset?.click();
});

els.quickApplyHitboxPreset?.addEventListener('click', () => {
  els.applyHitboxPreset?.click();
});

els.openObjectWorkbench?.addEventListener('click', () => {
  openWorkbench();
});

els.wbTargetObject?.addEventListener('click', () => {
  if (!getWorkbenchObject()) return;
  workbenchState.paint.enabled = false;
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchPaintPoints();
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  state.selectionTarget = 'object';
  state.selectedSpecial = null;
  setHitboxSelection([], null);
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbTargetHitbox?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  workbenchState.paint.enabled = false;
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchPaintPoints();
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  const idx = clampWorkbenchHitboxIndex(selected);
  state.selectionTarget = 'hitbox';
  state.selectedSpecial = 'hitbox';
  setHitboxSelection([idx], idx);
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbActionMove?.addEventListener('click', () => {
  workbenchState.paint.enabled = false;
  clearWorkbenchPaintPoints();
  if (state.selectionTarget !== 'hitbox') {
    workbenchState.paint.insertMode = false;
    workbenchState.paint.edgeSlipMode = false;
    clearWorkbenchInsertSelection();
    clearWorkbenchEdgeSelection();
  }
  const target = state.selectionTarget === 'hitbox' ? 'hitbox' : 'object';
  state.selectionAction[target] = 'move';
  renderWorkbench();
  syncProperties();
});

els.wbActionResize?.addEventListener('click', () => {
  workbenchState.paint.enabled = false;
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchPaintPoints();
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  const target = state.selectionTarget === 'hitbox' ? 'hitbox' : 'object';
  state.selectionAction[target] = 'resize';
  renderWorkbench();
  syncProperties();
});

els.wbActionCrop?.addEventListener('click', () => {
  if (!getWorkbenchObject()) return;
  workbenchState.paint.enabled = false;
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchPaintPoints();
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  const target = state.selectionTarget === 'hitbox' ? 'hitbox' : 'object';
  if (target === 'hitbox') {
    state.selectedSpecial = 'hitbox';
    const selected = getWorkbenchObject();
    if (selected?.hitboxes?.length) {
      const idx = clampWorkbenchHitboxIndex(selected);
      setHitboxSelection([idx], idx);
    }
    state.selectionAction.hitbox = 'crop';
  } else {
    state.selectionTarget = 'object';
    state.selectedSpecial = null;
    setHitboxSelection([], null);
    state.selectionAction.object = 'crop';
  }
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbHitboxCropAll?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  state.selectionTarget = 'hitbox';
  state.selectionAction.hitbox = 'crop';
  state.selectedSpecial = 'hitbox';
  const idx = clampWorkbenchHitboxIndex(selected);
  setHitboxSelection([idx], idx);
  workbenchState.hitboxCropScope = 'all';
  workbenchState.hitboxCropRegionStep = 'region';
  workbenchState.hitboxCropRegionRect = null;
  workbenchState.hitboxCropRegionObjectId = null;
  workbenchState.hitboxCropRegionCropRect = null;
  workbenchState.hitboxCropRegionCropObjectId = null;
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbHitboxCropSingle?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  state.selectionTarget = 'hitbox';
  state.selectionAction.hitbox = 'crop';
  state.selectedSpecial = 'hitbox';
  const idx = clampWorkbenchHitboxIndex(selected);
  setHitboxSelection([idx], idx);
  workbenchState.hitboxCropScope = 'single';
  workbenchState.hitboxCropRegionStep = 'region';
  workbenchState.hitboxCropRegionRect = null;
  workbenchState.hitboxCropRegionObjectId = null;
  workbenchState.hitboxCropRegionCropRect = null;
  workbenchState.hitboxCropRegionCropObjectId = null;
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbHitboxCropRegion?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  state.selectionTarget = 'hitbox';
  state.selectionAction.hitbox = 'crop';
  state.selectedSpecial = 'hitbox';
  const idx = clampWorkbenchHitboxIndex(selected);
  setHitboxSelection([idx], idx);
  workbenchState.hitboxCropScope = 'region';
  workbenchState.hitboxCropRegionStep = 'region';
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbHitboxRegionStepRegion?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  workbenchState.hitboxCropScope = 'region';
  workbenchState.hitboxCropRegionStep = 'region';
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbHitboxRegionStepCrop?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected?.hitboxes?.length) return;
  workbenchState.hitboxCropScope = 'region';
  const regionRect = ensureWorkbenchHitboxCropRegion(selected);
  if (regionRect) {
    // 2단계 진입 시 이전 자르기 상태를 남기지 않고 1단계 영역 전체에서 시작.
    workbenchState.hitboxCropRegionCropRect = { ...regionRect };
    workbenchState.hitboxCropRegionCropObjectId = selected.id;
  }
  workbenchState.hitboxCropRegionStep = 'crop';
  renderWorkbench();
  renderWorld();
  syncProperties();
});

els.wbGuideToolNone?.addEventListener('click', () => {
  if (!getWorkbenchObject()) return;
  workbenchState.guideTool = 'none';
  renderWorkbench();
});

els.wbGuideToolHorizontal?.addEventListener('click', () => {
  if (!getWorkbenchObject()) return;
  workbenchState.guideTool = 'horizontal';
  renderWorkbench();
});

els.wbGuideToolVertical?.addEventListener('click', () => {
  if (!getWorkbenchObject()) return;
  workbenchState.guideTool = 'vertical';
  renderWorkbench();
});

els.wbGuideSnap?.addEventListener('change', () => {
  workbenchState.guideSnap = !!els.wbGuideSnap?.checked;
  renderWorkbench();
});

els.wbGuideDeleteHorizontal?.addEventListener('click', () => {
  if (!deleteWorkbenchGuide('horizontal')) return;
  renderWorkbench();
});

els.wbGuideDeleteVertical?.addEventListener('click', () => {
  if (!deleteWorkbenchGuide('vertical')) return;
  renderWorkbench();
});

els.wbGuideClear?.addEventListener('click', () => {
  clearWorkbenchGuides();
  renderWorkbench();
});

els.wbPaintToggle?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected) return;
  workbenchState.paint.enabled = !workbenchState.paint.enabled;
  if (workbenchState.paint.enabled) {
    workbenchState.paint.insertMode = false;
    workbenchState.paint.edgeSlipMode = false;
    clearWorkbenchInsertSelection();
    clearWorkbenchEdgeSelection();
    workbenchState.paint.tool = clampWorkbenchPaintTool(workbenchState.paint.tool);
    state.selectionTarget = 'hitbox';
    state.selectedSpecial = 'hitbox';
  } else {
    workbenchState.pinnedView = null;
    clearWorkbenchPaintPoints();
    clearWorkbenchInsertSelection();
    clearWorkbenchEdgeSelection();
  }
  renderWorkbench();
  syncProperties();
});

els.wbPaintPointInsert?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected || workbenchState.sourceType === 'player') return;
  const activeIndex = clampWorkbenchHitboxIndex(selected);
  const activeHitbox = selected.hitboxes?.[activeIndex];
  if (!activeHitbox || !isPolygonHitbox(activeHitbox)) return;
  if (workbenchState.paint.enabled) {
    workbenchState.paint.enabled = false;
    clearWorkbenchPaintPoints();
  }
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchEdgeSelection();
  workbenchState.paint.insertMode = !workbenchState.paint.insertMode;
  if (workbenchState.paint.insertMode) {
    state.selectionTarget = 'hitbox';
    state.selectionAction.hitbox = 'move';
    workbenchState.hitboxIndex = activeIndex;
    setHitboxSelection([activeIndex], activeIndex);
    state.selectedSpecial = 'hitbox';
  } else {
    clearWorkbenchInsertSelection();
  }
  renderWorkbench();
  syncProperties();
});

els.wbPaintEdgeSlip?.addEventListener('click', () => {
  const selected = getWorkbenchObject();
  if (!selected || workbenchState.sourceType === 'player') return;
  const activeIndex = clampWorkbenchHitboxIndex(selected);
  const activeHitbox = selected.hitboxes?.[activeIndex];
  if (!activeHitbox || !isPolygonHitbox(activeHitbox)) return;
  if (workbenchState.paint.enabled) {
    workbenchState.paint.enabled = false;
    clearWorkbenchPaintPoints();
  }
  workbenchState.paint.insertMode = false;
  clearWorkbenchInsertSelection();
  workbenchState.paint.edgeSlipMode = !workbenchState.paint.edgeSlipMode;
  if (workbenchState.paint.edgeSlipMode) {
    state.selectionTarget = 'hitbox';
    state.selectionAction.hitbox = 'move';
    workbenchState.hitboxIndex = activeIndex;
    setHitboxSelection([activeIndex], activeIndex);
    state.selectedSpecial = 'hitbox';
  } else {
    clearWorkbenchEdgeSelection();
  }
  renderWorkbench();
  syncProperties();
});

els.wbPaintToolPoly?.addEventListener('click', () => {
  workbenchState.paint.tool = 'poly';
  clearWorkbenchPaintPoints();
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  renderWorkbench();
});

els.wbPaintToolParallelogram?.addEventListener('click', () => {
  workbenchState.paint.tool = 'parallelogram';
  clearWorkbenchPaintPoints();
  workbenchState.paint.insertMode = false;
  workbenchState.paint.edgeSlipMode = false;
  clearWorkbenchInsertSelection();
  clearWorkbenchEdgeSelection();
  renderWorkbench();
});

els.wbPaintPointUndo?.addEventListener('click', () => {
  if (!Array.isArray(workbenchState.paint.points) || !workbenchState.paint.points.length) return;
  workbenchState.paint.points = workbenchState.paint.points.slice(0, -1);
  renderWorkbench();
});

els.wbPaintPointClose?.addEventListener('click', () => {
  if (!workbenchState.paint.enabled) return;
  const selected = getWorkbenchObject();
  if (!selected) return;
  const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
  if (clampWorkbenchPaintTool(workbenchState.paint.tool) === 'parallelogram') {
    const points = Array.isArray(workbenchState.paint.points) ? workbenchState.paint.points : [];
    if (points.length >= 2) {
      const bounds = getWorkbenchPaintBounds(selected, meta.w, meta.h);
      const a = points[0];
      const b = points[1];
      const c = points[2] || { x: b.x, y: a.y + Math.max(16, Math.abs(b.x - a.x) * 0.45) };
      const rawD = { x: a.x + c.x - b.x, y: a.y + c.y - b.y };
      const d = clampWorkbenchPointToBounds(rawD, bounds) || rawD;
      workbenchState.paint.points = [a, b, c, d];
    }
  }
  commitWorkbenchPolygonPoints(selected, meta);
  renderWorkbench();
});

els.wbPaintPointClear?.addEventListener('click', () => {
  clearWorkbenchPaintPoints();
  renderWorkbench();
});

els.workbenchClose?.addEventListener('click', () => {
  closeWorkbench();
});

els.workbenchOverlay?.addEventListener('pointerdown', (e) => {
  if (e.target === els.workbenchOverlay) closeWorkbench();
});

const handleWorkbenchRulerPointerDown = (axis, e) => {
  if (e.button !== 0) return;
  if (!workbenchState.open || !areWorkbenchGuidesEditable()) return;
  const selected = getWorkbenchObject();
  const ctx = getWorkbenchRenderContext();
  if (!selected || !ctx) return;
  const local = getWorkbenchRulerLocalAtClient(e.clientX, e.clientY);
  if (!local) return;
  const tool = normalizeWorkbenchGuideTool(workbenchState.guideTool);
  if (tool === 'horizontal' || tool === 'vertical') {
    const addAxis = tool;
    const value = addAxis === 'vertical' ? local.x : local.y;
    if (!addWorkbenchGuide(addAxis, value)) return;
    e.preventDefault();
    e.stopPropagation();
    renderWorkbench();
    return;
  }
  const value = axis === 'vertical' ? local.x : local.y;
  if (tool === 'none') {
    const threshold = WORKBENCH_GUIDE_SNAP_THRESHOLD_PX / Math.max(0.001, ctx.zoom);
    const nearestIndex = findNearestWorkbenchGuideIndex(axis, value, threshold);
    if (nearestIndex < 0) return;
    e.preventDefault();
    e.stopPropagation();
    startWorkbenchGuideDrag(
      e,
      selected,
      ctx.view,
      ctx.zoom,
      axis,
      nearestIndex,
      ctx.previewOffsetX,
      ctx.previewOffsetY
    );
    return;
  }
};

els.workbenchRulerHorizontal?.addEventListener('pointerdown', (e) => {
  handleWorkbenchRulerPointerDown('vertical', e);
});

els.workbenchRulerVertical?.addEventListener('pointerdown', (e) => {
  handleWorkbenchRulerPointerDown('horizontal', e);
});

window.addEventListener('pointermove', (e) => {
  if (workbenchPanDrag && els.workbenchCanvasWrap) {
    const dx = e.clientX - workbenchPanDrag.startX;
    const dy = e.clientY - workbenchPanDrag.startY;
    els.workbenchCanvasWrap.scrollLeft = workbenchPanDrag.scrollLeft - dx;
    els.workbenchCanvasWrap.scrollTop = workbenchPanDrag.scrollTop - dy;
  }
  if (workbenchDrag) {
    updateWorkbenchDrag(e);
  }
});

window.addEventListener('pointerup', () => {
  if (workbenchPanDrag && els.workbenchCanvasWrap) {
    els.workbenchCanvasWrap.classList.remove('is-panning');
    workbenchPanDrag = null;
  }
  endWorkbenchDrag();
});

window.addEventListener('pointercancel', () => {
  if (workbenchPanDrag && els.workbenchCanvasWrap) {
    els.workbenchCanvasWrap.classList.remove('is-panning');
    workbenchPanDrag = null;
  }
  endWorkbenchDrag();
});

els.workbenchCanvasWrap?.addEventListener('pointerdown', (e) => {
  if (e.button !== 1) return;
  e.preventDefault();
  workbenchPanDrag = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    scrollLeft: els.workbenchCanvasWrap.scrollLeft,
    scrollTop: els.workbenchCanvasWrap.scrollTop
  };
  els.workbenchCanvasWrap.classList.add('is-panning');
  safeSetPointerCapture(els.workbenchCanvasWrap, e.pointerId);
});

els.workbenchCanvasWrap?.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? WORKBENCH_ZOOM_STEP : -WORKBENCH_ZOOM_STEP;
  zoomWorkbenchAroundPoint(workbenchState.zoom + delta, e.clientX, e.clientY);
}, { passive: false });

els.workbenchZoom?.addEventListener('input', () => {
  setWorkbenchZoom(Number(els.workbenchZoom.value) || workbenchState.zoom);
  renderWorkbench();
});

els.workbenchFocusToggle?.addEventListener('click', () => {
  workbenchState.focusMode = !workbenchState.focusMode;
  workbenchState.pinnedView = null;
  renderWorkbench();
});

els.workbenchFitFocus?.addEventListener('click', () => {
  fitWorkbenchView('focus');
});

els.workbenchFitObject?.addEventListener('click', () => {
  fitWorkbenchView('object');
});

els.workbenchFit?.addEventListener('click', () => {
  fitWorkbenchView('focus');
});

els.workbenchZoomIn?.addEventListener('click', () => {
  setWorkbenchZoom(workbenchState.zoom + WORKBENCH_ZOOM_STEP);
  renderWorkbench();
});

els.workbenchZoomOut?.addEventListener('click', () => {
  setWorkbenchZoom(workbenchState.zoom - WORKBENCH_ZOOM_STEP);
  renderWorkbench();
});

els.workbenchClearHitboxes?.addEventListener('click', () => {
  clearWorkbenchAllHitboxes();
});

els.workbenchUndo?.addEventListener('click', () => {
  workbenchUndo();
});

els.workbenchRedo?.addEventListener('click', () => {
  workbenchRedo();
});

const applyWorkbenchToSelectedObject = () => {
  const selected = getWorkbenchObject();
  if (!selected) return;
  const isPlayerSource = workbenchState.sourceType === 'player';
  if (!isPlayerSource && workbenchState.paint.enabled && (workbenchState.paint.points?.length || 0) >= 3) {
    const meta = getSpriteMetaSize(selected.sprite, { w: 200, h: 80 });
    commitWorkbenchPolygonPoints(selected, meta);
  }
  let committed = false;
  if (workbenchState.snapshot && workbenchState.dirty) {
    if (isPlayerSource) {
      pushHistory();
      applyWorkbenchPlayerObjectToState(selected);
      committed = true;
    } else {
      const current = cloneWorkbenchSnapshot(selected);
      applyWorkbenchSnapshot(selected, workbenchState.snapshot);
      pushHistory();
      applyWorkbenchSnapshot(selected, current);
      committed = true;
    }
  }
  if (committed && !isPlayerSource) {
    selected.hitboxes = clipHitboxesToObjectBounds(selected, selected.hitboxes, { fallbackToNearest: false });
    normalizeObjectHitboxesWithinBounds(selected, {
      normalizeCropSpace: false,
      preserveSetPosition: true,
      strictClip: true,
      allowEmpty: true
    });
  }
  workbenchState.snapshot = cloneWorkbenchSnapshot(selected);
  initWorkbenchHistory(selected);
  if (isPlayerSource) {
    updatePlayerProfileStatus();
  }
  renderWorld();
  syncProperties();
  renderWorkbench();
};

els.workbenchApply?.addEventListener('click', () => {
  applyWorkbenchToSelectedObject();
});

els.workbenchSave?.addEventListener('click', () => {
  applyWorkbenchToSelectedObject();
  els.saveMap?.click();
});

const updateWorkbenchCropFromInputs = () => {
  updateWorkbenchCrop(() => ({
    x: Number(els.wbCropX?.value) || 0,
    y: Number(els.wbCropY?.value) || 0,
    w: Number(els.wbCropW?.value) || 1,
    h: Number(els.wbCropH?.value) || 1
  }));
};

els.wbCropX?.addEventListener('input', updateWorkbenchCropFromInputs);
els.wbCropY?.addEventListener('input', updateWorkbenchCropFromInputs);
els.wbCropW?.addEventListener('input', updateWorkbenchCropFromInputs);
els.wbCropH?.addEventListener('input', updateWorkbenchCropFromInputs);
els.wbCropNudgeLeft?.addEventListener('click', () => updateWorkbenchCrop((crop) => ({ ...crop, x: crop.x - 1 })));
els.wbCropNudgeRight?.addEventListener('click', () => updateWorkbenchCrop((crop) => ({ ...crop, x: crop.x + 1 })));
els.wbCropNudgeUp?.addEventListener('click', () => updateWorkbenchCrop((crop) => ({ ...crop, y: crop.y - 1 })));
els.wbCropNudgeDown?.addEventListener('click', () => updateWorkbenchCrop((crop) => ({ ...crop, y: crop.y + 1 })));

els.wbHitboxIndex?.addEventListener('change', () => {
  const selected = getWorkbenchObject();
  if (!selected) return;
  if (!canSelectHitboxTarget()) return;
  workbenchState.hitboxIndex = Math.max(0, Math.min(selected.hitboxes.length - 1, Number(els.wbHitboxIndex.value) || 0));
  setHitboxSelection([workbenchState.hitboxIndex], workbenchState.hitboxIndex);
  state.selectedSpecial = 'hitbox';
  renderWorld();
  syncProperties();
  renderWorkbench();
});

const updateWorkbenchHitboxFromInputs = () => {
  updateWorkbenchActiveHitbox((hb) => ({
    ...hb,
    x: Number(els.wbHitboxX?.value),
    y: Number(els.wbHitboxY?.value),
    w: Number(els.wbHitboxW?.value),
    h: Number(els.wbHitboxH?.value),
    rotation: Number(els.wbHitboxRotation?.value)
  }));
};

els.wbHitboxX?.addEventListener('input', updateWorkbenchHitboxFromInputs);
els.wbHitboxY?.addEventListener('input', updateWorkbenchHitboxFromInputs);
els.wbHitboxW?.addEventListener('input', updateWorkbenchHitboxFromInputs);
els.wbHitboxH?.addEventListener('input', updateWorkbenchHitboxFromInputs);
els.wbHitboxRotation?.addEventListener('input', updateWorkbenchHitboxFromInputs);
els.wbHitboxLeft?.addEventListener('click', () => updateWorkbenchActiveHitbox((hb) => ({ ...hb, x: hb.x - 1 })));
els.wbHitboxRight?.addEventListener('click', () => updateWorkbenchActiveHitbox((hb) => ({ ...hb, x: hb.x + 1 })));
els.wbHitboxUp?.addEventListener('click', () => updateWorkbenchActiveHitbox((hb) => ({ ...hb, y: hb.y - 1 })));
els.wbHitboxDown?.addEventListener('click', () => updateWorkbenchActiveHitbox((hb) => ({ ...hb, y: hb.y + 1 })));

els.duplicate.addEventListener('click', () => {
  const selected = getSelected();
  if (!selected) return;
  pushHistory();
  const clone = cloneObject(selected);
  state.objects.push(clone);
  state.selectedId = clone.id;
  renderWorld();
  syncProperties();
});

const deleteSelectedObjects = () => {
  const ids = state.selectedIds?.length
    ? [...state.selectedIds]
    : (state.selectedId ? [state.selectedId] : []);
  if (!ids.length) return false;
  pushHistory();
  const idSet = new Set(ids);
  state.objects = state.objects.filter((obj) => !idSet.has(obj.id));
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedSpecial = null;
  setHitboxSelection([], null);
  renderWorld();
  syncProperties();
  return true;
};

els.delete.addEventListener('click', () => {
  deleteSelectedObjects();
});

els.undo.addEventListener('click', restoreHistory);

const isTextEditingTarget = (target) => {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, [contenteditable="true"]')) return true;
  const tag = target.tagName?.toLowerCase?.();
  return tag === 'select';
};

window.addEventListener('keydown', (e) => {
  if (workbenchState.open && e.key === 'Escape') {
    e.preventDefault();
    closeWorkbench();
    return;
  }
  if (state.test.active) return;
  if (isTextEditingTarget(e.target)) return;
  const key = String(e.key || '');
  const lowerKey = key.toLowerCase();

  if (workbenchState.open) {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && lowerKey === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        workbenchRedo();
      } else {
        workbenchUndo();
      }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.altKey && lowerKey === 'y') {
      e.preventDefault();
      workbenchRedo();
      return;
    }
  }

  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && lowerKey === 'z') {
    e.preventDefault();
    restoreHistory();
    return;
  }

  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && lowerKey === 'c') {
    const copied = copySelectedObjectsToClipboard();
    if (copied) e.preventDefault();
    return;
  }

  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && lowerKey === 'v') {
    const pasted = pasteObjectsFromClipboard();
    if (pasted) e.preventDefault();
    return;
  }

  if (!e.metaKey && !e.ctrlKey && !e.altKey && (key === 'Delete' || key === 'Backspace')) {
    const deleted = deleteSelectedObjects();
    if (deleted) {
      e.preventDefault();
    }
  }
});

els.jumpTop?.addEventListener('click', () => {
  els.viewport.scrollTop = 0;
  updateMiniMap();
});

els.jumpBottom?.addEventListener('click', () => {
  els.viewport.scrollTop = Math.max(0, state.map.height - els.viewport.clientHeight);
  updateMiniMap();
});

els.jumpMid?.addEventListener('click', () => {
  els.viewport.scrollTop = Math.max(0, (state.map.height - els.viewport.clientHeight) / 2);
  updateMiniMap();
});

els.jumpUp?.addEventListener('click', () => {
  els.viewport.scrollTop = Math.max(0, els.viewport.scrollTop - 5000);
  updateMiniMap();
});

els.jumpDown?.addEventListener('click', () => {
  els.viewport.scrollTop = Math.min(state.map.height - els.viewport.clientHeight, els.viewport.scrollTop + 5000);
  updateMiniMap();
});

els.jumpStart?.addEventListener('click', () => {
  scrollToStart();
});

els.playerBoxW?.addEventListener('input', clampPlayerSettings);
els.playerBoxH?.addEventListener('input', clampPlayerSettings);
els.playerFootInset?.addEventListener('input', clampPlayerSettings);
els.playerScale?.addEventListener('input', clampPlayerSettings);
els.playerHitboxPointToggle?.addEventListener('click', () => {
  if (state.selectedSpecial !== 'player') return;
  const tool = getPlayerPointToolState();
  if (tool.active) {
    tool.active = false;
    tool.points = [];
  } else {
    tool.active = true;
    tool.points = [];
    state.selectionTarget = 'hitbox';
    state.showHitboxes = true;
    state.boxGuidesVisible = true;
    state.selectionAction.player = 'move';
  }
  renderWorld();
  syncProperties();
});
els.playerHitboxPointUndo?.addEventListener('click', () => {
  if (state.selectedSpecial !== 'player') return;
  const tool = getPlayerPointToolState();
  if (!tool.points.length) return;
  tool.points.pop();
  renderWorld();
  syncProperties();
});
els.playerHitboxPointClear?.addEventListener('click', () => {
  if (state.selectedSpecial !== 'player') return;
  clearPlayerPointHitbox();
  renderWorld();
  syncProperties();
});
els.playerHitboxPointApply?.addEventListener('click', () => {
  if (state.selectedSpecial !== 'player') return;
  if (!applyPlayerPointHitbox()) return;
  renderWorld();
  syncProperties();
});
els.savePlayerProfile?.addEventListener('click', () => {
  savePlayerProfile(buildCurrentPlayerProfile());
  syncProperties();
});
els.applyPlayerProfile?.addEventListener('click', () => {
  if (!state.playerProfile) return;
  applyPlayerProfile(state.playerProfile, { withHistory: true });
});
els.clearPlayerProfile?.addEventListener('click', () => {
  savePlayerProfile(null);
  syncProperties();
});
els.startApply?.addEventListener('click', () => {
  ensureStartPoint();
  const rawX = Number(els.startX?.value);
  const rawY = Number(els.startY?.value);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return;
  const x = Math.max(0, Math.min(state.map.width, snapValue(rawX)));
  const y = Math.max(0, Math.min(state.map.height, snapValue(rawY)));
  pushHistory();
  state.startPoint = { x, y };
  renderWorld();
  syncProperties();
  if (state.editorOptions.autoScrollStart) {
    scrollToStart();
  }
});

els.savePointAdd?.addEventListener('click', () => {
  ensureStartPoint();
  pushHistory();
  const id = addSavePointAt(state.startPoint, els.savePointName?.value || '');
  if (!id) {
    state.history.pop();
    return;
  }
  renderWorld();
  syncProperties();
});

els.savePointGo?.addEventListener('click', () => {
  const id = els.savePointSelect?.value;
  const point = getSavePointById(id);
  if (!point) return;
  // Savepoint and start point are intentionally separated.
  // This action moves camera only; it must not rewrite startPoint.
  scrollViewportToPoint(point, 0.75);
});

els.savePointSetStart?.addEventListener('click', () => {
  const id = els.savePointSelect?.value;
  if (!id) return;
  setStartPointFromSavePoint(id, { withHistory: true, autoScroll: true });
});

els.savePointDelete?.addEventListener('click', () => {
  const id = els.savePointSelect?.value;
  if (!id) return;
  const beforeCount = state.savePoints.length;
  const next = state.savePoints.filter((point) => point.id !== id);
  if (next.length === beforeCount) return;
  pushHistory();
  state.savePoints = next;
  refreshSavePointControls({ preserveSelection: false });
  renderWorld();
  syncProperties();
});

els.savePointSelect?.addEventListener('change', () => {
  if (els.testSavePointSelect) {
    const id = els.savePointSelect.value;
    if (state.savePoints.some((point) => point.id === id)) {
      els.testSavePointSelect.value = id;
    }
  }
});

els.testSavePointWarp?.addEventListener('click', () => {
  const id = els.testSavePointSelect?.value;
  if (!id) return;
  const ok = testRuntime.warpToSavePoint?.(id);
  if (!ok) {
    alert('세이브포인트 이동에 실패했습니다.');
  }
});

els.testSavePointUseStart?.addEventListener('click', () => {
  const id = els.testSavePointSelect?.value;
  if (!id) return;
  const ok = setStartPointFromSavePoint(id, { withHistory: true, autoScroll: false });
  if (!ok) {
    alert('시작지점 지정에 실패했습니다.');
    return;
  }
  if (state.test.active) {
    testRuntime.restartTestMode();
    testRuntime.warpToSavePoint?.(id);
  }
});

// Panels collapse
Array.from(document.querySelectorAll('.panel-toggle')).forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    target.classList.toggle('collapsed');
    updateLayoutColumns();
    updatePanelToggleLabels();
  });
});

const updateLayoutColumns = () => {
  if (!els.editorLayout) return;
  const leftCollapsed = els.palettePanel.classList.contains('collapsed');
  const rightCollapsed = els.propPanel.classList.contains('collapsed');
  const leftWidth = leftCollapsed ? '56px' : '260px';
  const rightWidth = rightCollapsed ? '56px' : '320px';
  els.editorLayout.style.gridTemplateColumns = `${leftWidth} 1fr ${rightWidth}`;
};

const updatePanelToggleLabels = () => {
  document.querySelectorAll('.panel-toggle').forEach((btn) => {
    if (btn.id === 'toolbar-toggle') return;
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    btn.textContent = target.classList.contains('collapsed') ? '펼치기' : '접기';
  });
};

const updateToolbarToggleLabel = () => {
  if (!els.stageToolbar || !els.stageToolbarToggle) return;
  els.stageToolbarToggle.textContent = els.stageToolbar.classList.contains('collapsed') ? '펼치기' : '접기';
};

const updateMiniMapToggleLabel = () => {
  if (!els.miniMap || !els.miniMapToggle) return;
  els.miniMapToggle.textContent = els.miniMap.classList.contains('collapsed') ? '펼치기' : '접기';
};

// Save / Load
els.resetMap?.addEventListener('click', () => {
  const ok = window.confirm('현재 편집 중인 맵을 초기 상태로 되돌릴까요?\n(로컬 슬롯 저장 데이터는 유지됩니다)');
  if (!ok) return;
  applyDefaultEditorState({ withHistory: true });
  updateLocalSlotStatus('맵 초기화 완료 (슬롯 데이터 유지)');
});

els.localSlotSelect?.addEventListener('change', () => {
  syncSelectedLocalSlotNameInput();
  updateLocalSlotStatus();
});

els.slotRename?.addEventListener('click', () => {
  const index = getSelectedLocalSlotIndex();
  const slot = localMapSlots[index];
  if (!slot?.payload) {
    updateLocalSlotStatus('이름 수정은 저장된 슬롯에서만 가능합니다');
    return;
  }
  const nextName = normalizeLocalSlotName(els.localSlotName?.value || '');
  slot.name = nextName;
  saveLocalMapSlots();
  refreshLocalSlotSelectOptions();
  syncSelectedLocalSlotNameInput();
  updateLocalSlotStatus(`${getLocalSlotDisplayName(slot, index)}: 이름 저장 완료`);
});

els.localSlotName?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  els.slotRename?.click();
});

els.slotSave?.addEventListener('click', () => {
  const index = getSelectedLocalSlotIndex();
  const previous = localMapSlots[index];
  const nextName = normalizeLocalSlotName(els.localSlotName?.value || previous?.name || '');
  localMapSlots[index] = {
    savedAt: new Date().toISOString(),
    payload: buildSavePayload(state),
    name: nextName
  };
  saveLocalMapSlots();
  refreshLocalSlotSelectOptions();
  syncSelectedLocalSlotNameInput();
  updateLocalSlotStatus(`${getLocalSlotDisplayName(localMapSlots[index], index)}: 저장 완료`);
});

els.slotLoad?.addEventListener('click', () => {
  const index = getSelectedLocalSlotIndex();
  const slot = localMapSlots[index];
  if (!slot?.payload) {
    updateLocalSlotStatus(`${getLocalSlotDisplayName(slot, index)}: 비어 있습니다`);
    return;
  }
  const result = parseLoadedMapData(slot.payload, state);
  if (!result.ok) {
    updateLocalSlotStatus(`${getLocalSlotDisplayName(slot, index)}: 불러오기 실패`);
    alert(result.error || '슬롯 데이터를 불러오지 못했습니다.');
    return;
  }
  if (result.warnings?.length) {
    console.warn('[Jumpmap Slot Load Warnings]', result.warnings);
    alert(`슬롯 불러오기 완료: 자동 보정 ${result.warnings.length}건\n자세한 내용은 콘솔을 확인하세요.`);
  }
  applyLoadedPayload(result.payload, { persistProfiles: true, persistDraft: true });
  updateLocalSlotStatus(`${getLocalSlotDisplayName(slot, index)}: 불러오기 완료`);
});

els.saveMap.addEventListener('click', () => {
  const payload = buildSavePayload(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildMapFilename();
  a.click();
  URL.revokeObjectURL(url);
});

els.loadMap.addEventListener('click', () => els.loadFile.click());
els.loadFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = parseLoadedMapData(reader.result, state);
    if (!result.ok) {
      alert(result.error || '맵 파일을 불러오지 못했습니다.');
      return;
    }
    if (result.warnings?.length) {
      console.warn('[Jumpmap Load Warnings]', result.warnings);
      alert(`불러오기 완료: 자동 보정 ${result.warnings.length}건\n자세한 내용은 콘솔을 확인하세요.`);
    }
    applyLoadedPayload(result.payload, { persistProfiles: true, persistDraft: true });
  };
  reader.onerror = () => {
    alert('맵 파일을 읽는 중 오류가 발생했습니다.');
  };
  reader.readAsText(file);
});

// Integration bridge (quiz/gauge/runtime boundary)
const TEST_RUNTIME_GAUGE_MAX = Number.MAX_SAFE_INTEGER;
const TEST_RUNTIME_GAUGE_START = 100;
const integrationBridge = window.JumpmapIntegrationBridge?.createBridge
  ? window.JumpmapIntegrationBridge.createBridge({
    modeId: 'jumpmap',
    strictContract: true,
    ruleOptions: {
      resourceKey: 'gauge',
      min: 0,
      max: TEST_RUNTIME_GAUGE_MAX,
      initial: TEST_RUNTIME_GAUGE_START,
      moveCost: 4,
      jumpCost: 14.5,
      doubleJumpCost: 14.5,
      correctReward: 64,
      wrongReward: 0,
      wrongDelayMs: 3000
    },
    minGauge: 0,
    maxGauge: TEST_RUNTIME_GAUGE_MAX,
    initialGauge: TEST_RUNTIME_GAUGE_START
  })
  : null;
if (integrationBridge) {
  window.jumpmapIntegrationBridge = integrationBridge;
}

// Test mode
const testRuntime = window.JumpmapTestRuntime.create({
  state,
  els,
  integration: integrationBridge,
  assets: {
    plateBase,
    sejongBase,
    SPRITES
  },
  hooks: {
    getBackgroundLayers,
    applyPlayerSpriteToElement,
    getPlayerSpriteRender,
    getPlayerMetrics,
    getPlayerHitboxOffset,
    getPlayerHitboxPolygon,
    ensureStartPoint
  },
  geometry: {
    worldPointToLocal,
    localPointToWorld
  }
});

const readLauncherSetup = () => {
  try {
    const raw = window.localStorage?.getItem(LAUNCHER_SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('[JumpmapLauncher] setup read failed', error);
    return null;
  }
};

const applyLauncherSetupToState = (setup) => {
  if (!setup || typeof setup !== 'object') return;
  const players = Math.max(1, Math.min(6, Math.round(Number(setup.players) || 1)));
  testRuntime.setPlayerCount?.(players);
  if (Array.isArray(setup.playerNames)) {
    state.test.playerNames = setup.playerNames
      .slice(0, 6)
      .map((name, index) => {
        const text = typeof name === 'string' ? name.trim() : '';
        return text || `사용자${index + 1}`;
      });
  }
  if (Array.isArray(setup.playerTags)) {
    state.test.playerTags = setup.playerTags
      .slice(0, 6)
      .map((tag) => {
        if (typeof tag !== 'string') return '';
        return tag.trim();
      });
  }
  if (typeof setup.characterId === 'string' && setup.characterId.trim()) {
    state.test.characterId = setup.characterId.trim();
  }
};

const loadRuntimeBaselineMap = async (logPrefix = 'JumpmapRuntimeMap') => {
  for (const url of LAUNCH_RUNTIME_MAP_URLS) {
    try {
      const separator = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${separator}v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const raw = await res.text();
      const result = parseLoadedMapData(raw, state);
      if (!result.ok) {
        console.warn(`[${logPrefix}] runtime map parse failed`, url, result.error);
        continue;
      }
      if (result.warnings?.length) {
        console.warn(`[${logPrefix}] runtime map load warnings`, url, result.warnings);
      }
      applyLoadedPayload(result.payload, {
        persistProfiles: true,
        persistGroupPresets: true,
        persistDraft: true
      });
      return true;
    } catch (error) {
      console.warn(`[${logPrefix}] runtime map fetch failed`, url, error);
    }
  }
  return false;
};

const maybeAutoLoadEditorBaselineMap = (draftRestored) => {
  const run = async () => {
    if (draftRestored) return;
    const params = new URLSearchParams(window.location.search);
    const launchMode = params.get('launchMode');
    if (launchMode === 'play') return;
    await loadRuntimeBaselineMap('JumpmapEditor');
  };
  run();
};

const maybeAutoStartJumpmapPlayMode = () => {
  const run = async () => {
    const params = new URLSearchParams(window.location.search);
    const launchMode = params.get('launchMode');
    const autoStartTest = params.get('autoStartTest');
    const autoRestartTest = params.get('autoRestartTest');
    if (launchMode === 'play') {
      document.documentElement.classList.add('jumpmap-play-launch');
      document.body.classList.add('play-launch');
      document.title = '놀퀴즈 - 점프맵';
    }
    if (!(launchMode === 'play' && autoStartTest === '1')) return;
    const setup = readLauncherSetup();
    if (setup?.gameMode && setup.gameMode !== 'jumpmap') return;
    await loadRuntimeBaselineMap('JumpmapPlay');
    applyLauncherSetupToState(setup);
    const startPointId = typeof setup?.jumpmapStartPointId === 'string' ? setup.jumpmapStartPointId : '';
    const applyStartPointWarp = () => {
      if (startPointId) testRuntime.warpToSavePoint?.(startPointId);
    };
    requestAnimationFrame(() => {
      testRuntime.enterTestMode();
      if (autoRestartTest === '1') {
        requestAnimationFrame(() => {
          testRuntime.restartTestMode();
          applyStartPointWarp();
        });
      } else {
        applyStartPointWarp();
      }
    });
  };

  run();
};

els.testToggle.addEventListener('click', () => {
  testRuntime.enterTestMode();
  const id = els.testSavePointSelect?.value;
  if (id) testRuntime.warpToSavePoint?.(id);
});
els.testRestart?.addEventListener('click', () => {
  testRuntime.restartTestMode();
  const id = els.testSavePointSelect?.value;
  if (id) testRuntime.warpToSavePoint?.(id);
});
els.testDebugHitbox?.addEventListener('change', (e) => {
  state.test.showDebugHitbox = !!e.target.checked;
});
els.testExit.addEventListener('click', testRuntime.exitTestMode);
els.playerCount.addEventListener('click', testRuntime.onPlayerCountClick);

// Init
applyMapSize();
loadPlayerProfile();
if (state.playerProfile) {
  const profile = normalizePlayerProfile(state.playerProfile);
  if (profile) {
    state.playerProfile = profile;
    state.playerHitbox = { ...profile.playerHitbox };
    state.playerHitboxOffset = { ...profile.playerHitboxOffset };
    state.playerScale = profile.playerScale;
    state.playerCrop = profile.playerCrop ? cloneCrop(profile.playerCrop) : null;
  }
}
const draftRestored = tryRestoreEditorDraft();
if (!draftRestored) {
  updateGrid();
  renderWorld();
}
loadPlates();
loadPlayerSpriteMeta();
applyBackground();
updateBackgroundInputs();
syncPlayerHitboxInputs();
updatePlayerProfileStatus();
syncEditorOptionsInputs();
syncPhysicsInputs();
syncCameraInputs();
if (els.testDebugHitbox) {
  els.testDebugHitbox.checked = !!state.test.showDebugHitbox;
}
ensureStartPoint();
refreshSavePointControls({ preserveSelection: false });
if (state.editorOptions.autoScrollStart) {
  requestAnimationFrame(scrollToStart);
}
updateLayoutColumns();
updatePanelToggleLabels();
updateMapPosition();
updateToolbarToggleLabel();
updateMiniMapToggleLabel();
loadLocalMapSlots();
refreshLocalSlotSelectOptions();
syncSelectedLocalSlotNameInput();
updateLocalSlotStatus();
syncTextureObjectControls();
maybeAutoStartJumpmapPlayMode();
maybeAutoLoadEditorBaselineMap(draftRestored);

// Keyboard control for player 1 in test
window.addEventListener('keydown', testRuntime.onKeyDown);
window.addEventListener('keyup', testRuntime.onKeyUp);
window.addEventListener('blur', testRuntime.onWindowBlur);
document.addEventListener('visibilitychange', testRuntime.onVisibilityChange);

window.addEventListener('resize', updateMiniMap);
window.addEventListener('beforeunload', () => {
  cancelDraftSave();
  persistEditorDraft();
});
