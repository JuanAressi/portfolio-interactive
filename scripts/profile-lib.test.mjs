// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    BUDGET,
    checkBudget,
    inventorySummary,
    percentile,
    renderMarkdown,
    summarize,
} from './profile-lib.mjs';

describe('percentile', () => {
    it('picks the median of an odd and an even list', () => {
        expect(percentile([3, 1, 2], 50)).toBe(2);
        expect(percentile([4, 1, 3, 2], 50)).toBe(2.5);
    });

    it('interpolates between ranks', () => {
        const values = Array.from({ length: 101 }, (_, i) => i);
        expect(percentile(values, 95)).toBe(95);
        expect(percentile([0, 10], 95)).toBeCloseTo(9.5);
    });

    it('is the only value for a list of one and NaN for none', () => {
        expect(percentile([7], 95)).toBe(7);
        expect(percentile([], 50)).toBeNaN();
    });
});

describe('summarize', () => {
    it('gives count, p50, p95 and max', () => {
        expect(summarize([16, 17, 16, 40])).toMatchObject({ n: 4, p50: 16.5, max: 40 });
    });
});

describe('checkBudget', () => {
    it('flags only what goes over the limit of the viewport', () => {
        const checks = checkBudget('mobile', { drawCalls: 30, triangles: 31_000, frameP95Ms: 20 });

        expect(checks.drawCalls.ok).toBe(true);
        expect(checks.triangles).toEqual({ limit: BUDGET.mobile.triangles, value: 31_000, ok: false });
        expect(checks.frameP95Ms.ok).toBe(true);
        expect(checkBudget('desktop', { drawCalls: 1, triangles: 31_000, frameP95Ms: 20 }).frameP95Ms.ok).toBe(
            false
        );
    });
});

const mesh = (overrides = {}) => ({
    path: 'a',
    origin: 'desk.js',
    geometry: 'BoxGeometry',
    vertices: 24,
    triangles: 12,
    material: { id: 'm1', type: 'MeshStandardMaterial' },
    castShadow: true,
    receiveShadow: true,
    visible: true,
    seenFrom: { desktop: true, mobile: true },
    ...overrides,
});

describe('inventorySummary', () => {
    it('counts what is never seen and what hides on seen meshes', () => {
        const summary = inventorySummary({
            meshes: [
                mesh({ faces: { hiddenTriangles: 10, hiddenFaces: ['+x'] } }),
                mesh({ origin: 'room.ts', seenFrom: { desktop: false, mobile: false } }),
                mesh({
                    material: { id: 'm2', type: 'MeshBasicMaterial' },
                    seenFrom: { desktop: false, mobile: true },
                }),
            ],
            lights: [],
        });

        expect(summary).toMatchObject({
            meshes: 3,
            triangles: 36,
            materials: 2,
            neverSeenMeshes: 1,
            neverSeenTriangles: 12,
            hiddenTrianglesInSeenMeshes: 10,
            shadowCasters: 3,
        });
        expect(summary.byOrigin['desk.js']).toEqual({ meshes: 2, triangles: 24 });
    });
});

describe('renderMarkdown', () => {
    const cell = (viewport, section, calls) => ({
        mode: 'gl-egl',
        viewport,
        section,
        calls,
        triangles: 1000,
        peak: { calls: calls + 2, triangles: 1200 },
        shadow: { calls: 10, triangles: 400 },
        textures: 3,
        geometries: 40,
        programs: 6,
        renders: 300,
        heapMB: 12.34,
        frameMs: { n: 300, p50: 16.7, p95: 17.2, max: 30 },
        renderMs: { n: 300, p50: 2, p95: 4, max: 8 },
    });

    it('lays out a table per mode and viewport and marks what is over budget', () => {
        const markdown = renderMarkdown({
            environment: { commit: 'abc', chromium: 'Chromium 1', node: 'v24', renderers: { 'gl-egl': 'GPU' } },
            config: { modes: ['gl-egl'], mobileCpuThrottle: 4, scrollMs: 5000 },
            results: [cell('desktop', 'home', 31), cell('desktop', 'work', 20)],
            inventory: { meshes: [mesh()], lights: [] },
        });

        expect(markdown).toContain('#### gl-egl · desktop');
        expect(markdown).toMatch(/\| home \| 31 ⚠ \(peak 33\) \|/);
        expect(markdown).toMatch(/\| work \| 20 \(peak 22\) \|/);
        expect(markdown).toContain('| about | n/a');
        expect(markdown).not.toContain('#### gl-egl · mobile');
        expect(markdown).toContain('| gl-egl | desktop | 31 / 30 ⚠ | 1,000 / 50,000 | 17.2 / 17 ⚠ |');
    });
});
