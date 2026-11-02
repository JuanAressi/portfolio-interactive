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

    it('adds two handles to each drawer of the same desk once the model is ready', async () => {
        vi.mocked(loadModel).mockResolvedValue(handleModel());
        const desk = createDesk(1, 0, -2);
        const { leftCajonera, rightCajonera } = desk.userData;
        const leftBefore = leftCajonera.children.length;
        const rightBefore = rightCajonera.children.length;

        await addDoorHandles(desk);

        expect(loadModel).toHaveBeenCalledOnce();
        expect(leftCajonera.children).toHaveLength(leftBefore + 2);
        expect(rightCajonera.children).toHaveLength(rightBefore + 2);
    });

    it('logs a failed load and leaves the desk without handles', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('network');
        vi.mocked(loadModel).mockRejectedValue(failure);
        const desk = createDesk(1, 0, -2);
        const before = desk.userData.leftCajonera.children.length;

        await addDoorHandles(desk);

        expect(errorSpy).toHaveBeenCalledWith('Error cargando door handle:', failure);
        expect(desk.userData.leftCajonera.children).toHaveLength(before);
    });
});
