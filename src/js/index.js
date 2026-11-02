import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { addDoorHandles, createDesk } from './desk.js';
import { loadModel } from './load-model.ts';
import { createRoom } from './room.ts';
import { setupBlueTint, createHemisphereLight, createSpotLights } from './lighting.ts';
import { createMonitor } from './monitor.js';
import curve from './camera-movement.js';
import {
    WORK_CARD_MONITOR_SIZE,
    createMonitorJobCard,
    applyMonitorJob,
    setMonitorJobIdle,
} from './work-card.ts';
import { getJobPreview, getLangCode, isDenseJobPreview } from './jobs-data.ts';
const keyboard = new URL('../assets/models/keyboard.glb', import.meta.url).href;
const mouse = new URL('../assets/models/mouse.glb', import.meta.url).href;
const books = new URL('../assets/models/books.glb', import.meta.url).href;
const roundedChair = new URL('../assets/models/rounded_chair.glb', import.meta.url).href;

// Scene configuration.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderers: WebGL + CSS3D (job preview on the monitor).
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.id = 'css3d-root';

const canvasContainer = document.getElementById('canvas-container');
canvasContainer.appendChild(renderer.domElement);
// Sibling of #canvas-container — z-index under #content so intro stays visible.
canvasContainer.insertAdjacentElement('afterend', cssRenderer.domElement);

// Camera.
camera.position.set(0.52, 1.028, 1 - 2.17 - 0.256);
camera.lookAt(1.62, 0.988, -2.43);
camera.zoom = 1;

// Room.
const room = createRoom(0, 0, 0);
scene.add(room);

// Desk.
const desk = createDesk(1.29, 0, -2.44);
desk.scale.set(0.9, 0.9, 0.9);
scene.add(desk);
addDoorHandles(desk);

// Monitor.
const monitor = createMonitor(1.12, 0.988, -2.43);
monitor.scale.set(1.15, 1.15, 1.15);
scene.add(monitor);

let cssWorkCard = null;
let cssObject = null;
let activeJobId = null;
let forceRenderFrames = 0;

// Screen power-on glow: same 350ms window as the CSS3D card's opacity fade
// (.monitor-job-card transition in styles.css), driven off the same show/clear hooks.
const SCREEN_IDLE_COLOR = new THREE.Color(0x141414);
const SCREEN_ACTIVE_COLOR = new THREE.Color(0xf5f5f0);
const GLOW_ACTIVE_INTENSITY = 0.12;
const GLOW_FADE_MS = 350;
let glowAnimFrame = null;

function setScreenGlow(active) {
    const bezelGroup = monitor.userData.bezelGroup;
    const screen = monitor.userData.screen;
    const glowLight = bezelGroup?.userData.glowLight;
    if (!screen || !glowLight) return;

    if (glowAnimFrame !== null) cancelAnimationFrame(glowAnimFrame);

    const startColor = screen.material.color.clone();
    const startIntensity = glowLight.intensity;
    const targetColor = active ? SCREEN_ACTIVE_COLOR : SCREEN_IDLE_COLOR;
    const targetIntensity = active ? GLOW_ACTIVE_INTENSITY : 0;
    const start = performance.now();

    function tick(now) {
        const t = Math.min((now - start) / GLOW_FADE_MS, 1);
        screen.material.color.copy(startColor).lerp(targetColor, t);
        glowLight.intensity = startIntensity + (targetIntensity - startIntensity) * t;
        forceRenderFrames = 2;
        if (t < 1) {
            glowAnimFrame = requestAnimationFrame(tick);
        } else {
            glowAnimFrame = null;
        }
    }
    glowAnimFrame = requestAnimationFrame(tick);
}

function mountCss3dWorkCard() {
    const bezelGroup = monitor.userData.bezelGroup;
    const screen = monitor.userData.screen;
    const screenSize = bezelGroup?.userData.screenSize;
    if (!bezelGroup || !screen || !screenSize || cssObject) return;

    cssWorkCard = createMonitorJobCard();
    cssObject = new CSS3DObject(cssWorkCard);
    cssObject.position.copy(screen.position);
    // Nudge slightly into the chassis so CSS compositing doesn't read as above the glass.
    cssObject.position.z -= 0.004;
    cssObject.scale.set(
        screenSize.width / WORK_CARD_MONITOR_SIZE.width,
        screenSize.height / WORK_CARD_MONITOR_SIZE.height,
        1
    );
    bezelGroup.add(cssObject);
    forceRenderFrames = 2;
}

// hover → dense gate → apply (or idle). Pending employers stay blank.
function showJobOnMonitor(jobId) {
    if (!cssWorkCard || !jobId) return;
    const job = getJobPreview(jobId, getLangCode());
    if (!job || !isDenseJobPreview(job)) {
        clearMonitorJob();
        return;
    }
    activeJobId = jobId;
    applyMonitorJob(cssWorkCard, job);
    setScreenGlow(true);
    forceRenderFrames = 2;
}

