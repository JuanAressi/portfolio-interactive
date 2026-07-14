import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { createDesk } from './desk.js';
import { createRoom } from './room.ts';
import { setupBlueTint, createHemisphereLight, createSpotLights } from './lighting.ts';
import { createMonitor } from './monitor.js';
import curve from './camera-movement.js';

const keyboard = new URL('../assets/models/keyboard.glb', import.meta.url).href;
const mouse = new URL('../assets/models/mouse.glb', import.meta.url).href;
const books = new URL('../assets/models/books.glb', import.meta.url).href;
const roundedChair = new URL('../assets/models/rounded_chair.glb', import.meta.url).href;

// Scene configuration.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderers: WebGL (para geometría) + CSS3D (para HTML en 3D).
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.physicallyCorrectLights = true;

// const cssRenderer = new CSS3DRenderer();
// cssRenderer.setSize(window.innerWidth, window.innerHeight);
// cssRenderer.domElement.style.position = 'absolute';
// cssRenderer.domElement.style.top = 0;

const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);
// canvasContainer.appendChild(cssRenderer.domElement);

// Camera.
camera.position.set(0.52, 1.028, 1 - 2.17 - 0.256);
camera.lookAt(1.62, 0.988, -2.43);
camera.zoom = 1;

// Controls (disabled — scroll is native FakeScroll; keep object for optional debug).
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
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

// Monitor.
const monitor = createMonitor(1.12, 0.988, -2.43);
monitor.scale.set(1.15, 1.15, 1.15);
scene.add(monitor);

// // Monitor (pantalla HTML dentro del espacio 3D).
// const monitorContent = document.createElement('div');

// // tamaño en píxeles del div (alta resolución para nitidez)
// const divWidth = 2048 * 0.75;
// const divHeight = 1152 * 0.75;

// monitorContent.style.width = `${divWidth}px`;
// monitorContent.style.height = `${divHeight}px`;
// monitorContent.style.background = 'black';
// monitorContent.style.color = 'white';
// monitorContent.style.display = 'flex';
// monitorContent.style.alignItems = 'center';
// monitorContent.style.justifyContent = 'center';
// monitorContent.innerHTML = '<h2>Contenido HTML libre</h2>';

// const cssObject = new CSS3DObject(monitorContent);

// // posición: exactamente igual al plano negro definido en monitor.js
// cssObject.position.set(
//     1.12, // X = centro del monitor
//     0.8, // Y = centro pantalla (-0.04)
//     -2.43 + 0.011 // Z = mismo offset que el plane (0.011)
//     // -2.7 // Z = mismo offset que el plane (0.011)
// );

// // escala calculada para encajar el div dentro del plano (0.5313 x 0.2989)
// const planeWidth = 0.5313;
// const planeHeight = 0.2989;
// const scaleX = planeWidth / divWidth;
// const scaleY = planeHeight / divHeight;
// cssObject.scale.set(scaleX, scaleY, 1);

// scene.add(cssObject);

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

// Scroll tracking — Guillaume FakeScroll method:
// native document scroll → lerp → content translateY + camera progress.
let targetScrollY = 0;
let smoothScrollY = 0;
const content = document.getElementById('content');
const fakeScroll = document.querySelector('.FakeScroll');
const scrollWrapper = document.getElementById('scroll-wrapper');
const progressBar = document.getElementById('scroll-progress');
const lookAtTarget = new THREE.Vector3(1.12, 0.988, -2.43);

let maxScroll = 0;
let useNativeLayout = false;
let idleFrames = 0;
const IDLE_SKIP_AFTER = 8;

function isNativeLayout() {
    return window.innerWidth < 768 || window.innerHeight < 600;
}

function updateFakeScroll() {
    useNativeLayout = isNativeLayout();
    if (scrollWrapper) {
        scrollWrapper.style.position = useNativeLayout ? 'relative' : 'fixed';
    }
    if (useNativeLayout) {
        if (content) content.style.transform = '';
        if (fakeScroll) fakeScroll.style.height = '0px';
        maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        return;
    }

    if (fakeScroll && content) {
        fakeScroll.style.height = `${content.offsetHeight}px`;
    }
    maxScroll = Math.max(0, (fakeScroll?.offsetHeight || 0) - window.innerHeight);
}

function readScrollY() {
    return document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function scrollToSection(id) {
    const section = document.getElementById(id);
    if (!section) return;
    updateFakeScroll();
    const top = useNativeLayout
        ? section.getBoundingClientRect().top + readScrollY()
        : section.offsetTop;
    window.scrollTo({ top: Math.max(0, Math.min(top, maxScroll || top)), behavior: 'smooth' });
}

document.querySelectorAll('[data-nav="work"], [data-nav="about"]').forEach(button => {
    button.addEventListener('click', () => {
        const id = button.getAttribute('data-nav');
        if (id) scrollToSection(id);
    });
});

window.addEventListener(
    'scroll',
    () => {
        targetScrollY = readScrollY();
    },
    { passive: true }
);

// Mouse tracking.
let mouseX = 0;
let targetMouseX = 0;

window.addEventListener('mousemove', event => {
    targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
});

updateFakeScroll();

// Always start at top after reload (disable browser scroll restoration).
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

function resetScrollToTop() {
    window.scrollTo(0, 0);
    targetScrollY = 0;
    smoothScrollY = 0;
    if (!useNativeLayout && content) {
        content.style.transform = 'translateY(0px)';
    }
    if (progressBar) {
        progressBar.style.height = '0%';
    }
}

resetScrollToTop();
window.addEventListener('pageshow', event => {
    // bfcache / back-forward can restore scroll — force top again.
    if (event.persisted) resetScrollToTop();
});

// Update scroll + mouse (Guillaume uses ~0.1 lerp on 60fps ticker).
function updateInputs() {
    targetScrollY = readScrollY();
    smoothScrollY += (targetScrollY - smoothScrollY) * 0.16;

    if (!useNativeLayout && content) {
        content.style.transform = `translateY(${-smoothScrollY}px)`;
    }

    mouseX += (targetMouseX - mouseX) * 0.1;

    if (progressBar) {
        const progress = maxScroll > 0 ? (smoothScrollY / maxScroll) * 100 : 0;
        progressBar.style.height = `${progress}%`;
    }
}

function updateCameraPosition() {
    const point = Math.min(smoothScrollY / Math.max(maxScroll, 1), 1);
    const position = curve.getPoint(point);
    // Cubic ease — keeps lookAt near the monitor through Work (matches live).
    const easedPoint = point * point * point;
    if (point > 0.1) {
        position.x += mouseX * 0.35 * easedPoint;
    }
    camera.position.copy(position);
    lookAtTarget.set(1.12, 0.988 - easedPoint * 0.66, -2.43);
    camera.lookAt(lookAtTarget);
}

function animate() {
    requestAnimationFrame(animate);
    updateInputs();
    updateCameraPosition();

    const scrollDelta = Math.abs(targetScrollY - smoothScrollY);
    const mouseDelta = Math.abs(targetMouseX - mouseX);
    const isIdle = scrollDelta < 0.05 && mouseDelta < 0.001;

    if (isIdle) {
        idleFrames += 1;
    } else {
        idleFrames = 0;
    }

    if (idleFrames < IDLE_SKIP_AFTER) {
        renderer.render(scene, camera);
    }
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateFakeScroll();
    // cssRenderer.setSize(window.innerWidth, window.innerHeight);
});
