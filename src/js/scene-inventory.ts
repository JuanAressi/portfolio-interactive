// Lists every mesh and light in the scene and works out what the camera can ever see. Only the
// ?debug=perf diagnostics load it (perf-debug.ts), so it never reaches a normal visit.
import * as THREE from 'three';

export type PoseAt = (
    progress: number,
    mouseX: number,
    position: THREE.Vector3,
    lookAt: THREE.Vector3
) => void;

export interface InventoryViewport {
    name: string;
    aspect: number;
    /** Smoothed mouse positions (-1..1) the camera sways to. A touch screen only has 0. */
    mouse: number[];
}

export interface InventoryOptions {
    poseAt: PoseAt;
    viewports: InventoryViewport[];
    fov: number;
    near: number;
    far: number;
    /** Points sampled along the camera path (0..1, both ends included). */
    progressSamples?: number;
    /** Meshes whose triangles are checked one by one; the rest only get a yes/no. */
    faceLevel: (mesh: THREE.Mesh) => boolean;
    originOf: (mesh: THREE.Mesh) => string;
}

export interface MaterialRecord {
    /** Same id = same material instance. */
    id: string;
    type: string;
    color: string | null;
    side: 'front' | 'back' | 'double';
    metalness: number | null;
    roughness: number | null;
}

export interface MeshRecord {
    path: string;
    origin: string;
    geometry: string;
    vertices: number;
    triangles: number;
    material: MaterialRecord;
    castShadow: boolean;
    receiveShadow: boolean;
    visible: boolean;
    /** Seen from some camera position, per viewport. */
    seenFrom: Record<string, boolean>;
    /** Only for face-level meshes. */
    faces?: {
        /** Triangles never seen from any viewport. */
        hiddenTriangles: number;
        /** Box or plane faces whose triangles are all hidden. */
        hiddenFaces: string[];
    };
}

export interface LightRecord {
    path: string;
    type: string;
    color: string;
    intensity: number;
    castShadow: boolean;
    shadowMapSize: number | null;
}

export interface Inventory {
    meshes: MeshRecord[];
    lights: LightRecord[];
}

const BOX_FACES = ['+x', '-x', '+y', '-y', '+z', '-z'];
// Barycentric points tried on each triangle: its centre and a point near each corner.
const SAMPLE_POINTS: Array<[number, number, number]> = [
    [1 / 3, 1 / 3, 1 / 3],
    [0.7, 0.15, 0.15],
    [0.15, 0.7, 0.15],
    [0.15, 0.15, 0.7],
];
// A hit this much in front of a point doesn't count as something covering it.
const OCCLUSION_EPSILON = 1e-4;
// Meshes that aren't checked face by face try this many triangles per camera.
const COARSE_TRIANGLES_PER_CAMERA = 48;

function triangleCount(geometry: THREE.BufferGeometry): number {
    const count = geometry.index ? geometry.index.count : geometry.getAttribute('position').count;
    return Math.floor(count / 3);
}

function describeMaterial(material: THREE.Material, ids: Map<string, string>): MaterialRecord {
    let id = ids.get(material.uuid);
    if (!id) {
        id = `m${ids.size + 1}`;
        ids.set(material.uuid, id);
    }
    const standard = material as Partial<THREE.MeshStandardMaterial>;
    const side =
        material.side === THREE.DoubleSide
            ? 'double'
            : material.side === THREE.BackSide
              ? 'back'
              : 'front';
    return {
        id,
        type: material.type,
        color: standard.color ? `#${standard.color.getHexString()}` : null,
        side,
        metalness: standard.metalness ?? null,
        roughness: standard.roughness ?? null,
    };
}

function pathOf(object: THREE.Object3D): string {
    const parts: string[] = [];
    for (let node: THREE.Object3D | null = object; node; node = node.parent) {
        if (!node.parent) break;
        const index = node.parent.children.indexOf(node);
        parts.unshift(node.name || `${node.type}[${index}]`);
    }
    return parts.join('/');
}

function faceName(mesh: THREE.Mesh, triangle: number): string {
    const parameters = (mesh.geometry as { parameters?: unknown }).parameters;
    if (mesh.geometry.type === 'BoxGeometry' && parameters) {
        return BOX_FACES[Math.floor(triangle / 2)] ?? `tri${triangle}`;
    }
    if (mesh.geometry.type === 'PlaneGeometry') return '+z';
    return `tri${triangle}`;
}

