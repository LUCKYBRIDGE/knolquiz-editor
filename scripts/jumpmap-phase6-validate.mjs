#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const targetFiles = [
  'public/jumpmap-editor/editor.js',
  'public/jumpmap-editor/hitbox-utils.js',
  'public/jumpmap-editor/geometry-utils.js',
  'public/jumpmap-editor/map-io-utils.js',
  'public/jumpmap-editor/test-runtime.js',
  'public/jumpmap-editor/test-physics-utils.js'
];

let passed = 0;
let failed = 0;

const pass = (msg) => {
  passed += 1;
  console.log(`[PASS] ${msg}`);
};

const fail = (msg) => {
  failed += 1;
  console.error(`[FAIL] ${msg}`);
};

const expect = (condition, msg) => {
  if (condition) pass(msg);
  else fail(msg);
};

const checkSyntax = (filePath) => {
  const abs = path.join(root, filePath);
  if (!fs.existsSync(abs)) {
    fail(`file missing: ${filePath}`);
    return;
  }
  const result = spawnSync('node', ['--check', abs], { encoding: 'utf8' });
  if (result.status === 0) {
    pass(`syntax ok: ${filePath}`);
    return;
  }
  fail(`syntax error: ${filePath}\n${result.stderr || result.stdout}`);
};

const loadBrowserIife = (filePath, exportPath) => {
  const abs = path.join(root, filePath);
  const code = fs.readFileSync(abs, 'utf8');
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  return exportPath.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), context);
};

const loadPhysicsEnvironment = () => {
  const context = { window: {}, console };
  vm.createContext(context);
  const geometryCode = fs.readFileSync(path.join(root, 'public/jumpmap-editor/geometry-utils.js'), 'utf8');
  const physicsCode = fs.readFileSync(path.join(root, 'public/jumpmap-editor/test-physics-utils.js'), 'utf8');
  vm.runInContext(geometryCode, context, { filename: 'public/jumpmap-editor/geometry-utils.js' });
  vm.runInContext(physicsCode, context, { filename: 'public/jumpmap-editor/test-physics-utils.js' });
  return {
    geometry: context.window.JumpmapGeometryUtils,
    physics: context.window.JumpmapTestPhysicsUtils
  };
};

