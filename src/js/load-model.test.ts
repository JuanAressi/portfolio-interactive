import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadModel } from './load-model.ts';

type LoadArgs = [
    string,
    (gltf: { scene: THREE.Group }) => void,
    ((event: ProgressEvent) => void) | undefined,
    (error: unknown) => void,
];

const { load } = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
    GLTFLoader: class {
        setMeshoptDecoder() {}
        load = load;
    },
}));

function createScene(): THREE.Group {
    const scene = new THREE.Group();
    const group = new THREE.Group();
    group.add(
        new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xff0000 }))
    );
    group.add(
        new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0x00ff00 }))
    );
    scene.add(group);
    return scene;
}

function meshesOf(model: THREE.Group): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    model.traverse(child => {
        if (child instanceof THREE.Mesh) meshes.push(child);
    });
    return meshes;
}

function resolveLoad(): void {
    const [, onLoad] = load.mock.calls[0] as LoadArgs;
    onLoad({ scene: createScene() });
}

describe('loadModel', () => {
    beforeEach(() => {
        load.mockReset();
    });

    it('applies position, uniform scale and rotation', async () => {
        const pending = loadModel('model.glb', {
            position: [1, 2, 3],
            scale: 0.5,
            rotation: [0, -1.25, 0],
        });
        resolveLoad();
        const model = await pending;

        expect(model.position.toArray()).toEqual([1, 2, 3]);
        expect(model.scale.toArray()).toEqual([0.5, 0.5, 0.5]);
        expect(model.rotation.y).toBe(-1.25);
    });

    it('leaves transforms at their defaults when they are not given', async () => {
        const pending = loadModel('model.glb');
        resolveLoad();
        const model = await pending;

        expect(model.position.toArray()).toEqual([0, 0, 0]);
        expect(model.scale.toArray()).toEqual([1, 1, 1]);
        expect(model.rotation.y).toBe(0);
    });

    it('enables shadows on every mesh', async () => {
        const pending = loadModel('model.glb');
        resolveLoad();
        const meshes = meshesOf(await pending);

        expect(meshes).toHaveLength(2);
        expect(meshes.every(mesh => mesh.castShadow && mesh.receiveShadow)).toBe(true);
    });

    it('tints the existing materials', async () => {
        const pending = loadModel('model.glb', { material: { tint: 0xacbac1 } });
        const originals = (load.mock.calls[0] as LoadArgs)[1];
        const scene = createScene();
        const materials = meshesOf(scene).map(mesh => mesh.material);
        originals({ scene });
        const meshes = meshesOf(await pending);

        expect(meshes.map(mesh => mesh.material)).toEqual(materials);
        for (const mesh of meshes) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            expect(material.color.getHex()).toBe(new THREE.Color(0xacbac1).getHex());
        }
    });

    it('gives every mesh its own replacement material', async () => {
        const pending = loadModel('model.glb', {
            material: { replace: { color: 0xacbac1, metalness: 0.1, roughness: 0.8 } },
        });
        resolveLoad();
        const [first, second] = meshesOf(await pending).map(
            mesh => mesh.material as THREE.MeshStandardMaterial
        );

        expect(first).not.toBe(second);
        expect(first.color.getHex()).toBe(new THREE.Color(0xacbac1).getHex());
        expect(first.metalness).toBe(0.1);
        expect(first.roughness).toBe(0.8);
    });

    it('passes the handlers to GLTFLoader.load as (onLoad, onProgress, onError)', async () => {
        const pending = loadModel('model.glb');
        const [url, onLoad, onProgress, onError] = load.mock.calls[0] as LoadArgs;
        const failure = new Error('network');
        onError(failure);

        expect(url).toBe('model.glb');
        expect(onLoad).toBeTypeOf('function');
        expect(onProgress).toBeUndefined();
        await expect(pending).rejects.toBe(failure);
    });
});
