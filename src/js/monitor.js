import * as THREE from 'three';
import { createHorizontalLineLight, createVerticalLineLight } from './lighting.ts';

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
    const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0xa2afb5,
        metalness: 0.2,
        roughness: 0.7,
    });
    const bezelMaterial = new THREE.MeshStandardMaterial({
        color: 0xacbac1,
        metalness: 0.1,
        roughness: 0.8,
        envMapIntensity: 0.2,
    });
    const bezelGroup = new THREE.Group();

    createTopBezel(
        screenWidth,
        screenHeight,
        bezelThickness,
        bezelDepth,
        bezelGroup,
        bezelMaterial
    );
    createBottomBezel(
        screenWidth,
        screenHeight,
        bezelThickness,
        bezelDepth,
        bezelGroup,
        bezelMaterial
    );
    createLeftBezel(
        screenWidth,
        screenHeight,
        bezelThickness,
        bezelDepth,
        bezelGroup,
        bezelMaterial
    );
    createRightBezel(
        screenWidth,
        screenHeight,
        bezelThickness,
        bezelDepth,
        bezelGroup,
        bezelMaterial
    );

    const backPanelGeometry = new THREE.BoxGeometry(
        screenWidth,
        screenHeight - bezelThickness * 2,
        bezelThickness
    );
    const backPanel = new THREE.Mesh(backPanelGeometry, screenMaterial);
    backPanel.position.set(0, -0.035, -bezelDepth / 2 - bezelThickness);
    bezelGroup.add(backPanel);

    // Glass aperture between bezels (bottom chin is thicker → shorter than screenHeight).
    const apertureTop = screenHeight / 2 - 0.04;
    const apertureBottom = -screenHeight / 2 - 0.04 + bezelThickness * 3.5;
    const apertureHeight = apertureTop - apertureBottom;
    const apertureY = (apertureTop + apertureBottom) / 2;
    const screenZ = -bezelDepth / 2 + 0.002;

    const screenGeometry = new THREE.PlaneGeometry(screenWidth, apertureHeight);
    // Dark "powered off" screen; the CSS3D job card fades in over it to simulate power-on.
    const screenMeshMaterial = new THREE.MeshBasicMaterial({
        color: 0x141414,
        toneMapped: false,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMeshMaterial);
    screen.position.set(0, apertureY, screenZ);
    bezelGroup.add(screen);
    bezelGroup.userData.screen = screen;
    bezelGroup.userData.screenSize = { width: screenWidth, height: apertureHeight };

    // Real light source for the power-on glow (intensity ramped 0→N in index.js,
    // in sync with the CSS3D job-card fade) — makes the screen actually illuminate
    // the bezel/desk around it instead of only changing color on its own plane.
    // SpotLight (not PointLight): the monitor sits only centimeters from the room's
    // back wall, so an omnidirectional light bleeds backward/over the bezel onto the
    // wall behind it. Aimed forward (+z, away from the wall, toward the desk/viewer)
    // with a capped `distance` so it can't reach past the desk it's meant to light.
    const glowLight = new THREE.SpotLight(0xf5f5f0, 0, 1.2, Math.PI / 3, 0.5, 2);
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

function createTopBezel(
    screenWidth,
    screenHeight,
    bezelThickness,
    bezelDepth,
    bezelGroup,
    bezelMaterial
) {
    const topBezelGeometry = new THREE.BoxGeometry(
        screenWidth + bezelThickness * 2,
        bezelThickness,
        bezelDepth / 2
    );
    const topBezel = new THREE.Mesh(topBezelGeometry, bezelMaterial);
    topBezel.position.set(0, screenHeight / 2 + bezelThickness / 2 - 0.04, -bezelDepth / 2);
    bezelGroup.add(topBezel);

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
    bezelGroup.add(topLineLight);
}

function createBottomBezel(
    screenWidth,
    screenHeight,
    bezelThickness,
    bezelDepth,
    bezelGroup,
    bezelMaterial
) {
    const bottomBezelGeometry = new THREE.BoxGeometry(
        screenWidth + bezelThickness * 2,
        bezelThickness * 8,
        bezelDepth / 2
    );
    const bottomBezel = new THREE.Mesh(bottomBezelGeometry, bezelMaterial);
    bottomBezel.position.set(0, -screenHeight / 2 - bezelThickness / 2 - 0.04, -bezelDepth / 2);
    bezelGroup.add(bottomBezel);

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
    bezelGroup.add(bottomLineLight);
}

function createLeftBezel(
    screenWidth,
    screenHeight,
    bezelThickness,
    bezelDepth,
    bezelGroup,
    bezelMaterial
) {
    const leftBezelGeometry = new THREE.BoxGeometry(bezelThickness, screenHeight, bezelDepth / 2);
    const leftBezel = new THREE.Mesh(leftBezelGeometry, bezelMaterial);
    leftBezel.position.set(-screenWidth / 2 - bezelThickness / 2, -0.04, -bezelDepth / 2);
    bezelGroup.add(leftBezel);

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
    bezelGroup.add(leftLineLight);
}

function createRightBezel(
    screenWidth,
    screenHeight,
    bezelThickness,
    bezelDepth,
    bezelGroup,
    bezelMaterial
) {
    const rightBezelGeometry = new THREE.BoxGeometry(bezelThickness, screenHeight, bezelDepth / 2);
    const rightBezel = new THREE.Mesh(rightBezelGeometry, bezelMaterial);
    rightBezel.position.set(screenWidth / 2 + bezelThickness / 2, -0.04, -bezelDepth / 2);
    bezelGroup.add(rightBezel);

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
    bezelGroup.add(rightLineLight);
}

function createBase(screenHeight, screenDepth, standWidth, standHeight, bezelThickness) {
    const standMaterial = new THREE.MeshStandardMaterial({
        color: 0xacbac1,
        metalness: 0.3,
        roughness: 0.6,
    });
    const bezelMaterial = new THREE.MeshStandardMaterial({
        color: 0xacbac1,
        metalness: 0.1,
        roughness: 0.9,
    });
    const baseGroup = new THREE.Group();

    const standGeometry = new THREE.BoxGeometry(standWidth, standHeight, bezelThickness * 2);
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.set(0, -screenHeight / 2 - standHeight / 2, -screenDepth * 2.5);
    baseGroup.add(stand);

    const baseGeometry = new THREE.BoxGeometry(0.1, 0.005, 0.025);
    const base = new THREE.Mesh(baseGeometry, bezelMaterial);
    base.position.set(0, -screenHeight / 2 - 0.2 / 2, -screenDepth);
    baseGroup.add(base);

    const verticalBaseGeometry = new THREE.BoxGeometry(0.1, 0.025, 0.005);
    const verticalBase = new THREE.Mesh(verticalBaseGeometry, bezelMaterial);
    verticalBase.position.set(0, -screenHeight / 2 - 0.19 / 2, -0.015);
    baseGroup.add(verticalBase);

    return baseGroup;
}
