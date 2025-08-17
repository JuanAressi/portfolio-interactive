import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createDesk } from './desk.js';
import { createRoom } from './room.js';
import { setupLighting, createLineLightWithHelper } from './lighting.js';
import { createMonitor } from './monitor.js';
import curve from './camera-movement.js';

const keyboard = new URL('../assets/keyboard.glb', import.meta.url).href;
const mouse = new URL('../assets/mouse.glb', import.meta.url).href;
const books = new URL('../assets/books.glb', import.meta.url).href;
const roundedChair = new URL('../assets/rounded_chair.glb', import.meta.url).href;

// Scene configuration.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;

// Agregar el canvas al contenedor correcto
const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);

// Camera.
camera.position.set(0.52, 1.028, 1 - 2.17 - 0.256);
camera.lookAt(1.62, 0.988, -2.43);
camera.zoom = 1;

// Controls.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(1.79, 1.028, -2.17 - 0.256);

// Configuraciones adicionales para los controles
controls.enablePan = true;
controls.enableZoom = true;
controls.enableRotate = true;
controls.panSpeed = 1.0;
controls.zoomSpeed = 1.0;
controls.rotateSpeed = 1.0;
controls.maxDistance = 10;
controls.minDistance = 0.5;

const curvePoints = curve.getPoints(100);
const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
const curveMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
const curveLine = new THREE.Line(curveGeometry, curveMaterial);
scene.add(curveLine);

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
const desk = createDesk(1.79, 0, -2.44);
desk.scale.set(0.9, 0.9, 0.9);
scene.add(desk);

// Monitor on desk.
const monitor = createMonitor(1.62, 0.988, -2.43);
monitor.scale.set(1.15, 1.15, 1.15);
scene.add(monitor);

// Items loader.
const loader = new GLTFLoader();

// Keyboard.
loader.load(
    keyboard,
    gltf => {
        gltf.scene.position.set(1.62, 0.721, -2.095);
        gltf.scene.scale.set(1.25, 1.25, 1.25);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(gltf.scene);
    },
    undefined,
    error => {
        console.error('Error cargando GLB:', error);
    }
);

// Mouse.
loader.load(
    mouse,
    gltf => {
        gltf.scene.position.set(1.9, 0.711, -2.095);
        gltf.scene.scale.set(0.04, 0.04, 0.04);
        gltf.scene.rotation.set(0, -1.25, 0);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(gltf.scene);
    },
    undefined,
    error => {
        console.error('Error cargando GLB:', error);
    }
);

// Books.
loader.load(
    books,
    gltf => {
        gltf.scene.position.set(2.25, 0.698, -2.25);
        gltf.scene.scale.set(0.066, 0.066, 0.066);
        gltf.scene.rotation.set(0, 0.5, 0);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(gltf.scene);
    },
    undefined,
    error => {
        console.error('Error cargando GLB:', error);
    }
);

// Rounded chair.
loader.load(
    roundedChair,
    gltf => {
        gltf.scene.position.set(1.9, 0, -1.66);
        gltf.scene.scale.set(0.3, 0.3, 0.3);
        gltf.scene.rotation.set(0, -2.5, 0);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(gltf.scene);
    },
    undefined,
    error => {
        console.error('Error cargando GLB:', error);
    }
);

// const lighting = setupLighting();
// scene.add(lighting);

// Luz de línea que apunta al monitor
// const lineLight = createLineLightWithHelper(0, 0.5, 0.3, 50, 0xffffff);
// lineLight.lookAt(0, 0, 0); // Apunta directamente al monitor
// scene.add(lineLight);

// Scroll tracking
let targetScrollY = 0;
let smoothScrollY = 0;
const content = document.getElementById('content');
const maxScroll = content.scrollHeight - window.innerHeight;

window.addEventListener('wheel', e => {
    targetScrollY += e.deltaY;
    targetScrollY = Math.max(0, Math.min(targetScrollY, maxScroll));
});

// Mouse tracking
let mouseX = 0;
let targetMouseX = 0;

window.addEventListener('mousemove', event => {
    targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
});

const progressBar = document.getElementById('scroll-progress');

// Actualización de scroll + mouse
function updateInputs() {
    // suavizado vertical
    smoothScrollY += (targetScrollY - smoothScrollY) * 0.1;
    content.style.transform = `translateY(${-smoothScrollY}px)`;

    // suavizado horizontal
    mouseX += (targetMouseX - mouseX) * 0.1;

    // progreso
    const progress = (smoothScrollY / maxScroll) * 100;
    progressBar.style.height = `${progress}%`;
}

function updateCameraPosition() {
    const point = Math.min(smoothScrollY / maxScroll, 1);
    const position = curve.getPoint(point);
    const easedPoint = point * point;

    let horizontalOffset = 0;
    if (point > 0.1) {
        horizontalOffset = mouseX * 0.1 * easedPoint;
        position.x += horizontalOffset;
    }

    camera.position.copy(position);

    const monitorPosition = new THREE.Vector3(1.62, 0.988 - easedPoint * 0.66, -2.43);
    camera.lookAt(monitorPosition);
}

function animate() {
    requestAnimationFrame(animate);
    updateInputs();
    updateCameraPosition();
    renderer.render(scene, camera);
}

animate();

// Handle window resize.
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
