import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createDesk } from './desk.js';
import { createRoom } from './room.js';
import { setupLighting, createLineLightWithHelper } from './lighting.js';
import { createMonitor } from './monitor.js';

// Scene configuration.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// Camera.
camera.position.set(0.52, 1.028, 1 - 2.17 - 0.256);
camera.zoom = 1;

// Controls.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(1.52, 1.028, -2.17 - 0.256);

// Grid.
const gridHelper = new THREE.GridHelper(30);
scene.add(gridHelper);

// Axes helper para ver las líneas guías
const axesHelper = new THREE.AxesHelper(1);
scene.add(axesHelper);

// Room.
const room = createRoom(0, 0, 0);
scene.add(room);

// Desk.
// const desk = createDesk(0, 0, 0);
const desk = createDesk(1.52, 0, -2.17);
scene.add(desk);

// Monitor on desk.
// const monitor = createMonitor(0, 1.028, -0.256);
const monitor = createMonitor(1.52, 1.028, -2.17 - 0.256);
scene.add(monitor);

// Lighting.
// const lighting = setupLighting();
// scene.add(lighting);

// Luz de línea que apunta al monitor
// const lineLight = createLineLightWithHelper(0, 0.5, 0.3, 50, 0xffffff);
// lineLight.lookAt(0, 0, 0); // Apunta directamente al monitor
// scene.add(lineLight);

// Render function.
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize.
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
