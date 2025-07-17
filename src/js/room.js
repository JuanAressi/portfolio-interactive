import * as THREE from "three";

export function createRoom() {
  const roomGroup = new THREE.Group();

  // Dimensiones de la habitación (en metros) - ahora cuadrada
  const roomWidth = 5;
  const roomHeight = 3; // Altura estándar
  const roomDepth = 5; // Ahora igual al ancho para hacerla cuadrada

  // Crear las paredes de la habitación
  const wallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, 0.1);

  // Pared trasera (color gris)
  const backWallMaterial = new THREE.MeshBasicMaterial({
    color: 0xdddddd,
    side: THREE.DoubleSide,
  });
  const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
  backWall.position.z = -roomDepth / 2;
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  // Pared izquierda con ventana (creando geometría personalizada)
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
  topWall.position.y =
    windowY + windowHeight + (roomHeight - windowHeight - windowY) / 2;
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
  leftWallGroup.position.x = -roomWidth / 2;
  leftWallGroup.position.y = -roomHeight / 2; // Alinear con el piso (que está en -roomHeight/2)
  roomGroup.add(leftWallGroup);

  // Piso (color marrón) - ahora con material que responde a la luz
  const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0x8b4513,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = Math.PI / 2;
  floor.position.y = -roomHeight / 2;
  floor.castShadow = true;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  return roomGroup;
}
