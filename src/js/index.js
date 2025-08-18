import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createDesk } from './desk.js';
import { createRoom } from './room.js';
import { setupBlueTint } from './lighting.js';
import { createMonitor } from './monitor.js';
import curve from './camera-movement.js';
import { createHemisphereLight, createSpotLights } from './lighting.js';

const keyboard = new URL('../assets/models/keyboard.glb', import.meta.url).href;
const mouse = new URL('../assets/models/mouse.glb', import.meta.url).href;
const books = new URL('../assets/models/books.glb', import.meta.url).href;
const roundedChair = new URL('../assets/models/rounded_chair.glb', import.meta.url).href;

// Scene configuration.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;

// Add canvas to the correct container.
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

// Room.
const room = createRoom(0, 0, 0);
scene.add(room);

// Desk.
let desk = createDesk(1.29, 0, -2.44);
desk.scale.set(0.9, 0.9, 0.9);
scene.add(desk);

window.doorHandleReady = () => {
    desk = createDesk(1.29, 0, -2.44);
    desk.scale.set(0.9, 0.9, 0.9);
    scene.add(desk);
};

// Monitor on desk.
const monitor = createMonitor(1.12, 0.988, -2.43);
monitor.scale.set(1.15, 1.15, 1.15);
scene.add(monitor);

// Items loader.
const loader = new GLTFLoader();

// Keyboard.
loader.load(
    keyboard,
    gltf => {
        gltf.scene.position.set(1.12, 0.721, -2.095);
        gltf.scene.scale.set(1.25, 1.25, 1.25);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }

            if (child.material) {
                child.material.color.setHex(0xacbac1);
                child.material.needsUpdate = true;
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
        gltf.scene.position.set(1.4, 0.711, -2.095);
        gltf.scene.scale.set(0.04, 0.04, 0.04);
        gltf.scene.rotation.set(0, -1.25, 0);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material) {
                    const newMaterial = new THREE.MeshStandardMaterial({
                        color: 0xacbac1,
                        metalness: 0.1,
                        roughness: 0.8,
                    });
                    newMaterial.needsUpdate = true;
                    child.material = newMaterial;
                }
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
        gltf.scene.position.set(1.75, 0.698, -2.25);
        gltf.scene.scale.set(0.066, 0.066, 0.066);
        gltf.scene.rotation.set(0, 0.5, 0);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material) {
                    child.material.color.setHex(0xacbac1);
                    child.material.needsUpdate = true;
                }
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
        gltf.scene.position.set(1.4, 0, -1.66);
        gltf.scene.scale.set(0.3, 0.3, 0.3);
        gltf.scene.rotation.set(0, -2.5, 0);
        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material) {
                    const newMaterial = new THREE.MeshStandardMaterial({
                        color: 0xacbac1,
                        metalness: 0.1,
                        roughness: 0.8,
                    });
                    newMaterial.needsUpdate = true;
                    child.material = newMaterial;
                }
            }
        });

        scene.add(gltf.scene);
    },
    undefined,
    error => {
        console.error('Error cargando GLB:', error);
    }
);

// Blue tint.
const blueTint = setupBlueTint(renderer);
scene.background = blueTint;

// Hemisphere light.
const hemiLight = createHemisphereLight();
scene.add(hemiLight);

// SpotLights
const { spotLight, spotLight2, target, target2 } = createSpotLights();
scene.add(spotLight);
scene.add(spotLight2);
scene.add(target);
scene.add(target2);

// Scroll tracking.
let targetScrollY = 0;
let smoothScrollY = 0;
const content = document.getElementById('content');
const maxScroll = content.scrollHeight - window.innerHeight;

window.addEventListener('wheel', e => {
    targetScrollY += e.deltaY;
    targetScrollY = Math.max(0, Math.min(targetScrollY, maxScroll));
});

// Mouse tracking.
let mouseX = 0;
let targetMouseX = 0;

window.addEventListener('mousemove', event => {
    targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
});

const progressBar = document.getElementById('scroll-progress');

// Update scroll + mouse.
function updateInputs() {
    // Smooth vertical.
    smoothScrollY += (targetScrollY - smoothScrollY) * 0.1;
    content.style.transform = `translateY(${-smoothScrollY}px)`;

    // Smooth horizontal.
    mouseX += (targetMouseX - mouseX) * 0.1;

    // Progress.
    const progress = (smoothScrollY / maxScroll) * 100;
    progressBar.style.height = `${progress}%`;
}

function updateCameraPosition() {
    const point = Math.min(smoothScrollY / maxScroll, 1);
    const position = curve.getPoint(point);
    const easedPoint = point * point * point;
    let horizontalOffset = 0;
    if (point > 0.1) {
        horizontalOffset = mouseX * 0.1 * easedPoint;
        position.x += horizontalOffset;
    }
    camera.position.copy(position);
    const monitorPosition = new THREE.Vector3(1.12, 0.988 - easedPoint * 0.66, -2.43);
    camera.lookAt(monitorPosition);
}

function animate() {
    requestAnimationFrame(animate);
    updateInputs();
    updateCameraPosition();
    // controls.update(); // Enable free camera movement.
    renderer.render(scene, camera);
}

animate();

// Handle window resize.
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