class Triangles {
    private readonly a = new THREE.Vector3();
    private readonly b = new THREE.Vector3();
    private readonly c = new THREE.Vector3();
    private readonly ab = new THREE.Vector3();
    private readonly ac = new THREE.Vector3();

    readonly normal = new THREE.Vector3();
    readonly point = new THREE.Vector3();

    /** Loads the triangle's corners in world space and its normal; true unless it's degenerate. */
    load(mesh: THREE.Mesh, triangle: number): boolean {
        const position = mesh.geometry.getAttribute('position');
        const index = mesh.geometry.index;
        const i = triangle * 3;
        this.a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
        this.b
            .fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1)
            .applyMatrix4(mesh.matrixWorld);
        this.c
            .fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2)
            .applyMatrix4(mesh.matrixWorld);
        this.ab.subVectors(this.b, this.a);
        this.ac.subVectors(this.c, this.a);
        this.normal.crossVectors(this.ab, this.ac);
        if (this.normal.lengthSq() < 1e-14) return false;
        this.normal.normalize();
        // A mirrored transform turns the winding around.
        if (mesh.matrixWorld.determinant() < 0) this.normal.negate();
        return true;
    }

    pointAt([u, v, w]: [number, number, number]): THREE.Vector3 {
        return this.point
            .set(0, 0, 0)
            .addScaledVector(this.a, u)
            .addScaledVector(this.b, v)
            .addScaledVector(this.c, w);
    }
}

interface Tracked {
    mesh: THREE.Mesh;
    record: MeshRecord;
    faceLevel: boolean;
    triangles: number;
    /** Per viewport: the triangles seen so far (face-level meshes only). */
    seenTriangles: Map<string, Set<number>>;
    seenAny: Map<string, boolean>;
}

