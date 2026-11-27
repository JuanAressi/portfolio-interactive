import * as THREE from 'three';
import { loadModel } from './load-model.ts';
import { boxPart, mergeParts, plainGeometry, tagMesh } from './geometry-parts.ts';
import { getSceneMaterials } from './scene-materials.ts';

const doorHandle = new URL('../assets/models/door_handle.glb', import.meta.url).href;

// Door handles per drawer: [x, y, z, rotationX, rotationY, rotationZ] in the drawer's space.
const HANDLE_SCALE = 0.05;
const LEFT_DRAWER_HANDLES = [
    [-0.095, 0.59, 0.261, Math.PI / 2, 0, -Math.PI / 2],
    [0.135, 0.175, 0.261, 0, Math.PI / 2, 0],
];
const RIGHT_DRAWER_HANDLES = [
    [-0.095, 0.59, 0.261, Math.PI / 2, 0, -Math.PI / 2],
    [-0.085, 0.175, 0.261, 0, Math.PI / 2, 0],
];

// The pieces keep all their faces, the ones no camera ever sees included: the lights draw their
// shadow maps with the faces turned away from them, so dropping those moves the shadows on the desk
// and the keyboard (measured: docs/perf/geometry-notes.md).

// The handles are one mesh: each copy of the model is moved into the desk's space and merged with
// the rest, so four handles of four parts each cost one draw call. Resolves once they are on the
// desk. A failed load leaves the desk without them.
export async function addDoorHandles(desk) {
    const { leftCajonera, rightCajonera } = desk.userData;

    try {
        const model = await loadModel(doorHandle);
        const { matte } = getSceneMaterials();
        const geometries = [];

        for (const [drawer, handles] of [
            [leftCajonera, LEFT_DRAWER_HANDLES],
            [rightCajonera, RIGHT_DRAWER_HANDLES],
        ]) {
            // A stand-in for the drawer: only its position matters to the handles' matrices.
            const space = new THREE.Group();
            space.position.copy(drawer.position);

            for (const [x, y, z, rotationX, rotationY, rotationZ] of handles) {
                const instance = model.clone();
                instance.position.set(x, y, z);
                instance.scale.setScalar(HANDLE_SCALE);
                instance.rotation.set(rotationX, rotationY, rotationZ);
                space.add(instance);
            }

            space.updateMatrixWorld(true);
            space.traverse(child => {
                if (!child.isMesh) return;
                geometries.push(plainGeometry(child.geometry).applyMatrix4(child.matrixWorld));
            });
        }

        const handles = new THREE.Mesh(mergeParts(geometries), matte);
        handles.castShadow = true;
        handles.receiveShadow = true;
        desk.add(tagMesh(handles, 'desk-handles', { bakeGroup: 'desk', isStatic: true }));
    } catch (error) {
        console.error('Error cargando door handle:', error);
    }
}

export function createDesk(x = 0, y = 0, z = 0) {
    const deskGroup = new THREE.Group();

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

    const upperDoorHeight = cajoneraHeight / 3;
    const lowerDoorHeight = cajoneraHeight * (2 / 3);

    // The pieces of one drawer, as [size, position] in its own space.
    const drawerPieces = [
        // Left wall.
        [
            [cajoneraThickness, cajoneraHeight, cajoneraDepth],
            [-cajoneraWidth / 2 + cajoneraThickness / 2, cajoneraHeight / 2, 0],
        ],
        // Right wall.
        [
            [cajoneraThickness, cajoneraHeight, cajoneraDepth],
            [cajoneraWidth / 2 - cajoneraThickness / 2, cajoneraHeight / 2, 0],
        ],
        // Back wall.
        [
            [cajoneraWidth, cajoneraHeight, cajoneraThickness],
            [0, cajoneraHeight / 2, -cajoneraDepth / 2 + cajoneraThickness / 2],
        ],
        // Floor of the drawer.
        [
            [cajoneraWidth - edgeOverhang * 2, cajoneraThickness, cajoneraDepth],
            [0, cajoneraThickness / 2 + 0.02, 0],
        ],
        // Upper door (1/3 height).
        [
            [
                cajoneraWidth - edgeOverhang * 2.5,
                upperDoorHeight - edgeOverhang * 2,
                cajoneraThickness,
            ],
            [
                0,
                cajoneraHeight - (upperDoorHeight + edgeOverhang / 2) / 2,
                cajoneraDepth / 2 - cajoneraThickness / 2,
            ],
        ],
        // Lower door (2/3 height).
        [
            [
                cajoneraWidth - edgeOverhang * 2.5,
                lowerDoorHeight - edgeOverhang * 3,
                cajoneraThickness,
            ],
            [
                0,
                (lowerDoorHeight + edgeOverhang * 1.5) / 2,
                cajoneraDepth / 2 - cajoneraThickness / 2,
            ],
        ],
        // Horizontal divider (1/3 from top).
        [
            [cajoneraWidth - edgeOverhang * 2, cajoneraThickness, cajoneraDepth],
            [0, cajoneraHeight * (2 / 3), 0],
        ],
    ];

    function drawerGeometries(drawerPosition) {
        return drawerPieces.map(([size, [px, py, pz]]) =>
            boxPart({
                size,
                position: [drawerPosition.x + px, drawerPosition.y + py, drawerPosition.z + pz],
            })
        );
    }

    // The drawers keep their own groups, empty: the handles are positioned relative to them.
    const leftCajonera = new THREE.Group();
    leftCajonera.position.set(x - cajoneraSpacing / 2, y, z);
    deskGroup.add(leftCajonera);

    const rightCajonera = new THREE.Group();
    rightCajonera.position.set(x + cajoneraSpacing / 2, y, z);
    deskGroup.add(rightCajonera);

    const deskTop = boxPart({
        size: [deskTopWidth, 0.05, deskTopDepth],
        position: [x, cajoneraHeight, z],
    });

    const body = new THREE.Mesh(
        mergeParts([
            ...drawerGeometries(leftCajonera.position),
            ...drawerGeometries(rightCajonera.position),
            deskTop,
        ]),
        getSceneMaterials().paint
    );
    body.castShadow = true;
    body.receiveShadow = true;
    deskGroup.add(tagMesh(body, 'desk-body', { bakeGroup: 'desk', isStatic: true }));

    deskGroup.userData.leftCajonera = leftCajonera;
    deskGroup.userData.rightCajonera = rightCajonera;

    return deskGroup;
}
