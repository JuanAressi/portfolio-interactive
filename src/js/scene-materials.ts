// The materials of the procedural scene. Pieces that look the same share one instance, so merged
// geometries and the shadow passes don't switch state between them.
import * as THREE from 'three';

export const PAINT_COLOR = 0xacbac1;

interface SceneMaterials {
    /** Default roughness: the drawers, the top and the window wall. */
    paint: THREE.MeshStandardMaterial;
    /** Walls are seen from both sides: the room is lit from outside through a window. */
    wall: THREE.MeshStandardMaterial;
    floor: THREE.MeshStandardMaterial;
    /** The bezel, the door handles and the models of the desk. */
    matte: THREE.MeshStandardMaterial;
    stand: THREE.MeshStandardMaterial;
    base: THREE.MeshStandardMaterial;
}

let materials: SceneMaterials | null = null;

export function getSceneMaterials(): SceneMaterials {
    materials ??= {
        paint: new THREE.MeshStandardMaterial({ color: PAINT_COLOR }),
        wall: new THREE.MeshStandardMaterial({ color: PAINT_COLOR, side: THREE.DoubleSide }),
        floor: new THREE.MeshStandardMaterial({
            color: PAINT_COLOR,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.1,
        }),
        matte: new THREE.MeshStandardMaterial({ color: PAINT_COLOR, metalness: 0.1, roughness: 0.8 }),
        stand: new THREE.MeshStandardMaterial({ color: PAINT_COLOR, metalness: 0.3, roughness: 0.6 }),
        base: new THREE.MeshStandardMaterial({ color: PAINT_COLOR, metalness: 0.1, roughness: 0.9 }),
    };
    return materials;
}
