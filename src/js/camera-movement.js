import * as THREE from 'three';

const cameraMovement = [
    {
        x: 1.12,
        y: 0.988,
        z: -2.27,
    },
    {
        x: 1.12,
        y: 0.988,
        z: -2,
    },
    {
        x: 1.12,
        y: 1.2,
        z: -1.15,
    },
];

const points = [];
const length = cameraMovement.length;

for (let i = 0; i < length; i++) {
    points.push(new THREE.Vector3(cameraMovement[i].x, cameraMovement[i].y, cameraMovement[i].z));
}

const curve = new THREE.CatmullRomCurve3(points);

export default curve;

const LOOK_AT_X = 1.12;
const LOOK_AT_Y = 0.988;
const LOOK_AT_Z = -2.43;
const LOOK_AT_DROP = 0.66;
const MOUSE_SWAY = 0.35;

/**
 * Where the camera sits and what it looks at for a scroll progress (0..1) and a smoothed mouse
 * position (-1..1). Writes into `position` and `lookAt`.
 */
export function cameraPoseAt(progress, mouseX, position, lookAt) {
    curve.getPoint(progress, position);
    // Cubic ease — keeps lookAt near the monitor through Work (matches live).
    const easedProgress = progress * progress * progress;
    if (progress > 0.1) {
        position.x += mouseX * MOUSE_SWAY * easedProgress;
    }
    lookAt.set(LOOK_AT_X, LOOK_AT_Y - easedProgress * LOOK_AT_DROP, LOOK_AT_Z);
}
