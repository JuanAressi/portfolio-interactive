import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { boxPart, mergeParts, plainGeometry, tagMesh, tagModel } from './geometry-parts.ts';

const triangles = (geometry: THREE.BufferGeometry) => geometry.getIndex()!.count / 3;

describe('boxPart', () => {
    it('is a full box, positioned, with only position and normal', () => {
        const geometry = boxPart({ size: [2, 4, 6], position: [10, 20, 30] });
        geometry.computeBoundingBox();

        expect(triangles(geometry)).toBe(12);
        expect(Object.keys(geometry.attributes).sort()).toEqual(['normal', 'position']);
        expect(geometry.boundingBox!.min.toArray()).toEqual([9, 18, 27]);
        expect(geometry.boundingBox!.max.toArray()).toEqual([11, 22, 33]);
    });

    it('builds neither the triangles nor the vertices of an omitted face', () => {
        const geometry = boxPart({ size: [1, 1, 1], position: [0, 0, 0], omit: ['-y', '-z'] });

        expect(triangles(geometry)).toBe(8);
        expect(geometry.getAttribute('position').count).toBe(16);
    });

    it('keeps the faces that are left pointing the same way', () => {
        const geometry = boxPart({ size: [1, 1, 1], position: [0, 0, 0], omit: ['+x', '-x', '+y', '-y', '-z'] });
        const normal = geometry.getAttribute('normal');

        expect(triangles(geometry)).toBe(2);
        for (let i = 0; i < normal.count; i++) {
            expect([normal.getX(i), normal.getY(i), normal.getZ(i)]).toEqual([0, 0, 1]);
        }
        // Wound counter-clockwise seen from +z, as BoxGeometry does it.
        const position = geometry.getAttribute('position');
        const index = geometry.getIndex()!;
        const [a, b, c] = [0, 1, 2].map(i => new THREE.Vector3().fromBufferAttribute(position, index.getX(i)));
        expect(b.clone().sub(a).cross(c.clone().sub(a)).z).toBeGreaterThan(0);
    });

    it('can leave nothing at all', () => {
        const geometry = boxPart({
            size: [1, 1, 1],
            position: [0, 0, 0],
            omit: ['+x', '-x', '+y', '-y', '+z', '-z'],
        });

        expect(geometry.getAttribute('position').count).toBe(0);
    });
});

describe('mergeParts', () => {
    it('adds up the parts into one indexed geometry', () => {
        const merged = mergeParts([
            boxPart({ size: [1, 1, 1], position: [0, 0, 0] }),
            boxPart({ size: [1, 1, 1], position: [5, 0, 0], omit: ['+x'] }),
        ]);

        expect(triangles(merged)).toBe(12 + 10);
        expect(merged.getAttribute('position').count).toBe(24 + 20);
        // The second box's indices point at its own vertices.
        expect(Math.max(...Array.from(merged.getIndex()!.array))).toBe(43);
    });
});

describe('plainGeometry', () => {
    it('turns quantized, uv-carrying attributes into plain float ones that merge with a box part', () => {
        const source = new THREE.BoxGeometry(1, 1, 1);
        const position = source.getAttribute('position');
        const quantized = new Int16Array(position.count * 3);
        for (let i = 0; i < position.count; i++) {
            quantized[i * 3] = position.getX(i) * 32767;
            quantized[i * 3 + 1] = position.getY(i) * 32767;
            quantized[i * 3 + 2] = position.getZ(i) * 32767;
        }
        source.setAttribute('position', new THREE.BufferAttribute(quantized, 3, true));

        const plain = plainGeometry(source);

        expect(plain.getAttribute('position').array).toBeInstanceOf(Float32Array);
        expect(Object.keys(plain.attributes).sort()).toEqual(['normal', 'position']);
        expect(plain.getAttribute('position').getX(0)).toBeCloseTo(position.getX(0), 3);
        expect(triangles(mergeParts([plain, boxPart({ size: [1, 1, 1], position: [3, 0, 0] })]))).toBe(24);
    });
});

describe('tagging', () => {
    it('names a mesh and marks what the bake needs', () => {
        const mesh = tagMesh(new THREE.Mesh(), 'desk-body', { bakeGroup: 'desk', isStatic: true });

        expect(mesh.name).toBe('desk-body');
        expect(mesh.userData).toEqual({ static: true, bakeGroup: 'desk' });
    });

    it('numbers the meshes of a model in order, as props', () => {
        const model = new THREE.Group();
        const inner = new THREE.Group();
        inner.add(new THREE.Mesh(), new THREE.Mesh());
        model.add(new THREE.Mesh(), inner);

        tagModel(model, 'keyboard');

        const names: string[] = [];
        model.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                names.push(child.name);
                expect(child.userData).toEqual({ static: true, bakeGroup: 'props' });
            }
        });
        expect(names).toEqual(['keyboard-00', 'keyboard-01', 'keyboard-02']);
    });
});
