import { createScene, frameRoom, THREE } from "./scene-setup.js";
import { createRoomModel, getLayoutDefinition } from "./geometry-generator.js";
import { createUI } from "./ui.js";

const canvas = document.getElementById("sceneCanvas");
const status = document.getElementById("status");
const stats = document.getElementById("stats");

const { scene, renderer, camera, controls } = createScene(canvas);
const roomRoot = new THREE.Group();
scene.add(roomRoot);

const ui = createUI({
  onGenerate: handleGenerate
});

renderStats();
generateInitialRoom();

function generateInitialRoom() {
  const initialLayout = getLayoutDefinition(ui.getValues().layout);
  setStatus(`Ready: ${initialLayout.label}`);
  handleGenerate(ui.getValues());
}

function handleGenerate(formValues) {
  try {
    clearRoom();
    const roomModel = createRoomModel(formValues);
    roomRoot.add(roomModel.group);
    frameRoom({ roomRoot, camera, controls });
    renderStats(roomModel);
    setStatus(`Generated ${roomModel.layoutLabel} room with ${roomModel.walls.length} walls`);
  } catch (error) {
    renderStats();
    setStatus(error.message);
  }
}

function clearRoom() {
  while (roomRoot.children.length > 0) {
    const child = roomRoot.children[0];
    roomRoot.remove(child);
    disposeObject(child);
  }

  roomRoot.position.set(0, 0, 0);
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
    } else if (child.material) {
      child.material.dispose();
    }
  });
}

function setStatus(message) {
  status.textContent = message;
}

function renderStats(roomModel = null) {
  if (!roomModel) {
    stats.innerHTML = [
      "Walls: -",
      "Perimeter: -",
      "Wall thickness: 10 cm",
      "Ceiling height: -"
    ].join("<br>");
    return;
  }

  stats.innerHTML = [
    `Walls: ${roomModel.walls.length}`,
    `Perimeter: ${roomModel.perimeterMeters.toFixed(2)} m`,
    `Wall thickness: ${roomModel.wallThicknessCm} cm`,
    `Ceiling height: ${roomModel.ceilingHeightCm} cm`
  ].join("<br>");
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