export function buildInventory(scene: THREE.Object3D, options: InventoryOptions): Inventory {
    scene.updateMatrixWorld(true);

    const materialIds = new Map<string, string>();
    const tracked: Tracked[] = [];
    const lights: LightRecord[] = [];

    scene.traverse(object => {
        if ((object as THREE.Light).isLight) {
            const light = object as THREE.Light;
            lights.push({
                path: pathOf(light),
                type: light.type,
                color: `#${light.color.getHexString()}`,
                intensity: light.intensity,
                castShadow: Boolean(light.castShadow),
                shadowMapSize: light.shadow ? light.shadow.mapSize.x : null,
            });
        }
        if (!(object as THREE.Mesh).isMesh) return;

        const mesh = object as THREE.Mesh;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const faceLevel = options.faceLevel(mesh);
        const triangles = triangleCount(mesh.geometry);
        const seenFrom: Record<string, boolean> = {};
        for (const viewport of options.viewports) seenFrom[viewport.name] = false;

        tracked.push({
            mesh,
            faceLevel,
            triangles,
            record: {
                path: pathOf(mesh),
                origin: options.originOf(mesh),
                geometry: mesh.geometry.type,
                vertices: mesh.geometry.getAttribute('position').count,
                triangles,
                material: describeMaterial(material, materialIds),
                castShadow: mesh.castShadow,
                receiveShadow: mesh.receiveShadow,
                visible: mesh.visible,
                seenFrom,
            },
            seenTriangles: new Map(options.viewports.map(viewport => [viewport.name, new Set()])),
            seenAny: new Map(options.viewports.map(viewport => [viewport.name, false])),
        });
    });

    const occluders = tracked.filter(entry => entry.mesh.visible).map(entry => entry.mesh);
    const camera = new THREE.PerspectiveCamera(options.fov, 1, options.near, options.far);
    const lookAt = new THREE.Vector3();
    const frustum = new THREE.Frustum();
    const projection = new THREE.Matrix4();
    const raycaster = new THREE.Raycaster();
    const triangles = new Triangles();
    const direction = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const progressSamples = options.progressSamples ?? 21;

    function isSeen(entry: Tracked, triangle: number): boolean {
        if (!triangles.load(entry.mesh, triangle)) return false;
        const side = entry.mesh.material;
        const materialSide = (Array.isArray(side) ? side[0] : side).side;

        for (const barycentric of SAMPLE_POINTS) {
            const point = triangles.pointAt(barycentric);
            if (!frustum.containsPoint(point)) continue;

            toCamera.subVectors(camera.position, point);
            const facing = triangles.normal.dot(toCamera);
            if (materialSide === THREE.FrontSide && facing <= 0) continue;
            if (materialSide === THREE.BackSide && facing >= 0) continue;

            const distance = toCamera.length();
            direction.copy(toCamera).multiplyScalar(-1 / distance);
            raycaster.set(camera.position, direction);
            raycaster.near = 0;
            raycaster.far = distance + OCCLUSION_EPSILON;
            const [first] = raycaster.intersectObjects(occluders, false);
            if (!first || first.distance >= distance - OCCLUSION_EPSILON) return true;
        }
        return false;
    }

    // Walks every camera position of every viewport. A coarse mesh is tried on `stride(entry)`
    // triangles per position, and the sweep skips whatever `wanted` rejects.
    function sweep(wanted: (entry: Tracked, viewport: string) => boolean, strideOf: (entry: Tracked) => number) {
        for (const viewport of options.viewports) {
            camera.aspect = viewport.aspect;
            camera.updateProjectionMatrix();

            for (let step = 0; step < progressSamples; step++) {
                const progress = step / (progressSamples - 1);
                for (const mouse of viewport.mouse) {
                    options.poseAt(progress, mouse, camera.position, lookAt);
                    camera.lookAt(lookAt);
                    camera.updateMatrixWorld(true);
                    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
                    frustum.setFromProjectionMatrix(projection);

                    for (const entry of tracked) {
                        if (!entry.mesh.visible || !wanted(entry, viewport.name)) continue;
                        if (!frustum.intersectsObject(entry.mesh)) continue;

                        if (entry.faceLevel) {
                            const seenTriangles = entry.seenTriangles.get(viewport.name)!;
                            for (let triangle = 0; triangle < entry.triangles; triangle++) {
                                if (!seenTriangles.has(triangle) && isSeen(entry, triangle)) {
                                    seenTriangles.add(triangle);
                                }
                            }
                        } else {
                            const stride = strideOf(entry);
                            for (let triangle = 0; triangle < entry.triangles; triangle += stride) {
                                if (isSeen(entry, triangle)) {
                                    entry.seenAny.set(viewport.name, true);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const isPending = (entry: Tracked, viewport: string): boolean =>
        entry.faceLevel
            ? entry.seenTriangles.get(viewport)!.size < entry.triangles
            : !entry.seenAny.get(viewport);

    // First a cheap pass with a sample of each coarse mesh's triangles, then every triangle of
    // the ones that stayed unseen, so "never visible" isn't a sampling accident.
    sweep(isPending, entry =>
        Math.max(1, Math.floor(entry.triangles / COARSE_TRIANGLES_PER_CAMERA))
    );
    sweep(
        (entry, viewport) => !entry.faceLevel && isPending(entry, viewport),
        () => 1
    );

    for (const entry of tracked) {
        const { record } = entry;
        const hiddenEverywhere: number[] = [];
        for (const viewport of options.viewports) {
            const seen = entry.seenTriangles.get(viewport.name)!;
            record.seenFrom[viewport.name] = entry.faceLevel
                ? seen.size > 0
                : Boolean(entry.seenAny.get(viewport.name));
        }
        if (entry.faceLevel) {
            for (let triangle = 0; triangle < entry.triangles; triangle++) {
                const seenSomewhere = options.viewports.some(viewport =>
                    entry.seenTriangles.get(viewport.name)!.has(triangle)
                );
                if (!seenSomewhere) hiddenEverywhere.push(triangle);
            }
            const hiddenByFace = new Map<string, number>();
            const totalByFace = new Map<string, number>();
            for (let triangle = 0; triangle < entry.triangles; triangle++) {
                const face = faceName(entry.mesh, triangle);
                totalByFace.set(face, (totalByFace.get(face) ?? 0) + 1);
            }
            for (const triangle of hiddenEverywhere) {
                const face = faceName(entry.mesh, triangle);
                hiddenByFace.set(face, (hiddenByFace.get(face) ?? 0) + 1);
            }
            record.faces = {
                hiddenTriangles: hiddenEverywhere.length,
                hiddenFaces: [...hiddenByFace]
                    .filter(([face, hidden]) => hidden === totalByFace.get(face))
                    .map(([face]) => face),
            };
        }
    }

    return { meshes: tracked.map(entry => entry.record), lights };
}
