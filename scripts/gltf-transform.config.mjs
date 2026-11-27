// Custom gltf-transform commands, loaded with --config by optimize-models.mjs.
import { compactPrimitive, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const GEOMETRY_ATTRIBUTES = ['POSITION', 'NORMAL'];
const GEOMETRY_EXTENSIONS = ['EXT_meshopt_compression', 'KHR_mesh_quantization'];

// Tuned against the real camera path: above these, the shading of the mouse seam and the chair
// starts to change on screen before the silhouette does.
const SIMPLIFY_ERROR = 0.002;
const NORMAL_WEIGHT = 0.5;

// Keeps the first material of the file for every primitive. For models whose materials only differ
// in what the scene overrides (the color), so that `join` can make them one mesh.
function mergeMaterials(document) {
    const root = document.getRoot();
    const [kept, ...rest] = root.listMaterials();

    for (const mesh of root.listMeshes()) {
        for (const primitive of mesh.listPrimitives()) primitive.setMaterial(kept);
    }
    for (const material of rest) material.dispose();
}

// For models whose material is replaced in code: keeps only what the geometry needs.
function stripMaterials(document) {
    const root = document.getRoot();

    for (const mesh of root.listMeshes()) {
        for (const primitive of mesh.listPrimitives()) {
            primitive.setMaterial(null);
            for (const semantic of primitive.listSemantics()) {
                if (!GEOMETRY_ATTRIBUTES.includes(semantic)) {
                    primitive.setAttribute(semantic, null);
                }
            }
        }
    }
    for (const material of root.listMaterials()) material.dispose();
    for (const texture of root.listTextures()) texture.dispose();

    // Otherwise the file keeps declaring them as required (spec-gloss, webp).
    for (const extension of root.listExtensionsUsed()) {
        if (!GEOMETRY_EXTENSIONS.includes(extension.extensionName)) extension.dispose();
    }
}

// three.js never plays them: nothing in the scene creates an AnimationMixer.
async function stripAnimations(document) {
    for (const animation of document.getRoot().listAnimations()) animation.dispose();
    await document.transform(prune());
}

function readVec3(accessor) {
    const values = new Float32Array(accessor.getCount() * 3);
    const element = [0, 0, 0];
    for (let index = 0; index < accessor.getCount(); index++) {
        values.set(accessor.getElement(index, element), index * 3);
    }
    return values;
}

// The built-in `simplify` only weighs positions, which turned creases into dark streaks well
// before reaching a useful size. Weighing normals halved the mouse for the same quality.
function simplifyWithNormals(maxError, ratio, normalWeight) {
    return async document => {
        await MeshoptSimplifier.ready;

        for (const mesh of document.getRoot().listMeshes()) {
            for (const primitive of mesh.listPrimitives()) {
                const indices = primitive.getIndices();
                const [simplified] = MeshoptSimplifier.simplifyWithAttributes(
                    Uint32Array.from(indices.getArray()),
                    readVec3(primitive.getAttribute('POSITION')),
                    3,
                    readVec3(primitive.getAttribute('NORMAL')),
                    3,
                    [normalWeight, normalWeight, normalWeight],
                    null,
                    // Without a ratio only the error limits it, and the creases hold it up.
                    Math.floor((indices.getCount() * ratio) / 3) * 3,
                    maxError,
                    []
                );
                indices.setArray(new (indices.getArray().constructor)(simplified));
                compactPrimitive(primitive);
            }
        }
    };
}

export default {
    onProgramReady({ program, io, Session }) {
        const addCommand = (name, description, transform) =>
            program
                .command(name, description)
                .argument('<input>', 'Path to read the model from')
                .argument('<output>', 'Path to write the model to')
                .action(({ args, logger }) =>
                    Session.create(io, logger, args.input, args.output).transform(transform)
                );

        addCommand(
            'strip-materials',
            'Remove materials, textures and their vertex attributes',
            stripMaterials
        );
        addCommand('strip-animations', 'Remove animations and their data', stripAnimations);
        addCommand(
            'merge-materials',
            'Make every primitive use the first material of the file',
            mergeMaterials
        );

        program
            .command(
                'simplify-with-normals',
                'Simplify meshes weighing positions and normals'
            )
            .argument('<input>', 'Path to read the model from')
            .argument('<output>', 'Path to write the model to')
            .option('--error <number>', 'Largest error allowed, relative to the mesh', {
                validator: program.NUMBER,
                default: SIMPLIFY_ERROR,
            })
            .option('--normal-weight <number>', 'How much a normal that changes weighs against a vertex that moves', {
                validator: program.NUMBER,
                default: NORMAL_WEIGHT,
            })
            .option('--ratio <number>', 'Share of the triangles to aim for (0 = limited by error)', {
                validator: program.NUMBER,
                default: 0,
            })
            .action(({ args, options, logger }) =>
                Session.create(io, logger, args.input, args.output).transform(
                    simplifyWithNormals(options.error, options.ratio, options.normalWeight)
                )
            );
    },
};
