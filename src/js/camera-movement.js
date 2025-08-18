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
