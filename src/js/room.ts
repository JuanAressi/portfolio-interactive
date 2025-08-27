import * as THREE from 'three';

export function createRoom(x = 0, y = 0, z = 0) {
    const roomGroup = new THREE.Group();
    roomGroup.position.set(x, y, z);

    const roomWidth = 5;
    const roomHeight = 3;
    const roomDepth = 5;

    const wallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.075);

    const backWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xacbac1,
        side: THREE.DoubleSide,
    });
    const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
    backWall.position.z = -roomDepth / 2;
    backWall.position.y = roomHeight / 2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    const rightWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xacbac1,
        side: THREE.DoubleSide,
    });

    const windowWidth = 2;
    const windowHeight = 1.2;
    const windowY = 0.85;

    const rightWallGroup = new THREE.Group();

    const topWallGeometry = new THREE.BoxGeometry(
        roomWidth,
        roomHeight - windowHeight - windowY,
        0.075
    );
    const topWall = new THREE.Mesh(topWallGeometry, rightWallMaterial);
    topWall.position.y = windowY + windowHeight + (roomHeight - windowHeight - windowY) / 2;
    topWall.castShadow = true;
    topWall.receiveShadow = true;
    rightWallGroup.add(topWall);

    // Bottom wall.
    const bottomWallGeometry = new THREE.BoxGeometry(roomWidth, windowY, 0.075);
    const bottomWall = new THREE.Mesh(bottomWallGeometry, rightWallMaterial);
    bottomWall.position.y = windowY / 2;
    bottomWall.castShadow = true;
    bottomWall.receiveShadow = true;
    rightWallGroup.add(bottomWall);

    // Right wall.
    const rightPartGeometry = new THREE.BoxGeometry(
        (roomWidth - windowWidth) / 2,
        windowHeight,
        0.075
    );
    const rightPart = new THREE.Mesh(rightPartGeometry, rightWallMaterial);
    rightPart.position.x = (roomWidth + windowWidth) / 2.75;
    rightPart.position.y = windowY + windowHeight / 2;
    rightPart.castShadow = true;
    rightPart.receiveShadow = true;
    rightWallGroup.add(rightPart);

    rightWallGroup.rotation.y = Math.PI / 2;
    rightWallGroup.position.x = roomWidth / 2;
    rightWallGroup.position.y = 0;
    roomGroup.add(rightWallGroup);

    // Left wall.
    const leftWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.075);
    const leftWall = new THREE.Mesh(leftWallGeometry, rightWallMaterial);
    leftWall.position.x = -roomWidth / 2;
    leftWall.position.y = roomHeight / 2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.rotation.y = Math.PI / 2;
    roomGroup.add(leftWall);

    createFloor(roomGroup, roomWidth, roomDepth);

    const windowLight = new THREE.DirectionalLight(0xffffff, 0.33);
    windowLight.position.set(roomWidth / 2 + 1, windowY + windowHeight / 2, -roomDepth / 2 + 0.5);
    windowLight.castShadow = true;
    windowLight.lookAt(0, windowY + windowHeight / 2, 0);
    roomGroup.add(windowLight);

    return roomGroup;
}

function createFloor(roomGroup, roomWidth, roomDepth) {
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xacbac1,
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