function clearMonitorJob() {
    if (!cssWorkCard) return;
    activeJobId = null;
    setMonitorJobIdle(cssWorkCard);
    setScreenGlow(false);
    forceRenderFrames = 2;
}

function bindCompanyHoverPreview() {
    const workSection = document.getElementById('work');
    if (!workSection) return;

    workSection.querySelectorAll('.company-item[data-job-id]').forEach(item => {
        item.setAttribute('tabindex', '0');
        item.addEventListener('mouseenter', () => {
            showJobOnMonitor(item.getAttribute('data-job-id'));
        });
        item.addEventListener('focusin', () => {
            showJobOnMonitor(item.getAttribute('data-job-id'));
        });
    });

    workSection.addEventListener('mouseleave', () => {
        clearMonitorJob();
    });
    workSection.addEventListener('focusout', event => {
        const next = event.relatedTarget;
        if (next instanceof Node && workSection.contains(next)) return;
        clearMonitorJob();
    });
}

mountCss3dWorkCard();
bindCompanyHoverPreview();

// Language switch flicker: without this, re-applying the same active job to an
// already-lit screen is a no-op for setScreenGlow (start === target), so the
// monitor stayed inert while the rest of the page glitched through its new text.
// Briefly dip the glow and bring it back, roughly matching the glitch duration
// in translation.ts, so the monitor reads as reacting to the language change.
const LANG_FLICKER_MS = 220;

window.addEventListener('portfolio:lang', () => {
    if (!activeJobId) return;
    const jobId = activeJobId;
    setScreenGlow(false);
    setTimeout(() => {
        if (activeJobId === jobId) showJobOnMonitor(jobId);
    }, LANG_FLICKER_MS);
});

// Items.
const ITEM_COLOR = 0xacbac1;
const TINTED_ITEM = { tint: ITEM_COLOR };
const MATTE_ITEM = { replace: { color: ITEM_COLOR, metalness: 0.1, roughness: 0.8 } };

function addModel(url, options) {
    loadModel(url, options)
        .then(model => scene.add(model))
        .catch(error => {
            console.error('Error cargando GLB:', error);
        });
}

addModel(keyboard, { position: [1.12, 0.721, -2.095], scale: 1.25, material: TINTED_ITEM });
addModel(mouse, {
    position: [1.4, 0.711, -2.095],
    scale: 0.04,
    rotation: [0, -1.25, 0],
    material: MATTE_ITEM,
});
addModel(books, {
    position: [1.75, 0.698, -2.25],
    scale: 0.066,
    rotation: [0, 0.5, 0],
    material: TINTED_ITEM,
});
addModel(roundedChair, {
    position: [1.4, 0, -1.66],
    scale: 0.3,
    rotation: [0, -2.5, 0],
    material: MATTE_ITEM,
});

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

const NAV_SECTION_IDS = ['home', 'work', 'about', 'contact'];

const sectionNavEntries = NAV_SECTION_IDS.map(id => {
    const section = document.getElementById(id);
    const button = document.querySelector(`[data-nav="${id}"]`);
    return section && button ? { id, section, button } : null;
}).filter(Boolean);
let activeNavSectionId = null;

function setActiveNavSection(id) {
    if (activeNavSectionId === id) return;
    activeNavSectionId = id;

    for (const entry of sectionNavEntries) {
        const isActive = entry.id === id;
        entry.button.classList.toggle('is-active', isActive);
        if (isActive) {
            entry.button.setAttribute('aria-current', 'page');
        } else {
            entry.button.removeAttribute('aria-current');
        }
    }
}

function updateActiveNavSection(scrollPosition) {
    const referenceY = scrollPosition + window.innerHeight * 0.5;
    let activeId = sectionNavEntries[0]?.id;

    for (const entry of sectionNavEntries) {
        if (entry.section.offsetTop <= referenceY) {
            activeId = entry.id;
        }
    }

    if (activeId) setActiveNavSection(activeId);
}

document
    .querySelectorAll(NAV_SECTION_IDS.map(id => `[data-nav="${id}"]`).join(', '))
    .forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-nav');
            if (id) scrollToSection(id);
        });
    });

window.addEventListener(
    'scroll',
    () => {
        targetScrollY = readScrollY();
        updateActiveNavSection(targetScrollY);
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
    setActiveNavSection('home');
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
    updateActiveNavSection(targetScrollY);
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

    const shouldRender =
        idleFrames < IDLE_SKIP_AFTER || forceRenderFrames > 0 || Boolean(activeJobId);
    if (shouldRender) {
        renderer.render(scene, camera);
        if (cssObject) {
            cssRenderer.render(scene, camera);
        }
        if (forceRenderFrames > 0) forceRenderFrames -= 1;
    }
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    updateFakeScroll();
    forceRenderFrames = 2;
});
