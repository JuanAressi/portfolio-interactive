import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createMonitor } from './monitor.js';
import { createRoom } from './room.ts';
import { getSceneMaterials } from './scene-materials.ts';

function meshesOf(root: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    root.traverse(child => {
        if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    return meshes;
}

describe('room', () => {
    it('is the walls and the floor, two static meshes', () => {
        const meshes = meshesOf(createRoom());

        expect(meshes.map(mesh => mesh.name)).toEqual(['room-walls', 'room-floor']);
        for (const mesh of meshes) {
            expect(mesh.userData).toEqual({ static: true, bakeGroup: 'room' });
            expect(mesh.castShadow && mesh.receiveShadow).toBe(true);
        }
    });

    it('keeps the window light, the only light of the room', () => {
        const lights: THREE.Light[] = [];
        createRoom().traverse(child => {
            if ((child as THREE.Light).isLight) lights.push(child as THREE.Light);
        });

        expect(lights.map(light => light.name)).toEqual(['room-window-light']);
        expect(lights[0].castShadow).toBe(true);
    });

    it('moves with the position it is given', () => {
        expect(createRoom(1, 2, 3).position.toArray()).toEqual([1, 2, 3]);
    });
});

describe('monitor', () => {
    it('is four dynamic meshes: bezel, screen, stand and base', () => {
        const meshes = meshesOf(createMonitor());

        expect(meshes.map(mesh => mesh.name).sort()).toEqual([
            'monitor-base',
            'monitor-bezel',
            'monitor-screen',
            'monitor-stand',
        ]);
        for (const mesh of meshes) {
            expect(mesh.userData).toEqual({ static: false, bakeGroup: 'monitor' });
        }
    });

    it('still exposes what scene.js drives: the screen, its size and the glow light', () => {
        const monitor = createMonitor(1, 2, 3);
        const { bezelGroup, screen } = monitor.userData;

        expect(screen).toBe(bezelGroup.userData.screen);
        expect(screen.name).toBe('monitor-screen');
        expect(bezelGroup.userData.screenSize.width).toBeCloseTo(0.5313);
        expect(bezelGroup.userData.glowLight.intensity).toBe(0);
        expect(monitor.position.toArray()).toEqual([1, 2, 3]);
    });

    it('keeps the four line lights around the screen', () => {
        const names: string[] = [];
        createMonitor().traverse(child => {
            if (child instanceof THREE.RectAreaLight) names.push(child.name);
        });

        expect(names).toEqual([
            'monitor-line-light-top',
            'monitor-line-light-bottom',
            'monitor-line-light-left',
            'monitor-line-light-right',
        ]);
    });
});

describe('scene materials', () => {
    it('are shared by everything that looks the same', () => {
        const room = meshesOf(createRoom());
        const monitor = meshesOf(createMonitor());
        const materials = getSceneMaterials();

        expect(room[0].material).toBe(materials.wall);
        expect(room[1].material).toBe(materials.floor);
        expect(monitor.find(mesh => mesh.name === 'monitor-bezel')!.material).toBe(materials.matte);
        expect(getSceneMaterials()).toBe(materials);
    });
});
