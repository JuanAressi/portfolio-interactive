import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildInventory, type InventoryOptions } from './scene-inventory.ts';

function box(width: number, height: number, depth: number, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
    );
    mesh.position.set(x, y, z);
    return mesh;
}

// The camera never moves: it sits at z = 5 looking at the origin.
const staticCamera: InventoryOptions = {
    poseAt: (_progress, _mouse, position, lookAt) => {
        position.set(0, 0, 5);
        lookAt.set(0, 0, 0);
    },
    viewports: [{ name: 'desktop', aspect: 1.6, mouse: [0] }],
    fov: 75,
    near: 0.1,
    far: 100,
    progressSamples: 2,
    faceLevel: () => true,
    originOf: () => 'test',
};

function recordFor(scene: THREE.Scene, mesh: THREE.Mesh, options = staticCamera) {
    const { meshes } = buildInventory(scene, options);
    return meshes[scene.children.indexOf(mesh)];
}

describe('buildInventory', () => {
    it('marks the faces of a box that point away from the camera as hidden', () => {
        const scene = new THREE.Scene();
        const wall = box(1, 1, 1, 0, 0, 0);
        scene.add(wall);

        const record = recordFor(scene, wall);

        expect(record.seenFrom.desktop).toBe(true);
        expect(record.faces?.hiddenFaces.sort()).toEqual(['+x', '+y', '-x', '-y', '-z']);
        expect(record.faces?.hiddenTriangles).toBe(10);
    });

    it('treats a mesh behind a wall, or behind the camera, as never seen', () => {
        const scene = new THREE.Scene();
        const wall = box(10, 10, 0.2, 0, 0, 0);
        const behindWall = box(1, 1, 1, 0, 0, -3);
        const behindCamera = box(1, 1, 1, 0, 0, 10);
        scene.add(wall, behindWall, behindCamera);

        expect(recordFor(scene, wall).seenFrom.desktop).toBe(true);
        expect(recordFor(scene, behindWall).seenFrom.desktop).toBe(false);
        expect(recordFor(scene, behindWall).faces?.hiddenTriangles).toBe(12);
        expect(recordFor(scene, behindCamera).seenFrom.desktop).toBe(false);
    });

    it('keeps the back of a double-sided wall hidden while the front covers it', () => {
        const scene = new THREE.Scene();
        const wall = box(10, 10, 0.2, 0, 0, 0);
        scene.add(wall);

        expect(recordFor(scene, wall).faces?.hiddenFaces).toContain('-z');
    });

    it('answers per mesh, without faces, for meshes that are not checked face by face', () => {
        const scene = new THREE.Scene();
        const front = box(1, 1, 1, 0, 0, 0);
        const behind = box(1, 1, 1, 0, 0, -3);
        scene.add(front, behind);
        const options = { ...staticCamera, faceLevel: () => false };

        const { meshes } = buildInventory(scene, options);

        expect(meshes[0].seenFrom.desktop).toBe(true);
        expect(meshes[0].faces).toBeUndefined();
        expect(meshes[1].seenFrom.desktop).toBe(false);
    });

    it('answers per viewport', () => {
        const scene = new THREE.Scene();
        // Out to the side: inside a wide frustum, outside a narrow one.
        const side = box(0.5, 0.5, 0.5, 6, 0, 0);
        scene.add(side);

        const { meshes } = buildInventory(scene, {
            ...staticCamera,
            viewports: [
                { name: 'wide', aspect: 2, mouse: [0] },
                { name: 'tall', aspect: 0.4, mouse: [0] },
            ],
        });

        expect(meshes[0].seenFrom).toEqual({ wide: true, tall: false });
    });

    it('describes materials, sharing ids between meshes that use the same instance', () => {
        const scene = new THREE.Scene();
        const shared = new THREE.MeshStandardMaterial({ color: 0xacbac1, roughness: 0.8 });
        const first = new THREE.Mesh(new THREE.BoxGeometry(), shared);
        const second = new THREE.Mesh(new THREE.BoxGeometry(), shared);
        const other = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        scene.add(first, second, other);

        const { meshes } = buildInventory(scene, staticCamera);

        expect(meshes[0].material.id).toBe(meshes[1].material.id);
        expect(meshes[2].material.id).not.toBe(meshes[0].material.id);
        expect(meshes[0].material).toMatchObject({
            type: 'MeshStandardMaterial',
            color: '#acbac1',
            roughness: 0.8,
            side: 'front',
        });
    });

    it('lists the lights', () => {
        const scene = new THREE.Scene();
        const light = new THREE.SpotLight(0xffffff, 2);
        light.castShadow = true;
        scene.add(light);

        const { lights } = buildInventory(scene, staticCamera);

        expect(lights).toEqual([
            expect.objectContaining({ type: 'SpotLight', intensity: 2, castShadow: true }),
        ]);
    });
});
