import * as THREE from 'three';

export function createRoom(x = 0, y = 0, z = 0) {
    const roomGroup = new THREE.Group();
    roomGroup.position.set(x, y, z);

    const roomWidth = 5;
    const roomHeight = 3;
    const roomDepth = 5;

    const wallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.1);

    const backWallMaterial = new THREE.MeshBasicMaterial({
        color: 0xdddddd,
        side: THREE.DoubleSide,
    });
    const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
    backWall.position.z = -roomDepth / 2;
    backWall.position.y = roomHeight / 2; // Posicionar la pared trasera desde el piso
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    const leftWallMaterial = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
    });

    // Crear pared izquierda con agujero usando geometría personalizada
    const windowWidth = 2; // Ventana de 1.2m de ancho
    const windowHeight = 1.2; // Ventana de 80cm de alto
    const windowY = 1.0; // Posición Y de la ventana (1m del piso)

    // Crear la pared izquierda como un grupo con cuatro partes
    const leftWallGroup = new THREE.Group();

    // Parte superior de la pared
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

    // Piso (color marrón) - ahora con material que responde a la luz
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b4513,
        side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0; // El piso ahora está en la posición Y especificada
    floor.castShadow = true;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    return roomGroup;
}
