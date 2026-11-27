// window.__perf: what the renderer is doing, read by `npm run scene:profile`. Loaded by
// scene.js only when the URL has ?debug=perf, so a normal visit never downloads or runs it.
import * as THREE from 'three';
import { cameraPoseAt } from './camera-movement.js';
import { buildInventory, type Inventory } from './scene-inventory.ts';

export interface PerfDebugContext {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    parts: { room: THREE.Object3D; desk: THREE.Object3D; monitor: THREE.Object3D };
}

export interface DrawStats {
    calls: number;
    triangles: number;
}

export interface FrameInfo extends DrawStats {
    /** The shadow maps' share of the totals. three.js resets its counters after them. */
    shadow: DrawStats;
    /** The picture on screen alone. */
    main: DrawStats;
    lines: number;
    points: number;
}

export interface PerfSnapshot {
    frame: FrameInfo;
    memory: { geometries: number; textures: number };
    programs: number;
    meshes: number;
    renderer: {
        width: number;
        height: number;
        pixelRatio: number;
        shadowMap: boolean;
    };
}

export interface PerfRecording {
    /** Time between animation frames, in ms. */
    frameMs: number[];
    /** Time of each renderer.render, with the GPU work waited for (gl.finish), in ms. */
    renderMs: number[];
    /** The renders made while recording (the loop skips frames once the picture is still). */
    frames: FrameInfo[];
}

// Viewports the camera path is checked from. The touch one never sways with the mouse. The
// ultrawide one has the widest frustum a visitor is likely to have: anything the narrower
// viewports see is inside it, so it is what makes a face safe to delete.
// Meshes with fewer indices than this are checked triangle by triangle.
const FACE_LEVEL_MAX_INDICES = 1500;

const INVENTORY_VIEWPORTS = [
    { name: 'desktop', aspect: 1440 / 900, mouse: [-1, 0, 1] },
    { name: 'ultrawide', aspect: 2560 / 1080, mouse: [-1, 0, 1] },
    { name: 'mobile', aspect: 390 / 844, mouse: [0] },
];

function originOfMesh(mesh: THREE.Mesh, { room, desk, monitor }: PerfDebugContext['parts']): string {
    for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
        if (node === room) return 'room.ts';
        if (node === monitor) return 'monitor.js';
        // The handles on the drawers are the one GLB merged into the desk.
        if (node === desk) return mesh.name === 'desk-handles' ? 'desk.js (door_handle.glb)' : 'desk.js';
        if (node.parent?.type === 'Scene' && node.name) return `${node.name}.glb`;
    }
    return 'unknown';
}

export function installPerfDebug({ renderer, scene, camera, parts }: PerfDebugContext): void {
    const gl = renderer.getContext();
    let recording: PerfRecording | null = null;
    let lastFrame: FrameInfo = emptyFrame();
    // Filled by the shadow-map wrapper while the render that owns it is running.
    let shadowStats: DrawStats = { calls: 0, triangles: 0 };

    function emptyFrame(): FrameInfo {
        const none = { calls: 0, triangles: 0 };
        return { ...none, shadow: none, main: none, lines: 0, points: 0 };
    }

    const render = renderer.render.bind(renderer);
    const renderShadows = renderer.shadowMap.render.bind(renderer.shadowMap);

    renderer.shadowMap.render = (...args: Parameters<typeof renderShadows>) => {
        const { calls, triangles } = renderer.info.render;
        renderShadows(...args);
        // renderer.info resets right after this, so the shadow passes only live here.
        shadowStats = {
            calls: renderer.info.render.calls - calls,
            triangles: renderer.info.render.triangles - triangles,
        };
    };

    renderer.render = (...args: Parameters<typeof render>) => {
        shadowStats = { calls: 0, triangles: 0 };
        const start = performance.now();
        render(...args);
        // Waiting for the GPU makes the time the whole frame's, not just the submission's. Only
        // while recording: the rest of the time the page behaves as it does for anyone else.
        if (recording) gl.finish();
        const elapsed = performance.now() - start;

        const { calls, triangles, lines, points } = renderer.info.render;
        lastFrame = {
            calls: calls + shadowStats.calls,
            triangles: triangles + shadowStats.triangles,
            lines,
            points,
            shadow: shadowStats,
            main: { calls, triangles },
        };
        if (recording) {
            recording.renderMs.push(elapsed);
            recording.frames.push(lastFrame);
        }
    };

    let frameLoop = 0;
    let lastTimestamp = 0;

    function sampleFrames(timestamp: number): void {
        if (recording && lastTimestamp) recording.frameMs.push(timestamp - lastTimestamp);
        lastTimestamp = timestamp;
        frameLoop = requestAnimationFrame(sampleFrames);
    }

    function countMeshes(): number {
        let meshes = 0;
        scene.traverse(object => {
            if ((object as THREE.Mesh).isMesh) meshes += 1;
        });
        return meshes;
    }

    const api = {
        snapshot(): PerfSnapshot {
            const size = renderer.getSize(new THREE.Vector2());
            return {
                frame: lastFrame,
                memory: {
                    geometries: renderer.info.memory.geometries,
                    textures: renderer.info.memory.textures,
                },
                programs: renderer.info.programs?.length ?? 0,
                meshes: countMeshes(),
                renderer: {
                    width: size.x,
                    height: size.y,
                    pixelRatio: renderer.getPixelRatio(),
                    shadowMap: renderer.shadowMap.enabled,
                },
            };
        },
        start(): void {
            recording = { frameMs: [], renderMs: [], frames: [] };
            lastTimestamp = 0;
            cancelAnimationFrame(frameLoop);
            frameLoop = requestAnimationFrame(sampleFrames);
        },
        stop(): PerfRecording {
            cancelAnimationFrame(frameLoop);
            const result = recording ?? { frameMs: [], renderMs: [], frames: [] };
            recording = null;
            return result;
        },
        inventory(progressSamples?: number): Inventory {
            return buildInventory(scene, {
                progressSamples,
                poseAt: cameraPoseAt,
                viewports: INVENTORY_VIEWPORTS,
                fov: camera.fov,
                near: camera.near,
                far: camera.far,
                // What is built here is a few hundred triangles; the models are checked per mesh.
                faceLevel: mesh =>
                    mesh.userData.bakeGroup !== 'props' &&
                    (mesh.geometry.getIndex()?.count ?? mesh.geometry.getAttribute('position').count) <
                        FACE_LEVEL_MAX_INDICES,
                originOf: mesh => originOfMesh(mesh, parts),
            });
        },
    };

    Object.assign(window, { __perf: api });
}
