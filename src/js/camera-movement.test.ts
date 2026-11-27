import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { cameraPoseAt } from './camera-movement.js';

function poseAt(progress: number, mouseX: number) {
    const position = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    cameraPoseAt(progress, mouseX, position, lookAt);
    return { position, lookAt };
}

describe('cameraPoseAt', () => {
    it('starts at the first point of the path, looking at the monitor', () => {
        const { position, lookAt } = poseAt(0, 1);

        expect(position.toArray()).toEqual([1.12, 0.988, -2.27]);
        expect(lookAt.toArray()).toEqual([1.12, 0.988, -2.43]);
    });

    it('ignores the mouse near the top and sways with it further down', () => {
        expect(poseAt(0.05, 1).position.x).toBeCloseTo(1.12, 6);
        expect(poseAt(1, 1).position.x).toBeCloseTo(1.12 + 0.35, 6);
        expect(poseAt(1, -1).position.x).toBeCloseTo(1.12 - 0.35, 6);
    });

    it('drops the look-at point as the page scrolls', () => {
        expect(poseAt(1, 0).lookAt.y).toBeCloseTo(0.988 - 0.66, 6);
    });
});
