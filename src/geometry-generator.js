import { THREE } from "./scene-setup.js";

const CM_TO_M = 0.01;
const WALL_THICKNESS_CM = 10;
const WALL_THICKNESS_M = WALL_THICKNESS_CM * CM_TO_M;

const LAYOUT_DEFINITIONS = {
  rectangle: {
    key: "rectangle",
    label: "Rectangle",
    wallCount: 4,
    walls: [
      { label: "Wall 1", direction: "Bottom edge, left to right" },
      { label: "Wall 2", direction: "Right edge, bottom to top" },
      { label: "Wall 3", direction: "Top edge, right to left" },
      { label: "Wall 4", direction: "Left edge, top to bottom" }
    ],
    defaultLengthsCm: [600, 400, 600, 400],
    helpText: "Rectangle requires opposite sides to match: Wall 1 = Wall 3 and Wall 2 = Wall 4."
  },
  "l-shape": {
    key: "l-shape",
    label: "L-shape",
    wallCount: 6,
    walls: [
      { label: "Wall 1", direction: "Bottom outer edge, left to right" },
      { label: "Wall 2", direction: "Right lower edge, bottom to top" },
      { label: "Wall 3", direction: "Inner horizontal notch, right to left" },
      { label: "Wall 4", direction: "Inner vertical notch, bottom to top" },
      { label: "Wall 5", direction: "Top outer edge, right to left" },
      { label: "Wall 6", direction: "Left outer edge, top to bottom" }
    ],
    defaultLengthsCm: [700, 300, 250, 250, 450, 550],
    helpText: "L-shape must close as an orthogonal plan: Wall 1 = Wall 3 + Wall 5 and Wall 6 = Wall 2 + Wall 4."
  },
  "u-shape": {
    key: "u-shape",
    label: "U-shape",
    wallCount: 8,
    walls: [
      { label: "Wall 1", direction: "Bottom outer edge, left to right" },
      { label: "Wall 2", direction: "Right outer edge, bottom to top" },
      { label: "Wall 3", direction: "Top right outer edge, right to left" },
      { label: "Wall 4", direction: "Right inner drop, top to bottom" },
      { label: "Wall 5", direction: "Inner bridge, right to left" },
      { label: "Wall 6", direction: "Left inner rise, bottom to top" },
      { label: "Wall 7", direction: "Top left outer edge, right to left" },
      { label: "Wall 8", direction: "Left outer edge, top to bottom" }
    ],
    defaultLengthsCm: [900, 500, 250, 250, 200, 250, 450, 500],
    helpText: "U-shape must close as an orthogonal plan: Wall 1 = Wall 3 + Wall 5 + Wall 7 and Wall 8 = Wall 2 - Wall 4 + Wall 6."
  }
};

export function getLayoutDefinitions() {
  return Object.values(LAYOUT_DEFINITIONS);
}

export function getLayoutDefinition(layoutKey) {
  const definition = LAYOUT_DEFINITIONS[layoutKey];
  if (!definition) {
    throw new Error("Unsupported layout selected");
  }

  return definition;
}

export function createRoomModel({ layout, wallLengthsCm, ceilingHeightCm }) {
  const definition = getLayoutDefinition(layout);
  validatePositiveNumber(ceilingHeightCm, "Ceiling height");

  if (wallLengthsCm.length !== definition.wallCount) {
    throw new Error(`Expected ${definition.wallCount} wall lengths for ${definition.label}`);
  }

  wallLengthsCm.forEach((length, index) => {
    validatePositiveNumber(length, `Wall ${index + 1} length`);
  });

  const footprintPoints = buildFootprint(layout, wallLengthsCm.map(cmToM));
  const walls = buildWallDescriptors(footprintPoints);
  const group = new THREE.Group();
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd1a076 });
  const outline = createOutline(footprintPoints);

  walls.forEach((wall) => {
    group.add(createWallMesh(wall, cmToM(ceilingHeightCm), wallMaterial));
  });

  group.add(outline);

  return {
    group,
    walls,
    layoutLabel: definition.label,
    perimeterMeters: wallLengthsCm.reduce((sum, length) => sum + cmToM(length), 0),
    wallThicknessCm: WALL_THICKNESS_CM,
    ceilingHeightCm
  };
}

function buildFootprint(layout, lengths) {
  switch (layout) {
    case "rectangle":
      return buildRectangle(lengths);
    case "l-shape":
      return buildLShape(lengths);
    case "u-shape":
      return buildUShape(lengths);
    default:
      throw new Error("Unsupported layout selected");
  }
}

function buildRectangle([w1, w2, w3, w4]) {
  assertClose(w1, w3, "Rectangle needs Wall 1 and Wall 3 to match");
  assertClose(w2, w4, "Rectangle needs Wall 2 and Wall 4 to match");

  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(w1, 0),
    new THREE.Vector2(w1, w2),
    new THREE.Vector2(0, w2)
  ];
}

function buildLShape([w1, w2, w3, w4, w5, w6]) {
  assertClose(w1, w3 + w5, "L-shape needs Wall 1 to equal Wall 3 + Wall 5");
  assertClose(w6, w2 + w4, "L-shape needs Wall 6 to equal Wall 2 + Wall 4");

  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(w1, 0),
    new THREE.Vector2(w1, w2),
    new THREE.Vector2(w5, w2),
    new THREE.Vector2(w5, w6),
    new THREE.Vector2(0, w6)
  ];
}

function buildUShape([w1, w2, w3, w4, w5, w6, w7, w8]) {
  if (w2 <= w4) {
    throw new Error("U-shape requires Wall 2 to be longer than Wall 4");
  }

  assertClose(w1, w3 + w5 + w7, "U-shape needs Wall 1 to equal Wall 3 + Wall 5 + Wall 7");
  assertClose(w8, w2 - w4 + w6, "U-shape needs Wall 8 to equal Wall 2 - Wall 4 + Wall 6");

  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(w1, 0),
    new THREE.Vector2(w1, w2),
    new THREE.Vector2(w5 + w7, w2),
    new THREE.Vector2(w5 + w7, w2 - w4),
    new THREE.Vector2(w7, w2 - w4),
    new THREE.Vector2(w7, w8),
    new THREE.Vector2(0, w8)
  ];
}

function buildWallDescriptors(points) {
  return points.map((start, index) => {
    const end = points[(index + 1) % points.length];
    return {
      start: new THREE.Vector3(start.x, 0, start.y),
      end: new THREE.Vector3(end.x, 0, end.y)
    };
  });
}

function createWallMesh(wall, height, material) {
  const wallVector = wall.end.clone().sub(wall.start);
  const length = wallVector.length();
  const center = wall.start.clone().add(wall.end).multiplyScalar(0.5);
  const angle = Math.atan2(wallVector.z, wallVector.x);
  const geometry = new THREE.BoxGeometry(length, height, WALL_THICKNESS_M);
  const mesh = new THREE.Mesh(geometry, material.clone());

  mesh.position.set(center.x, height / 2, center.z);
  mesh.rotation.y = -angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createOutline(points) {
  const outlinePoints = points.map((point) => new THREE.Vector3(point.x, 0.01, point.y));
  outlinePoints.push(new THREE.Vector3(points[0].x, 0.01, points[0].y));

  const geometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const material = new THREE.LineBasicMaterial({ color: 0x3b4b5a });
  return new THREE.Line(geometry, material);
}

function validatePositiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than 0`);
  }
}

function assertClose(a, b, message) {
  if (Math.abs(a - b) > 0.001) {
    throw new Error(message);
  }
}

function cmToM(value) {
  return value * CM_TO_M;
}
