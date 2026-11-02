import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type ModelMaterial =
    /** Keeps the model's own materials and overrides their color. */
    | { tint: number }
    /** Gives every mesh its own new MeshStandardMaterial. */
    | { replace: THREE.MeshStandardMaterialParameters };

export interface LoadModelOptions {
    position?: THREE.Vector3Tuple;
    scale?: number;
    rotation?: THREE.Vector3Tuple;
    material?: ModelMaterial;
}

// Models are meshopt-compressed (gltf-transform) — needs the decoder.
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function applyMaterial(mesh: THREE.Mesh, material: ModelMaterial): void {
    if ('tint' in material) {
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(material.tint);
    } else {
        mesh.material = new THREE.MeshStandardMaterial(material.replace);
    }
}

export function loadModel(
    url: string,
    { position, scale, rotation, material }: LoadModelOptions = {}
): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        loader.load(
            url,
            gltf => {
                const model = gltf.scene;
                if (position) model.position.set(...position);
                if (scale !== undefined) model.scale.setScalar(scale);
                if (rotation) model.rotation.set(...rotation);

                model.traverse(child => {
                    if (!(child instanceof THREE.Mesh)) return;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (material) applyMaterial(child, material);
                });

                resolve(model);
            },
            undefined,
            reject
        );
    });
}
