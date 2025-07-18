import * as THREE from 'three';

export function createMonitor(x = 0, y = 0, z = 0) {
    const monitorGroup = new THREE.Group();

    const screenWidth = 0.5313;
    const screenHeight = 0.2989;
    const screenDepth = 0.00125;
    const bezelThickness = 0.005;
    const bezelDepth = 0.02;
    const standHeight = 0.1;
    const standWidth = 0.04;

    const bezel = createBezel(screenWidth, screenHeight, screenDepth, bezelThickness, bezelDepth);
    const screen = createScreen(screenWidth, screenHeight, screenDepth);
    const base = createBase(
        screenWidth,
        screenHeight,
        screenDepth,
        standWidth,
        standHeight,
        bezelThickness
    );

    // Position the monitor
    monitorGroup.position.set(x, y, z);

    monitorGroup.add(bezel);
    monitorGroup.add(screen);
    monitorGroup.add(base);

    return monitorGroup;
}

function createScreen(screenWidth, screenHeight, screenDepth) {
    // Screen
    // const screenGeometry = new THREE.BoxGeometry(screenWidth, screenHeight, screenDepth);
    // const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    // screen.position.set(0, -0.04, 0);
    // monitorGroup.add(screen);
}

function createBezel(screenWidth, screenHeight, screenDepth, bezelThickness, bezelDepth) {
    const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const bezelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const bezelGroup = new THREE.Group();

    // Top bezel frame.
    const topBezelGeometry = new THREE.BoxGeometry(
        screenWidth + bezelThickness * 2,
        bezelThickness,
        bezelDepth / 2
    );
    const topBezel = new THREE.Mesh(topBezelGeometry, bezelMaterial);
    topBezel.position.set(0, screenHeight / 2 + bezelThickness / 2 - 0.04, -bezelDepth / 2);
    bezelGroup.add(topBezel);

    // Bottom bezel frame.
    const bottomBezelGeometry = new THREE.BoxGeometry(
        screenWidth + bezelThickness * 2,
        bezelThickness * 8,
        bezelDepth / 2
    );
    const bottomBezel = new THREE.Mesh(bottomBezelGeometry, bezelMaterial);
    bottomBezel.position.set(0, -screenHeight / 2 - bezelThickness / 2 - 0.04, -bezelDepth / 2);
    bezelGroup.add(bottomBezel);

    // Left bezel frame.
    const leftBezelGeometry = new THREE.BoxGeometry(bezelThickness, screenHeight, bezelDepth / 2);
    const leftBezel = new THREE.Mesh(leftBezelGeometry, bezelMaterial);
    leftBezel.position.set(-screenWidth / 2 - bezelThickness / 2, -0.04, -bezelDepth / 2);
    bezelGroup.add(leftBezel);

    // Right bezel frame.
    const rightBezelGeometry = new THREE.BoxGeometry(bezelThickness, screenHeight, bezelDepth / 2);
    const rightBezel = new THREE.Mesh(rightBezelGeometry, bezelMaterial);
    rightBezel.position.set(screenWidth / 2 + bezelThickness / 2, -0.04, -bezelDepth / 2);
    bezelGroup.add(rightBezel);

    // Back panel.
    const backPanelGeometry = new THREE.BoxGeometry(
        screenWidth,
        screenHeight - bezelThickness * 2,
        bezelThickness
    );
    const backPanel = new THREE.Mesh(backPanelGeometry, screenMaterial);
    backPanel.position.set(0, -0.035, -bezelDepth / 2 - bezelThickness);
    bezelGroup.add(backPanel);
    bezelGroup.position.set(0, 0.015, 0.05);

    return bezelGroup;
}

function createBase(
    screenWidth,
    screenHeight,
    screenDepth,
    standWidth,
    standHeight,
    bezelThickness
) {
    const standMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const bezelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const baseGroup = new THREE.Group();

    // Stand.
    const standGeometry = new THREE.BoxGeometry(standWidth, standHeight, bezelThickness * 2);
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.set(0, -screenHeight / 2 - standHeight / 2, -screenDepth * 2.5);
    baseGroup.add(stand);

    // Base.
    const baseGeometry = new THREE.BoxGeometry(0.1, 0.005, 0.025);
    const base = new THREE.Mesh(baseGeometry, bezelMaterial);
    base.position.set(0, -screenHeight / 2 - 0.2 / 2, -screenDepth);
    baseGroup.add(base);

    const verticalBaseGeometry = new THREE.BoxGeometry(0.1, 0.025, 0.005);
    const verticalBase = new THREE.Mesh(verticalBaseGeometry, bezelMaterial);
    verticalBase.position.set(0, -screenHeight / 2 - 0.19 / 2, -0.02);
    baseGroup.add(verticalBase);

    return baseGroup;
}