const runMapIoChecks = () => {
  const api = loadBrowserIife('public/jumpmap-editor/map-io-utils.js', 'window.JumpmapMapIOUtils');
  expect(!!api, 'map-io module loads');
  if (!api) return;
  expect(api.CURRENT_MAP_SCHEMA_VERSION === 2, 'current map schema version is 2');

  const currentState = {
    map: { width: 2400, height: 12000 },
    grid: { size: 32, snap: true, visible: true },
    camera: { yBias: 0.35, smooth: 0.18 },
    background: { color: '#ffffff', image: '', texture: '' },
    playerHitbox: { width: 80, height: 120, footInset: 8 },
    playerHitboxOffset: { x: 0, y: 0 },
    playerScale: 1,
    playerCrop: null,
    playerLocked: false,
    physics: {
      fallSpeed: 600,
      jumpSpeed: 1000,
      jumpHeight: 360,
      moveSpeed: 220,
      walkableSlopeMaxAngle: 75,
      slopeFallStartAngle: 75,
      slopeSlideEnabled: true,
      slopeSpeedProfile: [
        { maxAngle: 15, up: 1.0, down: 1.0 },
        { maxAngle: 30, up: 1.0, down: 1.0 },
        { maxAngle: 45, up: 1.0, down: 1.0 },
        { maxAngle: 60, up: 0.88, down: 1.12 },
        { maxAngle: 75, up: 0.72, down: 1.32 },
        { maxAngle: 90, up: 0.5, down: 1.62 }
      ],
      flatZones: []
    },
    startPoint: { x: 200, y: 11800 },
    savePoints: [],
    editorOptions: { autoBasePlatform: true, autoScrollStart: true, autoSelectAfterPlace: true }
  };

  const validPayload = {
    version: 2,
    mapSize: { w: 3200, h: 14000 },
    grid: { size: 16, snap: false, visible: true },
    camera: { yBias: 0.4, smooth: 0.2 },
    background: { color: '#efe6d0', image: '', texture: 'paper-fiber.svg' },
    playerHitbox: { width: 100, height: 150, footInset: 6 },
    playerHitboxOffset: { x: 3, y: -2 },
    playerScale: 1.1,
    playerCrop: { x: 5, y: 6, w: 70, h: 110 },
    playerLocked: true,
    physics: {
      fallSpeed: 500,
      jumpSpeed: 900,
      jumpHeight: 380,
      moveSpeed: 230,
      walkableSlopeMaxAngle: 68,
      slopeFallStartAngle: 78,
      slopeSlideEnabled: true,
      flatZones: [{ x: 120, y: 500, w: 200, h: 60 }]
    },
    startPoint: { x: 300, y: 13000 },
    savePoints: [
      { id: 'sp_a', name: '중간', x: 500, y: 9000 },
      { id: 'sp_b', name: '상단', x: 700, y: 2000 }
    ],
    editorOptions: { autoBasePlatform: true, autoScrollStart: false, autoSelectAfterPlace: true },
    spriteProfiles: {
      'plate_A.png': {
        scale: 0.7,
        crop: { x: 2, y: 3, w: 50, h: 40 },
        hitboxes: [{ x: 0, y: 22, w: 50, h: 18, locked: false }]
      }
    },
    objectGroupPresets: {
      test_group_1: {
        name: '검증 묶음',
        savedAt: '2026-02-08T00:00:00.000Z',
        objects: [
          {
            id: 'obj_preset_1',
            sprite: 'plate_A.png',
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            flipH: false,
            flipV: false,
            locked: false,
            hitboxes: [{ x: 0, y: 0, w: 50, h: 20, locked: false }]
          },
          {
            id: 'obj_preset_2',
            sprite: 'plate_A.png',
            x: 60,
            y: 0,
            scale: 1,
            rotation: 0,
            flipH: false,
            flipV: false,
            locked: false,
            hitboxes: [{ x: 0, y: 0, w: 50, h: 20, locked: false }]
          }
        ]
      }
    },
    hitboxPresets: {
      'plate_A.png': [{ x: 0, y: 20, w: 48, h: 16, locked: false }]
    },
    spriteDefaults: {
      'plate_A.png': { scale: 0.6 }
    },
    objects: [
      {
        id: 'obj_1',
        sprite: 'plate_A.png',
        x: 10,
        y: 20,
        scale: 1,
        rotation: 0,
        flipH: false,
        flipV: false,
        locked: true,
        crop: { x: 0, y: 0, w: 80, h: 40 },
        hitboxes: [{ x: 0, y: 20, w: 80, h: 20, locked: true }]
      }
    ]
  };

  const parsedValid = api.parseLoadedMapData(JSON.stringify(validPayload), currentState);
  expect(parsedValid.ok === true, 'parse valid payload');
  expect(parsedValid.payload.version === 2, 'parsed payload normalized to v2');
  expect(parsedValid.payload.map.width === 3200, 'parsed map width preserved');
  expect(parsedValid.payload.spriteProfiles['plate_A.png']?.hitboxes?.length === 1, 'spriteProfiles parsed');
  expect(parsedValid.payload.objectGroupPresets?.test_group_1?.objects?.length === 2, 'objectGroupPresets parsed');
  expect(parsedValid.payload.playerCrop?.w === 70, 'player crop parsed');
  expect(parsedValid.payload.playerLocked === true, 'player lock parsed');
  expect(parsedValid.payload.savePoints?.length === 2, 'savePoints parsed');
  expect(parsedValid.payload.physics?.walkableSlopeMaxAngle === 68, 'walkable slope angle parsed');
  expect(parsedValid.payload.physics?.slopeFallStartAngle === 78, 'slope fall start angle parsed');
  expect(parsedValid.payload.physics?.flatZones?.length === 1, 'flat zones parsed');
  expect(parsedValid.payload.objects[0]?.locked === true, 'object lock parsed');
  expect(parsedValid.payload.objects[0]?.hitboxes?.[0]?.locked === true, 'hitbox lock parsed');

  const outOfBoundsStartPayload = {
    version: 2,
    mapSize: { w: 1800, h: 9000 },
    startPoint: { x: 99999, y: -500 },
    objects: []
  };
  const parsedOutOfBoundsStart = api.parseLoadedMapData(JSON.stringify(outOfBoundsStartPayload), currentState);
  expect(parsedOutOfBoundsStart.ok === true, 'parse out-of-bounds start payload');
  expect(parsedOutOfBoundsStart.payload.startPoint.x === 1800, 'start x clamped to map width');
  expect(parsedOutOfBoundsStart.payload.startPoint.y === 0, 'start y clamped to map top');
  expect(parsedOutOfBoundsStart.warnings?.some((w) => w.includes('시작 지점이 맵 범위를 벗어나')), 'start clamp warning emitted');

  const rotationNormalizePayload = {
    version: 2,
    mapSize: { w: 1600, h: 8000 },
    objects: [
      {
        id: 'obj_rot',
        sprite: 'plate_A.png',
        x: 10,
        y: 20,
        scale: 1,
        rotation: -30,
        hitboxes: [{ x: 0, y: 0, w: 50, h: 10, locked: false }]
      }
    ]
  };
  const parsedRotation = api.parseLoadedMapData(JSON.stringify(rotationNormalizePayload), currentState);
  expect(parsedRotation.ok === true, 'parse rotation normalize payload');
  expect(parsedRotation.payload.objects[0].rotation === 330, 'rotation normalized to 0..359');

  const legacyPayload = {
    version: 1,
    mapSize: { w: 2000, h: 12000 },
    hitboxPresets: {
      'plate_legacy.png': [{ x: 1, y: 2, w: 30, h: 10, locked: false }]
    },
    spriteDefaults: {
      'plate_legacy.png': { scale: 0.9 }
    },
    objects: []
  };
  const parsedLegacy = api.parseLoadedMapData(JSON.stringify(legacyPayload), currentState);
  const legacyProfile = parsedLegacy.payload?.spriteProfiles?.['plate_legacy.png'];
  expect(parsedLegacy.ok === true, 'parse legacy payload');
  expect(!!legacyProfile, 'legacy merged into spriteProfiles');
  expect(Array.isArray(legacyProfile?.hitboxes) && legacyProfile.hitboxes.length === 1, 'legacy hitboxes merged');
  expect(Number.isFinite(legacyProfile?.scale), 'legacy scale merged');

  const legacyV0Payload = {
    map: { width: 1800, height: 10000 },
    start: { x: 120, y: 9800 },
    player: {
      scale: 1.2,
      hitbox: { width: 90, height: 130, footInset: 7 },
      crop: { x: 3, y: 4, w: 77, h: 111 }
    },
    objects: [
      {
        id: 'legacy_obj_1',
        spriteName: 'plate_A.png',
        x: 30,
        y: 40,
        defaultScale: 0.85,
        hitbox: { x: 0, y: 10, w: 50, h: 10, locked: false }
      }
    ]
  };
  const parsedV0 = api.parseLoadedMapData(JSON.stringify(legacyV0Payload), currentState);
  expect(parsedV0.ok === true, 'parse v0 legacy payload');
  expect(parsedV0.sourceVersion === 0, 'source version detected as v0');
  expect(parsedV0.payload.map.width === 1800, 'v0 map converted');
  expect(parsedV0.payload.startPoint.x === 120, 'v0 start converted');
  expect(parsedV0.payload.playerScale === 1.2, 'v0 player scale converted');
  expect(parsedV0.payload.playerCrop?.w === 77, 'v0 player crop converted');
  expect(parsedV0.payload.objects[0].sprite === 'plate_A.png', 'v0 spriteName converted');
  expect(Array.isArray(parsedV0.payload.objects[0].hitboxes), 'v0 hitbox converted to hitboxes');

  const wrappedPayload = {
    schemaVersion: 99,
    payload: {
      version: 2,
      mapSize: { w: 2500, h: 13000 },
      objects: []
    }
  };
  const parsedWrapped = api.parseLoadedMapData(JSON.stringify(wrappedPayload), currentState);
  expect(parsedWrapped.ok === true, 'parse wrapped payload');
  expect(parsedWrapped.payload.map.width === 2500, 'wrapped payload map parsed');

  const futurePayload = {
    version: 99,
    mapSize: { w: 2600, h: 12500 },
    objects: []
  };
  const parsedFuture = api.parseLoadedMapData(JSON.stringify(futurePayload), currentState);
  expect(parsedFuture.ok === true, 'future version payload still parsed');
  expect(parsedFuture.warnings?.length > 0, 'future version emits warnings');

  const invalidJson = api.parseLoadedMapData('{bad-json', currentState);
  expect(invalidJson.ok === false, 'invalid json rejected');

  const payloadFromState = api.buildSavePayload({
    ...currentState,
    savePoints: validPayload.savePoints,
    spriteProfiles: validPayload.spriteProfiles,
    objectGroupPresets: validPayload.objectGroupPresets,
    hitboxPresets: validPayload.hitboxPresets,
    objects: validPayload.objects,
    spriteDefaults: validPayload.spriteDefaults
  });
  expect(payloadFromState.version === 2, 'buildSavePayload writes v2');
  expect(payloadFromState.playerLocked === false, 'buildSavePayload includes playerLocked');
  expect(Array.isArray(payloadFromState.savePoints), 'buildSavePayload includes savePoints');
  const parsedRoundtrip = api.parseLoadedMapData(payloadFromState, currentState);
  expect(parsedRoundtrip.ok === true, 'roundtrip parse from buildSavePayload');
  expect(parsedRoundtrip.payload.objectGroupPresets?.test_group_1?.objects?.length === 2, 'objectGroupPresets roundtrip preserved');
  expect(
    parsedRoundtrip.payload.spriteProfiles['plate_A.png']?.crop?.w === 50,
    'roundtrip keeps sprite profile crop'
  );
  expect(parsedRoundtrip.payload.playerLocked === false, 'roundtrip keeps player lock state');
  expect(parsedRoundtrip.payload.savePoints?.length === 2, 'roundtrip keeps savePoints');
};

