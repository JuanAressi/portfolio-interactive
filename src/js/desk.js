import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const doorHandle = new URL('../assets/models/door_handle.glb', import.meta.url).href;

// Door handle.
let doorHandleModel = null;
let isLoading = false;
let isLoaded = false;

function loadDoorHandle() {
    if (isLoading || isLoaded) return;

    isLoading = true;

    const loader = new GLTFLoader();
    loader.load(
        doorHandle,
        gltf => {
            doorHandleModel = gltf.scene;
            isLoaded = true;
            isLoading = false;

            // Notify that the model is ready.
            if (window.doorHandleReady) {
                window.doorHandleReady();
            }
        },
        error => {
            console.error('Error cargando door handle:', error);
            isLoading = false;
        }
    );
}

function createDoorHandleInstance(x, y, z, rotationX = 0, rotationY = 0, rotationZ = 0) {
    if (doorHandleModel) {
        const instance = doorHandleModel.clone();
        instance.position.set(x, y, z);
        instance.scale.set(0.05, 0.05, 0.05);
        instance.rotation.set(rotationX, rotationY, rotationZ);

        instance.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material) {
                    const newMaterial = new THREE.MeshStandardMaterial({
                        color: 0xacbac1,
                        metalness: 0.1,
                        roughness: 0.8,
                    });
                    newMaterial.needsUpdate = true;
                    child.material = newMaterial;
                }
            }
        });

        return instance;
    }

    return null;
}

export function createDesk(x = 0, y = 0, z = 0) {
    // Load door handle if not loaded.
    if (!isLoaded && !isLoading) {
        loadDoorHandle();
    }

    const deskGroup = new THREE.Group();

    // Desk material.
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0xacbac1 });

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
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        cajoneraGroup.add(leftWall);

        // Right wall.
        const rightWallGeometry = new THREE.BoxGeometry(
            cajoneraThickness,
            cajoneraHeight,
            cajoneraDepth
        );
        const rightWall = new THREE.Mesh(rightWallGeometry, deskMaterial);
        rightWall.position.set(cajoneraWidth / 2 - cajoneraThickness / 2, cajoneraHeight / 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        cajoneraGroup.add(rightWall);

        // Back wall.
        const backWallGeometry = new THREE.BoxGeometry(
            cajoneraWidth,
            cajoneraHeight,
            cajoneraThickness
        );
        const backWall = new THREE.Mesh(backWallGeometry, deskMaterial);
        backWall.position.set(0, cajoneraHeight / 2, -cajoneraDepth / 2 + cajoneraThickness / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        cajoneraGroup.add(backWall);

        // Floor of the drawer.
        const dividerMaterial = new THREE.MeshStandardMaterial({ color: 0xacbac1 });
        const floorGeometry = new THREE.BoxGeometry(
            cajoneraWidth - edgeOverhang * 2,
            cajoneraThickness,
            cajoneraDepth
        );
        const floor = new THREE.Mesh(floorGeometry, dividerMaterial);
        floor.position.set(0, cajoneraThickness / 2 + 0.02, 0);
        floor.castShadow = true;
        floor.receiveShadow = true;
        cajoneraGroup.add(floor);

        // Upper door (1/3 height).
        const upperDoorHeight = cajoneraHeight / 3;
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xacbac1 });
        const upperDoorGeometry = new THREE.BoxGeometry(
            cajoneraWidth - edgeOverhang * 2.5,
            upperDoorHeight - edgeOverhang * 2,
            cajoneraThickness
        );
        const upperDoor = new THREE.Mesh(upperDoorGeometry, doorMaterial);
        upperDoor.position.set(
            0,
            cajoneraHeight - (upperDoorHeight + edgeOverhang / 2) / 2,
            cajoneraDepth / 2 - cajoneraThickness / 2
        );
        upperDoor.castShadow = true;
        upperDoor.receiveShadow = true;
        cajoneraGroup.add(upperDoor);

        // Lower door (2/3 height).
        const lowerDoorHeight = cajoneraHeight * (2 / 3);
        const lowerDoorGeometry = new THREE.BoxGeometry(
            cajoneraWidth - edgeOverhang * 2.5,
            lowerDoorHeight - edgeOverhang * 3,
            cajoneraThickness
        );
        const lowerDoor = new THREE.Mesh(lowerDoorGeometry, doorMaterial);
        lowerDoor.position.set(
            0,
            (lowerDoorHeight + edgeOverhang * 1.5) / 2,
            cajoneraDepth / 2 - cajoneraThickness / 2
        );
        lowerDoor.castShadow = true;
        lowerDoor.receiveShadow = true;
        cajoneraGroup.add(lowerDoor);

        // Horizontal divider (1/3 from top).
        const dividerGeometry = new THREE.BoxGeometry(
            cajoneraWidth - edgeOverhang * 2,
            cajoneraThickness,
            cajoneraDepth
        );
        const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
        divider.position.set(0, cajoneraHeight * (2 / 3), 0);
        divider.castShadow = true;
        divider.receiveShadow = true;
        cajoneraGroup.add(divider);

        // Position the drawer.
        cajoneraGroup.position.copy(position);

        return cajoneraGroup;
    }

    // Create left drawer.
    const leftCajonera = createCajonera(new THREE.Vector3(x - cajoneraSpacing / 2, y, z));
    const upperLeftDoorHandle = createDoorHandleInstance(
        -0.095,
        0.59,
        0.261,
        Math.PI / 2,
        0,
        -Math.PI / 2
    );
    const lowerLeftDoorHandle = createDoorHandleInstance(0.135, 0.175, 0.261, 0, Math.PI / 2, 0);
    leftCajonera.add(upperLeftDoorHandle);
    leftCajonera.add(lowerLeftDoorHandle);
    deskGroup.add(leftCajonera);

    // Create right drawer.
    const rightCajonera = createCajonera(new THREE.Vector3(x + cajoneraSpacing / 2, y, z));
    const upperRightDoorHandle = createDoorHandleInstance(
        -0.095,
        0.59,
        0.261,
        Math.PI / 2,
        0,
        -Math.PI / 2
    );
    const lowerRightDoorHandle = createDoorHandleInstance(-0.085, 0.175, 0.261, 0, Math.PI / 2, 0);
    rightCajonera.add(upperRightDoorHandle);
    rightCajonera.add(lowerRightDoorHandle);
    deskGroup.add(rightCajonera);

    // Create desk top.
    const deskTopGeometry = new THREE.BoxGeometry(deskTopWidth, 0.05, deskTopDepth);
    const deskTop = new THREE.Mesh(
        deskTopGeometry,
        new THREE.MeshStandardMaterial({ color: 0xacbac1 })
    );
    deskTop.position.set(x, cajoneraHeight, z);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);

    return deskGroup;
}
