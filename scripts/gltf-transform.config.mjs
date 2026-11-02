// Custom gltf-transform commands, loaded with --config by optimize-models.mjs.
import { compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const GEOMETRY_ATTRIBUTES = ['POSITION', 'NORMAL'];
const GEOMETRY_EXTENSIONS = ['EXT_meshopt_compression', 'KHR_mesh_quantization'];

// Tuned against the real camera path: above these, the shading of the mouse seam and the chair
// starts to change on screen before the silhouette does.
const SIMPLIFY_ERROR = 0.002;
const NORMAL_WEIGHT = 0.5;

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
async function simplifyWithNormals(document) {
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
                [NORMAL_WEIGHT, NORMAL_WEIGHT, NORMAL_WEIGHT],
                null,
                0,
                SIMPLIFY_ERROR,
                []
            );
            indices.setArray(new (indices.getArray().constructor)(simplified));
            compactPrimitive(primitive);
        }
    }
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
        addCommand(
            'simplify-with-normals',
            'Simplify meshes weighing positions and normals',
            simplifyWithNormals
        );
    },
};