const runPhysicsChecks = () => {
  const { geometry, physics } = loadPhysicsEnvironment();
  expect(!!geometry, 'geometry module loads');
  expect(!!physics, 'physics module loads');
  if (!geometry || !physics) return;

  const metrics = { width: 80, height: 120, footInset: 8 };
  const map = { width: 2400, height: 12000 };
  const startPoint = { x: 200, y: 11800 };
  const offset = { x: 0, y: 0 };
  const spawn = physics.getSpawnPosition(map, startPoint, metrics, offset);
  expect(spawn.x === 160 && spawn.y === 11680, 'spawn position computes from start point');

  const platform = {
    x: 0,
    y: 500,
    scale: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    hitboxes: [{ x: 0, y: 0, w: 800, h: 50, locked: false }]
  };
  const dt = 1 / 60;
  const moveSpeed = 220;
  const physicsConfig = { fallSpeed: 600, jumpSpeed: 1000, jumpHeight: 360 };

  // Ground jump should start jump state.
  const p1 = physics.createPlayerState();
  p1.x = 100;
  p1.y = 500 - metrics.height;
  p1.input.jumpQueued = true;
  physics.stepPlayerState({
    playerState: p1,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [platform],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  expect(p1.jumpsUsed === 1, 'ground jump consumes first jump');
  expect(p1.jumpedFromGround === true, 'ground jump marks jumpedFromGround');
  expect(p1.jumping === true, 'ground jump enters jumping state');

  // Air jump should be allowed exactly once after ground jump.
  p1.input.jumpQueued = true;
  physics.stepPlayerState({
    playerState: p1,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [platform],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  expect(p1.jumpsUsed === 2, 'air jump consumes second jump');

  // Falling without prior ground jump should not trigger jump.
  const p2 = physics.createPlayerState();
  p2.x = 100;
  p2.y = 100;
  p2.input.jumpQueued = true;
  physics.stepPlayerState({
    playerState: p2,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  expect(p2.jumpsUsed === 0, 'falling state does not grant air jump');
  expect(p2.jumping === false, 'falling state does not enter jumping');
  expect(p2.vy === physicsConfig.fallSpeed, 'falling state uses fallSpeed');

  // Jump should end when reaching jump target.
  const p3 = physics.createPlayerState();
  p3.x = 100;
  p3.y = 220;
  p3.jumping = true;
  p3.jumpTargetY = 200;
  p3.jumpedFromGround = true;
  p3.jumpsUsed = 1;
  physics.stepPlayerState({
    playerState: p3,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  physics.stepPlayerState({
    playerState: p3,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  expect(p3.y === p3.jumpTargetY, 'jump clamps to jump target height');
  expect(p3.jumping === false, 'jumping ends at target');

  // Landing should reset jump counters.
  const p4 = physics.createPlayerState();
  p4.x = 100;
  p4.y = 370;
  p4.vy = physicsConfig.fallSpeed;
  p4.jumpsUsed = 2;
  p4.jumpedFromGround = true;
  physics.stepPlayerState({
    playerState: p4,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [platform],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  expect(p4.onGround === true, 'landing sets onGround');
  expect(p4.jumpsUsed === 0, 'landing resets jumpsUsed');
  expect(p4.jumpedFromGround === false, 'landing resets jumpedFromGround');

  // Regression: on polygon L-platform top, moving left should not get direction-locked.
  const polygonLPlatform = {
    x: 360,
    y: 520,
    scale: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    hitboxes: [{
      type: 'polygon',
      x: 0,
      y: 0,
      w: 220,
      h: 160,
      rotation: 0,
      points: [
        { x: 0, y: 0 },
        { x: 220, y: 0 },
        { x: 220, y: 160 },
        { x: 160, y: 160 },
        { x: 160, y: 60 },
        { x: 0, y: 60 }
      ]
    }]
  };
  const p5 = physics.createPlayerState();
  p5.x = 430;
  p5.y = polygonLPlatform.y - metrics.height;
  physics.stepPlayerState({
    playerState: p5,
    dt,
    moveSpeed,
    physics: physicsConfig,
    metrics,
    objects: [polygonLPlatform],
    worldPointToLocal: geometry.worldPointToLocal,
    localPointToWorld: geometry.localPointToWorld
  });
  const xStart = p5.x;
  p5.input.right = true;
  for (let i = 0; i < 8; i += 1) {
    physics.stepPlayerState({
      playerState: p5,
      dt,
      moveSpeed,
      physics: physicsConfig,
      metrics,
      objects: [polygonLPlatform],
      worldPointToLocal: geometry.worldPointToLocal,
      localPointToWorld: geometry.localPointToWorld
    });
  }
  p5.input.right = false;
  const xAfterRight = p5.x;
  p5.input.left = true;
  for (let i = 0; i < 8; i += 1) {
    physics.stepPlayerState({
      playerState: p5,
      dt,
      moveSpeed,
      physics: physicsConfig,
      metrics,
      objects: [polygonLPlatform],
      worldPointToLocal: geometry.worldPointToLocal,
      localPointToWorld: geometry.localPointToWorld
    });
  }
  p5.input.left = false;
  expect(xAfterRight > xStart, 'polygon platform allows right movement on top');
  expect(p5.x < xAfterRight, 'polygon platform allows left movement on top');
};

const run = () => {
  console.log('Jumpmap Phase6 validation started');
  targetFiles.forEach(checkSyntax);
  runMapIoChecks();
  runPhysicsChecks();
  console.log(`Validation finished: pass=${passed}, fail=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
};

run();
