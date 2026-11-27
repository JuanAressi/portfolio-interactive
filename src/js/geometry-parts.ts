// Building blocks for the procedural scene: boxes that leave out the faces nobody sees, merged
// into one geometry per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type BoxFace = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

// BoxGeometry builds its faces in this order, four vertices and six indices each.
const BOX_FACES: BoxFace[] = ['+x', '-x', '+y', '-y', '+z', '-z'];

export interface BoxPart {
    size: [number, number, number];
    position: [number, number, number];
    /** Faces that are never in view, so they are not built. */
    omit?: readonly BoxFace[];
}

/**
 * A box with one segment per side, positioned, without the faces in `omit` and without uvs (no
 * material in the scene has a texture). Only position and normal are left, so any two parts merge.
 */
export function boxPart({ size, position, omit = [] }: BoxPart): THREE.BufferGeometry {
    const box = new THREE.BoxGeometry(...size);
    const sourcePosition = box.getAttribute('position');
    const sourceNormal = box.getAttribute('normal');
    const sourceIndex = box.getIndex()!;

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    BOX_FACES.forEach((face, faceIndex) => {
        if (omit.includes(face)) return;
        const firstVertex = positions.length / 3;
        for (let vertex = 0; vertex < 4; vertex++) {
            const source = faceIndex * 4 + vertex;
            positions.push(
                sourcePosition.getX(source) + position[0],
                sourcePosition.getY(source) + position[1],
                sourcePosition.getZ(source) + position[2]
            );
            normals.push(sourceNormal.getX(source), sourceNormal.getY(source), sourceNormal.getZ(source));
        }
        for (let i = 0; i < 6; i++) {
            indices.push(sourceIndex.getX(faceIndex * 6 + i) - faceIndex * 4 + firstVertex);
        }
    });

    box.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    return geometry;
}

/** One geometry from many; the parts are disposed of. */
export function mergeParts(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error('The parts of a merged geometry must share their attributes.');
    for (const geometry of geometries) geometry.dispose();
    return merged;
}

/**
 * The same geometry with plain Float32 position and normal only, which is what the parts above
 * are made of. Models from a GLB come quantized (normalized int16) and with uvs that the merge
 * would refuse to mix.
 */
export function plainGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal'] as const) {
        const attribute = source.getAttribute(name);
        const values = new Float32Array(attribute.count * 3);
        for (let i = 0; i < attribute.count; i++) {
            values[i * 3] = attribute.getX(i);
            values[i * 3 + 1] = attribute.getY(i);
            values[i * 3 + 2] = attribute.getZ(i);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
    }
    const index = source.getIndex();
    if (index) {
        geometry.setIndex(Array.from({ length: index.count }, (_, i) => index.getX(i)));
    }
    return geometry;
}

export type BakeGroup = 'room' | 'desk' | 'monitor' | 'props';

/**
 * Names a mesh and marks what the baking step needs to know: whether it can be baked into
 * lightmaps (`static`) and which bake it belongs to.
 */
export function tagMesh<T extends THREE.Object3D>(
    object: T,
    name: string,
    { bakeGroup, isStatic }: { bakeGroup: BakeGroup; isStatic: boolean }
): T {
    object.name = name;
    object.userData.static = isStatic;
    object.userData.bakeGroup = bakeGroup;
    return object;
}

/** Tags every mesh of a loaded model as `<name>-00`, `<name>-01`… in traversal order. */
export function tagModel(model: THREE.Object3D, name: string, bakeGroup: BakeGroup = 'props'): void {
    let index = 0;
    model.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        tagMesh(child, `${name}-${String(index++).padStart(2, '0')}`, { bakeGroup, isStatic: true });
    });
}
