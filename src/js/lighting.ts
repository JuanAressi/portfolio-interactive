import * as THREE from 'three';

export function createHorizontalLineLight(
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    intensity = 1,
    color = 0xffffff
) {
    const lineLight = new THREE.RectAreaLight(
        color as THREE.ColorRepresentation,
        intensity,
        width,
        height
    );
    lineLight.position.set(x, y, z);
    lineLight.lookAt(x, y + 1, z);

    return lineLight;
}

export function createVerticalLineLight(
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    intensity = 1,
    color = 0xffffff
) {
    const lineLight = new THREE.RectAreaLight(color, intensity, width, height);
    lineLight.position.set(x, y, z);
    lineLight.lookAt(x + 1, y, z);

    return lineLight;
}

export function setupBlueTint(renderer: any) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const blueTint = new THREE.Color(0x4a6fa5);
    blueTint.multiplyScalar(0.1);

    return blueTint;
}

export function createHemisphereLight() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
    hemiLight.position.set(0, 5, 0);
    return hemiLight;
}

export function createSpotLights() {
    // Principal spotlight.
    const spotLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6, 0.3, 2);
    spotLight.position.set(1.75, 1.5, 0);
    spotLight.castShadow = true;

    const target = new THREE.Object3D();
    target.position.set(-1, -3, -12.5);
    spotLight.target = target;

    // Secondary spotlight-
    const spotLight2 = new THREE.SpotLight(0xa5804a, 2, 100, Math.PI / 6, 0.3, 2);
    spotLight2.position.set(-2.66, 0.5, -1);
    spotLight2.castShadow = true;

    const target2 = new THREE.Object3D();
    target2.position.set(5, 1, -2);
    spotLight2.target = target2;

    return { spotLight, spotLight2, target, target2 };
}
