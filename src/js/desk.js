import * as THREE from 'three';

export function createDesk(x = 0, y = 0, z = 0) {
    const deskGroup = new THREE.Group();

    // Desk material.
    const deskMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });

    // Dimensions of the drawer.
    const cajoneraWidth = 0.4;
    const cajoneraHeight = 0.75;
    const cajoneraDepth = 0.5;
    const cajoneraThickness = 0.02;

    // Distance between drawers.
    const cajoneraSpacing = 1.4;

    // Edge overhang.
    const edgeOverhang = 0.02;

    // Calculate the dimensions of the desk top.
    const deskTopWidth = cajoneraWidth + cajoneraSpacing + 2 * edgeOverhang;
    const deskTopDepth = cajoneraDepth + 2 * edgeOverhang;

    // Function to create a drawer.
    function createCajonera(position) {
        const cajoneraGroup = new THREE.Group();

        // Left wall.
        const leftWallGeometry = new THREE.BoxGeometry(
            cajoneraThickness,
            cajoneraHeight,
            cajoneraDepth
        );
        const leftWall = new THREE.Mesh(leftWallGeometry, deskMaterial);
        leftWall.position.set(-cajoneraWidth / 2 + cajoneraThickness / 2, cajoneraHeight / 2, 0);
        cajoneraGroup.add(leftWall);

        // Right wall.
        const rightWallGeometry = new THREE.BoxGeometry(
            cajoneraThickness,
            cajoneraHeight,
            cajoneraDepth
        );
        const rightWall = new THREE.Mesh(rightWallGeometry, deskMaterial);
        rightWall.position.set(cajoneraWidth / 2 - cajoneraThickness / 2, cajoneraHeight / 2, 0);
        cajoneraGroup.add(rightWall);

        // Front door.
        const doorMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const frontDoorGeometry = new THREE.BoxGeometry(
            cajoneraWidth - edgeOverhang * 2,
            cajoneraHeight - 0.02 - edgeOverhang * 2,
            cajoneraThickness
        );
        const frontDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
        frontDoor.position.set(
            0,
            (cajoneraHeight + 0.02) / 2,
            cajoneraDepth / 2 - cajoneraThickness / 2
        );
        cajoneraGroup.add(frontDoor);

        // Back wall.
        const backWallGeometry = new THREE.BoxGeometry(
            cajoneraWidth,
            cajoneraHeight,
            cajoneraThickness
        );
        const backWall = new THREE.Mesh(backWallGeometry, deskMaterial);
        backWall.position.set(0, cajoneraHeight / 2, -cajoneraDepth / 2 + cajoneraThickness / 2);
        cajoneraGroup.add(backWall);

        // Floor of the drawer.
        const floorGeometry = new THREE.BoxGeometry(
            cajoneraWidth,
            cajoneraThickness,
            cajoneraDepth
        );
        const floor = new THREE.Mesh(floorGeometry, deskMaterial);
        floor.position.set(0, cajoneraThickness / 2 + 0.02, 0);
        cajoneraGroup.add(floor);

        // Position the drawer.
        cajoneraGroup.position.copy(position);

        return cajoneraGroup;
    }

    // Create left drawer.
    const leftCajonera = createCajonera(new THREE.Vector3(x - cajoneraSpacing / 2, y, z));
    deskGroup.add(leftCajonera);

    // Create right drawer.
    const rightCajonera = createCajonera(new THREE.Vector3(x + cajoneraSpacing / 2, y, z));
    deskGroup.add(rightCajonera);

    // Create desk top.
    const deskTopGeometry = new THREE.BoxGeometry(deskTopWidth, 0.05, deskTopDepth);
    const deskTop = new THREE.Mesh(
        deskTopGeometry,
        new THREE.MeshBasicMaterial({ color: 0xcccccc })
    );
    deskTop.position.set(x, cajoneraHeight, z);
    deskGroup.add(deskTop);

    return deskGroup;
}
