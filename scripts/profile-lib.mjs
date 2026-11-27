// Pure helpers for profile-scene.mjs: percentiles, the performance budget and the markdown report.
// Kept apart from Playwright so they can be unit tested.

// Starting point for what the scene may cost, to be adjusted to what is measured. Frame times are
// the time between animation frames while scrolling (p95): 60 fps on desktop, 30 fps on a phone,
// the latter measured with the CPU slowed 4x. A frame's time is a multiple of the 16.7 ms refresh,
// so the limits sit a hair above 1 and 2 refreshes: p95 within them means 95% of frames made it.
export const BUDGET = {
    desktop: { drawCalls: 30, triangles: 50_000, frameP95Ms: 17 },
    mobile: { drawCalls: 30, triangles: 30_000, frameP95Ms: 34 },
};

export const SECTIONS = ['home', 'work', 'about', 'contact'];

/** Linear-interpolated percentile (p in 0..100) of a list of numbers. NaN for an empty list. */
export function percentile(values, p) {
    if (values.length === 0) return Number.NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const rank = (p / 100) * (sorted.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

export function summarize(values) {
    return {
        n: values.length,
        p50: percentile(values, 50),
        p95: percentile(values, 95),
        max: values.length ? Math.max(...values) : Number.NaN,
    };
}

/** What the budget says about one measured cell: each limit with its value and whether it holds. */
export function checkBudget(viewport, { drawCalls, triangles, frameP95Ms }) {
    const budget = BUDGET[viewport];
    const check = (limit, value) => ({ limit, value, ok: value <= limit });
    return {
        drawCalls: check(budget.drawCalls, drawCalls),
        triangles: check(budget.triangles, triangles),
        frameP95Ms: check(budget.frameP95Ms, frameP95Ms),
    };
}

function fixed(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function number(value) {
    return Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : 'n/a';
}

function table(header, rows) {
    const line = cells => `| ${cells.join(' | ')} |`;
    return [line(header), line(header.map(() => '---')), ...rows.map(line)].join('\n');
}

export function inventorySummary(inventory) {
    const meshes = inventory.meshes;
    const total = meshes.reduce((sum, mesh) => sum + mesh.triangles, 0);
    const seenAnywhere = mesh => Object.values(mesh.seenFrom).some(Boolean);
    const neverSeen = meshes.filter(mesh => !seenAnywhere(mesh));
    const hiddenInSeen = meshes
        .filter(seenAnywhere)
        .reduce((sum, mesh) => sum + (mesh.faces?.hiddenTriangles ?? 0), 0);
    const byOrigin = new Map();
    for (const mesh of meshes) {
        const entry = byOrigin.get(mesh.origin) ?? { meshes: 0, triangles: 0 };
        entry.meshes += 1;
        entry.triangles += mesh.triangles;
        byOrigin.set(mesh.origin, entry);
    }
    return {
        meshes: meshes.length,
        triangles: total,
        materials: new Set(meshes.map(mesh => mesh.material.id)).size,
        neverSeenMeshes: neverSeen.length,
        neverSeenTriangles: neverSeen.reduce((sum, mesh) => sum + mesh.triangles, 0),
        hiddenTrianglesInSeenMeshes: hiddenInSeen,
        shadowCasters: meshes.filter(mesh => mesh.castShadow).length,
        byOrigin: Object.fromEntries(byOrigin),
    };
}

function renderInventory(inventory) {
    const summary = inventorySummary(inventory);
    const viewports = Object.keys(inventory.meshes[0]?.seenFrom ?? {});
    const rows = inventory.meshes.map(mesh => [
        `\`${mesh.path}\``,
        mesh.origin,
        mesh.geometry.replace('Geometry', ''),
        number(mesh.triangles),
        `${mesh.material.id} ${mesh.material.type.replace('Mesh', '').replace('Material', '')}`,
        mesh.castShadow ? 'yes' : 'no',
        ...viewports.map(name => (mesh.seenFrom[name] ? 'yes' : '**never**')),
        mesh.faces
            ? mesh.faces.hiddenFaces.length
                ? `${mesh.faces.hiddenFaces.join(' ')} (${mesh.faces.hiddenTriangles} tris)`
                : mesh.faces.hiddenTriangles
                  ? `${mesh.faces.hiddenTriangles} tris`
                  : '–'
            : 'n/a',
    ]);
    const byOrigin = Object.entries(summary.byOrigin).map(([origin, entry]) => [
        origin,
        entry.meshes,
        number(entry.triangles),
    ]);

    return [
        `${summary.meshes} meshes, ${number(summary.triangles)} triangles, ${summary.materials} ` +
            `material instances, ${summary.shadowCasters} shadow casters. ` +
            `${summary.neverSeenMeshes} meshes (${number(summary.neverSeenTriangles)} triangles) ` +
            `are never seen from the camera path, and the meshes that are seen carry ` +
            `${number(summary.hiddenTrianglesInSeenMeshes)} triangles on faces that never are.`,
        table(['Origin', 'Meshes', 'Triangles'], byOrigin),
        table(
            [
                'Mesh',
                'Origin',
                'Geometry',
                'Triangles',
                'Material',
                'Casts shadow',
                ...viewports.map(name => `Seen (${name})`),
                'Hidden faces',
            ],
            rows
        ),
        '“Never” means no sampled camera position (21 along the path, with the mouse at both ' +
            'ends on desktop) sees any of the mesh through anything in front of it. A mesh that ' +
            'is never seen can still cast a shadow that is. GLB meshes are checked on a sample of ' +
            'their triangles first and then on all of them.',
        table(
            ['Light', 'Type', 'Intensity', 'Casts shadow', 'Shadow map'],
            inventory.lights.map(light => [
                `\`${light.path}\``,
                light.type,
                light.intensity,
                light.castShadow ? 'yes' : 'no',
                light.shadowMapSize ?? '–',
            ])
        ),
    ].join('\n\n');
}

function renderResults(results, modes) {
    const sections = [];
    for (const mode of modes) {
        for (const viewport of ['desktop', 'mobile']) {
            const cells = results.filter(r => r.mode === mode && r.viewport === viewport);
            if (cells.length === 0) continue;
            const budget = BUDGET[viewport];
            const rows = SECTIONS.map(section => {
                const cell = cells.find(r => r.section === section);
                if (!cell) return [section, ...Array(11).fill('n/a')];
                const mark = ok => (ok ? '' : ' ⚠');
                const checks = checkBudget(viewport, {
                    drawCalls: cell.calls,
                    triangles: cell.triangles,
                    frameP95Ms: cell.frameMs.p95,
                });
                return [
                    section,
                    `${number(cell.calls)}${mark(checks.drawCalls.ok)} (peak ${number(cell.peak.calls)})`,
                    `${number(cell.shadow.calls)}`,
                    `${number(cell.triangles)}${mark(checks.triangles.ok)} (peak ${number(cell.peak.triangles)})`,
                    number(cell.textures),
                    number(cell.geometries),
                    number(cell.programs),
                    fixed(cell.frameMs.p50),
                    `${fixed(cell.frameMs.p95)}${mark(checks.frameP95Ms.ok)}`,
                    fixed(cell.renderMs.p50),
                    fixed(cell.renderMs.p95),
                    `${cell.renders} / ${fixed(cell.heapMB)} MB`,
                ];
            });
            const throttle = viewport === 'mobile' ? ', CPU 4x slower' : '';
            sections.push(
                `#### ${mode} · ${viewport}${throttle}\n\n` +
                    `Budget: ≤ ${budget.drawCalls} draw calls, ≤ ${number(budget.triangles)} ` +
                    `triangles, frame p95 ≤ ${budget.frameP95Ms} ms (⚠ = over).\n\n` +
                    table(
                        [
                            'Section',
                            'Draw calls',
                            'of which shadows',
                            'Triangles',
                            'Textures',
                            'Geometries',
                            'Programs',
                            'Frame p50 (ms)',
                            'Frame p95 (ms)',
                            'Render p50 (ms)',
                            'Render p95 (ms)',
                            'Renders / JS heap',
                        ],
                        rows
                    )
            );
        }
    }
    return sections.join('\n\n');
}

// Why the limits are what they are, to be read next to the table below it.
export const BUDGET_RATIONALE = [
    'The starting targets hold as the **end goal** of phase C: ≤ 30 draw calls (shadow passes included), ' +
        '≤ 50,000 triangles on desktop and ≤ 30,000 on mobile, frame p95 within one refresh on desktop ' +
        '(≤ 17 ms) and two on mobile with the CPU 4x slower (≤ 34 ms). Only the frame limits moved: the ' +
        'measure is quantized to the 16.7 ms refresh, so 16.8 is one refresh and not a miss.',
    '**What the baseline says about getting there.** The desktop numbers are dominated by the shadows: ' +
        'three shadow-casting lights redraw all 63 casters every frame (188 draw calls and 75–99% of the ' +
        'desktop triangles, depending on the section) before the picture itself, which is 13–71 calls depending on the section. Mobile ' +
        'has no shadows and sits at 9–42 calls and under 17,000 triangles, so its triangle budget already ' +
        'holds; its calls and its frame time do not. The mobile frame p95 is 33–39 ms, ' +
        'and the Home section holds 34 ms with 9 calls while Work (20) and About (39) do not, so some of ' +
        'that cost is not the scene (the page scroll and the CSS3D layer share the throttled thread).',
    '**Interim limits per ticket**, to be tightened as each one lands: T14 (merging) is expected to ' +
        'leave desktop under about 150 draw calls and 100,000 triangles and mobile under 30 calls; ' +
        'T15 (baked lights) removes the shadow passes of static geometry and should bring desktop under ' +
        '60 calls and 50,000 triangles; reaching 30 calls on both needs the GLB meshes (keyboard, handles, ' +
        'books) merged as well, which no ticket of phase C plans yet. The door handles alone are ' +
        '8,576 of the 31,982 triangles of the scene, four copies of a 2,144-triangle model.',
    'SwiftShader numbers are a relative reference only (a frame there takes seconds); the budget is ' +
        'judged on the real GPU rows.',
];

function renderBudget(data) {
    const rows = [];
    for (const mode of data.config.modes.filter(mode => mode === 'gl-egl')) {
        for (const viewport of ['desktop', 'mobile']) {
            const cells = data.results.filter(r => r.mode === mode && r.viewport === viewport);
            if (cells.length === 0) continue;
            const budget = BUDGET[viewport];
            const worst = pick => Math.max(...cells.map(pick));
            const cost = (value, limit) => `${number(value)} / ${number(limit)}${value > limit ? ' ⚠' : ''}`;
            rows.push([
                mode,
                viewport,
                cost(worst(c => c.calls), budget.drawCalls),
                cost(worst(c => c.triangles), budget.triangles),
                `${fixed(worst(c => c.frameMs.p95))} / ${budget.frameP95Ms}${worst(c => c.frameMs.p95) > budget.frameP95Ms ? ' ⚠' : ''}`,
            ]);
        }
    }
    return [
        ...BUDGET_RATIONALE,
        'Worst section of the real-GPU run against the end goal (measured / budget):',
        table(['Mode', 'Viewport', 'Draw calls', 'Triangles', 'Frame p95 (ms)'], rows),
    ].join('\n\n');
}

/** The report in docs/perf/baseline.md, from the data in baseline.json. */
export function renderMarkdown(data) {
    const gpus = Object.entries(data.environment.renderers)
        .map(([mode, name]) => `- **${mode}**: ${name}`)
        .join('\n');
    return [
        '# Scene performance baseline',
        'Generated by `npm run scene:profile`; the raw numbers are in `baseline.json`.',
        '## How it was measured',
        [
            `- Commit \`${data.environment.commit}\`, ${data.environment.chromium}, Node ${data.environment.node}.`,
            `- Production build served by \`astro preview\`, page loaded with \`?debug=perf\`.`,
            `- Viewports: desktop 1440×900, mobile 390×844 with the CPU throttled ${data.config.mobileCpuThrottle}× over CDP.`,
            `- Per section: the page scrolls from the top to the bottom of that section in ${data.config.scrollMs / 1000} s while frames are recorded.`,
            '- **Draw calls / triangles**: `renderer.info` of each rendered frame (the shadow passes included), median over the section with the peak next to it; the loop skips frames once the picture is still, so only frames drawn during the scroll count.',
            '- **Frame**: time between animation frames. On a real GPU the browser caps it at the display rate, so p50 sits at 16.7 ms; the tail (p95) is what shows jank.',
            '- **Render**: time of `renderer.render` plus `gl.finish()`, i.e. CPU submission and GPU work together.',
            '- **JS heap**: `Runtime.getHeapUsage` after a forced GC, at the end of the section.',
            gpus,
        ].join('\n'),
        '## Results',
        renderResults(data.results, data.config.modes),
        '## Scene inventory',
        renderInventory(data.inventory),
        '## Proposed budget',
        renderBudget(data),
    ].join('\n\n');
}

function change(before, after, digits = 0) {
    const show = value => (digits ? fixed(value, digits) : number(value));
    if (!Number.isFinite(before) || !Number.isFinite(after)) return `${show(before)} → ${show(after)}`;
    const delta = before === 0 ? 0 : ((after - before) / before) * 100;
    const sign = delta > 0 ? '+' : '';
    return `${show(before)} → ${show(after)} (${sign}${delta.toFixed(0)}%)`;
}

/** Before/after tables for two profile runs (the JSON files of `npm run scene:profile`). */
export function renderComparison(before, after, labels = { before: 'before', after: 'after' }) {
    const sections = [];
    for (const mode of after.config.modes) {
        for (const viewport of ['desktop', 'mobile']) {
            const rows = SECTIONS.flatMap(section => {
                const find = data =>
                    data.results.find(r => r.mode === mode && r.viewport === viewport && r.section === section);
                const [b, a] = [find(before), find(after)];
                if (!b || !a) return [];
                return [
                    [
                        section,
                        change(b.calls, a.calls),
                        change(b.triangles, a.triangles),
                        change(b.frameMs.p50, a.frameMs.p50, 1),
                        change(b.frameMs.p95, a.frameMs.p95, 1),
                        change(b.renderMs.p50, a.renderMs.p50, 1),
                        change(b.renderMs.p95, a.renderMs.p95, 1),
                    ],
                ];
            });
            if (rows.length === 0) continue;
            const throttle = viewport === 'mobile' ? ', CPU 4x slower' : '';
            sections.push(
                `#### ${mode} · ${viewport}${throttle}\n\n` +
                    table(
                        [
                            'Section',
                            'Draw calls',
                            'Triangles',
                            'Frame p50 (ms)',
                            'Frame p95 (ms)',
                            'Render p50 (ms)',
                            'Render p95 (ms)',
                        ],
                        rows
                    )
            );
        }
    }

    const [summaryBefore, summaryAfter] = [before, after].map(data => inventorySummary(data.inventory));
    const inventoryRows = [
        ['Meshes', summaryBefore.meshes, summaryAfter.meshes],
        ['Triangles', number(summaryBefore.triangles), number(summaryAfter.triangles)],
        ['Material instances', summaryBefore.materials, summaryAfter.materials],
        ['Shadow casters', summaryBefore.shadowCasters, summaryAfter.shadowCasters],
        [
            'Meshes never seen',
            `${summaryBefore.neverSeenMeshes} (${number(summaryBefore.neverSeenTriangles)} triangles)`,
            `${summaryAfter.neverSeenMeshes} (${number(summaryAfter.neverSeenTriangles)} triangles)`,
        ],
        [
            'Triangles on faces never seen (in seen meshes)',
            number(summaryBefore.hiddenTrianglesInSeenMeshes),
            number(summaryAfter.hiddenTrianglesInSeenMeshes),
        ],
    ];

    return [
        `Each cell: ${labels.before} → ${labels.after}. Same viewports, sections and method for both.`,
        ...sections,
        '#### Scene inventory',
        table(['', labels.before, labels.after], inventoryRows),
    ].join('\n\n');
}
