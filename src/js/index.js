import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createDesk } from './desk.js';
import { createRoom } from './room.js';
import { setupLighting } from './lighting.js';

// Scene configuration.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Camera.
camera.position.set(0, 3, 1);
camera.lookAt(0, 0, 0);

// Controls.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Grid.
const gridHelper = new THREE.GridHelper(30);
scene.add(gridHelper);

// Room.
// const room = createRoom();
// scene.add(room);

// Desk.
const desk = createDesk(0, 0, 0);
scene.add(desk);

// Lighting.
const lighting = setupLighting();
scene.add(lighting);

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
