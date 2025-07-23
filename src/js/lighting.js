import * as THREE from 'three';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';

export function setupLighting() {
    const lightingGroup = new THREE.Group();

    // Fuente de luz solar (directional light) - comentado para desarrollo
    // const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    // sunLight.position.set(-10, 5, 0); // Posicionada fuera de la habitación, a la izquierda
    // sunLight.castShadow = true;
    // sunLight.shadow.mapSize.width = 2048;
    // sunLight.shadow.mapSize.height = 2048;
    // sunLight.shadow.camera.near = 0.5;
    // sunLight.shadow.camera.far = 50;
    // sunLight.shadow.camera.left = -10;
    // sunLight.shadow.camera.right = 10;
    // sunLight.shadow.camera.top = 10;
    // sunLight.shadow.camera.bottom = -10;
    // lightingGroup.add(sunLight);

    // Luz ambiental para evitar sombras completamente negras - comentado para desarrollo
    // const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    // lightingGroup.add(ambientLight);

    // Helper para visualizar la luz direccional - comentado para desarrollo
    // const sunLightHelper = new THREE.DirectionalLightHelper(sunLight, 2);
    // lightingGroup.add(sunLightHelper);

    // Helper para visualizar el frustum de la sombra - comentado para desarrollo
    // const shadowHelper = new THREE.CameraHelper(sunLight.shadow.camera);
    // lightingGroup.add(shadowHelper);

    return lightingGroup;
}

export function createHorizontalLineLight(
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
    lineLight.lookAt(x, y + 1, z);

    return lineLight;
}

export function createHorizontalLineLightWithHelper(
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    intensity = 1,
    color = 0xffffff
) {
    const lineLight = createHorizontalLineLight(x, y, z, width, height, intensity, color);

    const helper = new RectAreaLightHelper(lineLight);
    lineLight.add(helper);

    const directionLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1),
        ]),
        new THREE.LineBasicMaterial({ color: 0xffff00 })
    );
    lineLight.add(directionLine);

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

export function createVerticalLineLightWithHelper(
    x = 0,
    y = 0,
    z = 0,
    width = 1,
    height = 1,
    intensity = 1,
    color = 0xffffff
) {
    const lineLight = createVerticalLineLight(x, y, z, width, height, intensity, color);

    const helper = new RectAreaLightHelper(lineLight);
    lineLight.add(helper);

    const directionLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1),
        ]),
        new THREE.LineBasicMaterial({ color: 0xffff00 })
    );
    lineLight.add(directionLine);

    return lineLight;
}
