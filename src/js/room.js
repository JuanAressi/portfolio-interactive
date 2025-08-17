import * as THREE from 'three';
import { createHorizontalLineLightWithHelper } from './lighting.js';
const floorImage = new URL('../assets/diagonal_parquet.jpg', import.meta.url).href;
const wallImage = new URL('../assets/wall.jpg', import.meta.url).href;

export function createRoom(x = 0, y = 0, z = 0) {
    const roomGroup = new THREE.Group();
    roomGroup.position.set(x, y, z);

    const roomWidth = 5;
    const roomHeight = 3;
    const roomDepth = 5;

    const wallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.1);
    const wallTexture = new THREE.TextureLoader().load(wallImage);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 2);
    wallTexture.rotation = Math.PI / 2.9;
    wallTexture.center.set(0.5, 0.5);

    const backWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        map: wallTexture,
        side: THREE.DoubleSide,
    });
    const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
    backWall.position.z = -roomDepth / 2;
    backWall.position.y = roomHeight / 2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    const leftWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        map: wallTexture,
        side: THREE.DoubleSide,
    });

    const windowWidth = 2;
    const windowHeight = 1.2;
    const windowY = 1.0;

    const leftWallGroup = new THREE.Group();

    const topWallGeometry = new THREE.BoxGeometry(
        roomWidth,
        roomHeight - windowHeight - windowY,
        0.1
    );
    const topWall = new THREE.Mesh(topWallGeometry, leftWallMaterial);
    topWall.position.y = windowY + windowHeight + (roomHeight - windowHeight - windowY) / 2;
    topWall.castShadow = true;
    topWall.receiveShadow = true;
    leftWallGroup.add(topWall);

    // Parte inferior de la pared
    const bottomWallGeometry = new THREE.BoxGeometry(roomWidth, windowY, 0.1);
    const bottomWall = new THREE.Mesh(bottomWallGeometry, leftWallMaterial);
    bottomWall.position.y = windowY / 2;
    bottomWall.castShadow = true;
    bottomWall.receiveShadow = true;
    leftWallGroup.add(bottomWall);

    // Parte izquierda de la pared
    const leftPartGeometry = new THREE.BoxGeometry(
        (roomWidth - windowWidth) / 2,
        windowHeight,
        0.1
    );
    const leftPart = new THREE.Mesh(leftPartGeometry, leftWallMaterial);
    leftPart.position.x = -(roomWidth + windowWidth) / 4;
    leftPart.position.y = windowY + windowHeight / 2;
    leftPart.castShadow = true;
    leftPart.receiveShadow = true;
    leftWallGroup.add(leftPart);

    // Parte derecha de la pared
    const rightPartGeometry = new THREE.BoxGeometry(
        (roomWidth - windowWidth) / 2,
        windowHeight,
        0.1
    );
    const rightPart = new THREE.Mesh(rightPartGeometry, leftWallMaterial);
    rightPart.position.x = (roomWidth + windowWidth) / 4;
    rightPart.position.y = windowY + windowHeight / 2;
    rightPart.castShadow = true;
    rightPart.receiveShadow = true;
    leftWallGroup.add(rightPart);

    leftWallGroup.rotation.y = Math.PI / 2;
    leftWallGroup.position.x = roomWidth / 2; // Mover la pared izquierda hacia la derecha
    leftWallGroup.position.y = 0; // Alinear con el piso
    roomGroup.add(leftWallGroup);

    createFloor(roomGroup, roomWidth, roomDepth);

    // Create directional light instead of line light
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-5, 5, 5);
    light.castShadow = true;
    // light.shadow.mapSize.width = 2048;
    // light.shadow.mapSize.height = 2048;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    // light.shadow.camera.near = 0.5;
    // light.shadow.camera.far = 50;
    // light.shadow.camera.left = -10;
    // light.shadow.camera.right = 10;
    // light.shadow.camera.top = 10;
    // light.shadow.camera.bottom = -10;
    light.lookAt(0, 0, 0);
    roomGroup.add(light);

    // // Agregar luz direccional solo para sombras
    // const shadowLight = new THREE.DirectionalLight(0xffffff, 1);
    // shadowLight.position.set(-5, 8, 5);
    // shadowLight.castShadow = true;
    // shadowLight.shadow.mapSize.width = 1024;
    // shadowLight.shadow.mapSize.height = 1024;
    // shadowLight.shadow.camera.near = 0.5;
    // shadowLight.shadow.camera.far = 50;
    // shadowLight.shadow.camera.left = -10;
    // shadowLight.shadow.camera.right = 10;
    // shadowLight.shadow.camera.top = 10;
    // shadowLight.shadow.camera.bottom = -10;
    // roomGroup.add(shadowLight);

    // const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    // roomGroup.add(ambientLight);

    return roomGroup;
}

function createFloor(roomGroup, roomWidth, roomDepth) {
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load(floorImage);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(2, 2);
    floorTexture.rotation = Math.PI / 2.9;
    floorTexture.center.set(0.5, 0.5);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        map: floorTexture,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    floor.castShadow = true;
    floor.receiveShadow = true;
    roomGroup.add(floor);
}
