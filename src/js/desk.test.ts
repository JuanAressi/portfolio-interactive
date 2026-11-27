import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDoorHandles, createDesk } from './desk.js';
import { loadModel } from './load-model.ts';

vi.mock('./load-model.ts', () => ({ loadModel: vi.fn() }));

function handleModel(): THREE.Group {
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
    return model;
}

describe('desk', () => {
    beforeEach(() => {
        vi.mocked(loadModel).mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates the desk without touching the handle model', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const desk = createDesk(1, 0, -2);

        expect(loadModel).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(desk.children).toHaveLength(3);
    });

    it('builds the whole desk as one static mesh plus the two drawer anchors', () => {
        const desk = createDesk(1, 0, -2);
        const meshes = desk.children.filter(child => (child as THREE.Mesh).isMesh) as THREE.Mesh[];

        expect(meshes.map(mesh => mesh.name)).toEqual(['desk-body']);
        expect(meshes[0].userData).toEqual({ static: true, bakeGroup: 'desk' });
        expect(desk.userData.leftCajonera.position.x).toBeCloseTo(1 - 0.7);
        expect(desk.userData.rightCajonera.position.x).toBeCloseTo(1 + 0.7);
    });

    it('merges the handles of both drawers into one mesh once the model is ready', async () => {
        vi.mocked(loadModel).mockResolvedValue(handleModel());
        const desk = createDesk(1, 0, -2);
        const childrenBefore = desk.children.length;

        await addDoorHandles(desk);

        expect(loadModel).toHaveBeenCalledOnce();
        expect(desk.children).toHaveLength(childrenBefore + 1);
        const handles = desk.getObjectByName('desk-handles') as THREE.Mesh;
        // Four handles, twelve triangles each in the stand-in model.
        expect(handles.geometry.getIndex()!.count / 3).toBe(4 * 12);
        expect(handles.userData).toEqual({ static: true, bakeGroup: 'desk' });
    });

    it('puts each handle where its drawer is, in the desk space', async () => {
        vi.mocked(loadModel).mockResolvedValue(handleModel());
        const desk = createDesk(1, 0, -2);
        const { leftCajonera, rightCajonera } = desk.userData;

        await addDoorHandles(desk);

        const handles = desk.getObjectByName('desk-handles') as THREE.Mesh;
        handles.geometry.computeBoundingBox();
        const box = handles.geometry.boundingBox!;
        // Handles sit on the front of the drawers (z = 0.261 from each).
        expect(box.min.x).toBeGreaterThan(leftCajonera.position.x - 0.2);
        expect(box.max.x).toBeLessThan(rightCajonera.position.x + 0.2);
        expect(box.max.z).toBeGreaterThan(-2 + 0.25);
    });

    it('shares one material between every handle', async () => {
        vi.mocked(loadModel).mockResolvedValue(handleModel());
        const first = createDesk(1, 0, -2);
        const second = createDesk(1, 0, -2);

        await addDoorHandles(first);
        await addDoorHandles(second);

        expect((first.getObjectByName('desk-handles') as THREE.Mesh).material).toBe(
            (second.getObjectByName('desk-handles') as THREE.Mesh).material
        );
    });

    it('logs a failed load and leaves the desk without handles', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('network');
        vi.mocked(loadModel).mockRejectedValue(failure);
        const desk = createDesk(1, 0, -2);
        const before = desk.children.length;

        await addDoorHandles(desk);

        expect(errorSpy).toHaveBeenCalledWith('Error cargando door handle:', failure);
        expect(desk.children).toHaveLength(before);
    });
});
