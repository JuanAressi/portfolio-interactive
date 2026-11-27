import * as THREE from 'three';
import { createHorizontalLineLight, createVerticalLineLight } from './lighting.ts';
import { boxPart, mergeParts, tagMesh } from './geometry-parts.ts';
import { getSceneMaterials } from './scene-materials.ts';

// Faces no camera pose of the inventory sees (`npm run scene:profile -- --inventory-only`, widest
// viewport included). The monitor neither casts nor receives shadows, so nothing but the camera
// looks at them and they can go (the walls and the desk can't: see room.ts).
const TOP_BEZEL_OMIT = ['-z'];
const BOTTOM_BEZEL_OMIT = ['-y', '-z'];
const SIDE_BEZEL_OMIT = ['+y', '-y', '-z'];
const STAND_OMIT = ['+y', '-y', '-z'];
const BASE_OMIT = ['-y', '-z'];

// The monitor is dynamic: its screen lights up and its light moves with it, so none of it is baked.
const MONITOR_TAG = { bakeGroup: 'monitor', isStatic: false };

export function createMonitor(x = 0, y = 0, z = 0) {
    const monitorGroup = new THREE.Group();

    const screenWidth = 0.5313;
    const screenHeight = 0.2989;
    const screenDepth = 0.00125;
    const bezelThickness = 0.005;
    const bezelDepth = 0.02;
    const standHeight = 0.1;
    const standWidth = 0.04;

    const bezel = createBezel(screenWidth, screenHeight, bezelThickness, bezelDepth);
    const base = createBase(screenHeight, screenDepth, standWidth, standHeight, bezelThickness);

    monitorGroup.position.set(x, y, z);
    monitorGroup.add(bezel);
    monitorGroup.add(base);

    monitorGroup.userData.bezelGroup = bezel;
    monitorGroup.userData.screen = bezel.userData.screen;

    return monitorGroup;
}

function createBezel(screenWidth, screenHeight, bezelThickness, bezelDepth) {
    const bezelGroup = new THREE.Group();

    // The four bezel pieces are one mesh: they share a material. The panel that used to sit behind
    // the screen is never in view (the screen plane covers it) and cast no shadow, so it is gone.
    const bezelMesh = new THREE.Mesh(
        mergeParts([
            boxPart({
                size: [screenWidth + bezelThickness * 2, bezelThickness, bezelDepth / 2],
                position: [0, screenHeight / 2 + bezelThickness / 2 - 0.04, -bezelDepth / 2],
                omit: TOP_BEZEL_OMIT,
            }),
            boxPart({
                size: [screenWidth + bezelThickness * 2, bezelThickness * 8, bezelDepth / 2],
                position: [0, -screenHeight / 2 - bezelThickness / 2 - 0.04, -bezelDepth / 2],
                omit: BOTTOM_BEZEL_OMIT,
            }),
            boxPart({
                size: [bezelThickness, screenHeight, bezelDepth / 2],
                position: [-screenWidth / 2 - bezelThickness / 2, -0.04, -bezelDepth / 2],
                omit: SIDE_BEZEL_OMIT,
            }),
            boxPart({
                size: [bezelThickness, screenHeight, bezelDepth / 2],
                position: [screenWidth / 2 + bezelThickness / 2, -0.04, -bezelDepth / 2],
                omit: SIDE_BEZEL_OMIT,
            }),
        ]),
        getSceneMaterials().matte
    );
    bezelGroup.add(tagMesh(bezelMesh, 'monitor-bezel', MONITOR_TAG));

    addTopLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup);
    addBottomLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup);
    addLeftLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup);
    addRightLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup);

    // Glass aperture between bezels (bottom chin is thicker → shorter than screenHeight).
    const apertureTop = screenHeight / 2 - 0.04;
    const apertureBottom = -screenHeight / 2 - 0.04 + bezelThickness * 3.5;
    const apertureHeight = apertureTop - apertureBottom;
    const apertureY = (apertureTop + apertureBottom) / 2;
    const screenZ = -bezelDepth / 2 + 0.002;

    const screenGeometry = new THREE.PlaneGeometry(screenWidth, apertureHeight);
    screenGeometry.deleteAttribute('uv');
    // Dark "powered off" screen; the CSS3D job card fades in over it to simulate power-on.
    const screenMeshMaterial = new THREE.MeshBasicMaterial({
        color: 0x141414,
        toneMapped: false,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMeshMaterial);
    screen.position.set(0, apertureY, screenZ);
    bezelGroup.add(tagMesh(screen, 'monitor-screen', MONITOR_TAG));
    bezelGroup.userData.screen = screen;
    bezelGroup.userData.screenSize = { width: screenWidth, height: apertureHeight };

    // Real light source for the power-on glow (intensity ramped 0→N in scene.js,
    // in sync with the CSS3D job-card fade) — makes the screen actually illuminate
    // the bezel/desk around it instead of only changing color on its own plane.
    // SpotLight (not PointLight): the monitor sits only centimeters from the room's
    // back wall, so an omnidirectional light bleeds backward/over the bezel onto the
    // wall behind it. Aimed forward (+z, away from the wall, toward the desk/viewer)
    // with a capped `distance` so it can't reach past the desk it's meant to light.
    const glowLight = new THREE.SpotLight(0xf5f5f0, 0, 1.2, Math.PI / 3, 0.5, 2);
    glowLight.name = 'monitor-glow-light';
    glowLight.position.set(0, apertureY, screenZ + 0.01);
    const glowTarget = new THREE.Object3D();
    glowTarget.position.set(0, apertureY, screenZ + 0.5);
    bezelGroup.add(glowTarget);
    glowLight.target = glowTarget;
    bezelGroup.add(glowLight);
    bezelGroup.userData.glowLight = glowLight;

    bezelGroup.position.set(0, 0.015, 0.05);

    return bezelGroup;
}

function addTopLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup) {
    const topLineLight = createHorizontalLineLight(
        0,
        screenHeight / 2 - 0.04,
        -bezelDepth / 2,
        screenWidth + 0.75,
        bezelDepth / 2,
        1,
        0xacbac1
    );
    topLineLight.lookAt(0, screenHeight / 2 - 0.04, 0.1);
    topLineLight.name = 'monitor-line-light-top';
    bezelGroup.add(topLineLight);
}

function addBottomLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup) {
    const bottomLineLight = createHorizontalLineLight(
        0,
        -screenHeight / 2 - 0.022,
        -bezelDepth / 2,
        screenWidth + 0.75,
        bezelDepth / 2,
        1,
        0xacbac1
    );
    bottomLineLight.lookAt(0, -screenHeight / 2 - 0.022, 0.1);
    bottomLineLight.name = 'monitor-line-light-bottom';
    bezelGroup.add(bottomLineLight);
}

function addLeftLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup) {
    const leftLineLight = createVerticalLineLight(
        -screenWidth / 2 + 0.0001,
        -0.031,
        -bezelDepth / 2,
        bezelDepth / 2,
        screenHeight + 0.0125,
        1,
        0xacbac1
    );
    leftLineLight.lookAt(-screenWidth / 2 + 0.0001, -0.031, 0.1);
    leftLineLight.name = 'monitor-line-light-left';
    bezelGroup.add(leftLineLight);
}

function addRightLineLight(screenWidth, screenHeight, bezelDepth, bezelGroup) {
    const rightLineLight = createVerticalLineLight(
        screenWidth / 2 - 0.0001,
        -0.031,
        -bezelDepth / 2,
        bezelDepth / 2,
        screenHeight + 0.0125,
        1,
        0xacbac1
    );
    rightLineLight.lookAt(screenWidth / 2 - 0.0001, -0.031, 0.1);
    rightLineLight.name = 'monitor-line-light-right';
    bezelGroup.add(rightLineLight);
}

function createBase(screenHeight, screenDepth, standWidth, standHeight, bezelThickness) {
    const { stand: standMaterial, base: baseMaterial } = getSceneMaterials();
    const baseGroup = new THREE.Group();

    const stand = new THREE.Mesh(
        mergeParts([
            boxPart({
                size: [standWidth, standHeight, bezelThickness * 2],
                position: [0, -screenHeight / 2 - standHeight / 2, -screenDepth * 2.5],
                omit: STAND_OMIT,
            }),
        ]),
        standMaterial
    );
    baseGroup.add(tagMesh(stand, 'monitor-stand', MONITOR_TAG));

    // The foot and the neck share a material, so they are one mesh.
    const foot = new THREE.Mesh(
        mergeParts([
            boxPart({
                size: [0.1, 0.005, 0.025],
                position: [0, -screenHeight / 2 - 0.2 / 2, -screenDepth],
                omit: BASE_OMIT,
            }),
            boxPart({
                size: [0.1, 0.025, 0.005],
                position: [0, -screenHeight / 2 - 0.19 / 2, -0.015],
                omit: BASE_OMIT,
            }),
        ]),
        baseMaterial
    );
    baseGroup.add(tagMesh(foot, 'monitor-base', MONITOR_TAG));

    return baseGroup;
}
