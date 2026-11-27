import * as THREE from 'three';
import { boxPart, mergeParts, tagMesh } from './geometry-parts.ts';
import { getSceneMaterials } from './scene-materials.ts';

const ROOM_WIDTH = 5;
const ROOM_HEIGHT = 3;
const ROOM_DEPTH = 5;
const WALL_THICKNESS = 0.075;

const WINDOW_WIDTH = 2;
const WINDOW_HEIGHT = 1.2;
const WINDOW_Y = 0.85;

// Every wall keeps all its faces, the ones no camera ever sees included: the walls keep the
// light of two sources out (the window light and the second spotlight stand outside the room). The
// faces turned away from a light are the ones its shadow map is drawn with, so dropping them moves
// the shadows on the desk and the floor (measured: docs/perf/geometry-notes.md).

export function createRoom(x = 0, y = 0, z = 0) {
    const roomGroup = new THREE.Group();
    roomGroup.position.set(x, y, z);

    const { wall, floor } = getSceneMaterials();

    // The right wall is a wall with a window: three pieces around the hole, turned to face -x.
    const topHeight = ROOM_HEIGHT - WINDOW_HEIGHT - WINDOW_Y;
    const windowWall = new THREE.Matrix4()
        .makeRotationY(Math.PI / 2)
        .setPosition(ROOM_WIDTH / 2, 0, 0);
    const windowPieces = [
        boxPart({
            size: [ROOM_WIDTH, topHeight, WALL_THICKNESS],
            position: [0, WINDOW_Y + WINDOW_HEIGHT + topHeight / 2, 0],
        }),
        boxPart({
            size: [ROOM_WIDTH, WINDOW_Y, WALL_THICKNESS],
            position: [0, WINDOW_Y / 2, 0],
        }),
        boxPart({
            size: [(ROOM_WIDTH - WINDOW_WIDTH) / 2, WINDOW_HEIGHT, WALL_THICKNESS],
            position: [(ROOM_WIDTH + WINDOW_WIDTH) / 2.75, WINDOW_Y + WINDOW_HEIGHT / 2, 0],
        }),
    ].map(piece => piece.applyMatrix4(windowWall));

    const leftWall = boxPart({
        size: [ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS],
        position: [0, 0, 0],
    }).applyMatrix4(
        new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0)
    );

    const backWall = boxPart({
        size: [ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS],
        position: [0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2],
    });

    const walls = new THREE.Mesh(mergeParts([backWall, ...windowPieces, leftWall]), wall);
    walls.castShadow = true;
    walls.receiveShadow = true;
    roomGroup.add(tagMesh(walls, 'room-walls', { bakeGroup: 'room', isStatic: true }));

    const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    floorGeometry.rotateX(Math.PI / 2);
    floorGeometry.deleteAttribute('uv');
    const floorMesh = new THREE.Mesh(floorGeometry, floor);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    roomGroup.add(tagMesh(floorMesh, 'room-floor', { bakeGroup: 'room', isStatic: true }));

    const windowLight = new THREE.DirectionalLight(0xffffff, 0.33);
    windowLight.position.set(
        ROOM_WIDTH / 2 + 1,
        WINDOW_Y + WINDOW_HEIGHT / 2,
        -ROOM_DEPTH / 2 + 0.5
    );
    windowLight.castShadow = true;
    windowLight.lookAt(0, WINDOW_Y + WINDOW_HEIGHT / 2, 0);
    windowLight.name = 'room-window-light';
    roomGroup.add(windowLight);

    return roomGroup;
}
