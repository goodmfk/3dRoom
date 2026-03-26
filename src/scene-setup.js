import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

export { THREE };

export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe2e8ee);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(10, 9, 10);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.minDistance = 4;
  controls.maxDistance = 80;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.05);
  directionalLight.position.set(8, 16, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 60;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  scene.add(directionalLight);

  const grid = new THREE.GridHelper(60, 120, 0x526171, 0x9aabb8);
  grid.material.opacity = 0.45;
  grid.material.transparent = true;
  scene.add(grid);

  const floorGeometry = new THREE.PlaneGeometry(60, 60);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6f4ef,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  window.addEventListener("resize", resize);
  resize();

  return { scene, renderer, camera, controls, grid, floor };
}

export function frameRoom({ roomRoot, camera, controls }) {
  const box = new THREE.Box3().setFromObject(roomRoot);
  if (box.isEmpty()) {
    controls.target.set(0, 0, 0);
    camera.position.set(10, 9, 10);
    controls.update();
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  roomRoot.position.x -= center.x;
  roomRoot.position.z -= center.z;
  roomRoot.position.y -= box.min.y;

  const centeredBox = new THREE.Box3().setFromObject(roomRoot);
  const size = centeredBox.getSize(new THREE.Vector3());
  const maxSpan = Math.max(size.x, size.z, 4);
  const cameraDistance = maxSpan * 1.25;
  const cameraHeight = Math.max(size.y * 1.6, maxSpan * 0.75);

  camera.position.set(cameraDistance, cameraHeight, cameraDistance);
  controls.target.set(0, size.y * 0.45, 0);
  controls.update();
}
