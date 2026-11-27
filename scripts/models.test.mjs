// @vitest-environment node
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { describe, expect, it } from 'vitest';

const MODELS = ['books', 'door_handle', 'keyboard', 'mouse', 'rounded_chair'];

async function read(model) {
    await MeshoptDecoder.ready;
    const io = new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    return (await io.read(`src/assets/models/${model}.glb`)).getRoot();
}

// Every model costs one draw call, and one more per shadow pass. `npm run models:optimize` ends
// each of them with `join`: a regression here is a model that went back to several meshes.
describe('bundled models', () => {
    it.each(MODELS)('%s is one mesh with one primitive, one node, no animation', async model => {
        const root = await read(model);

        expect(root.listMeshes()).toHaveLength(1);
        expect(root.listMeshes()[0].listPrimitives()).toHaveLength(1);
        expect(root.listNodes()).toHaveLength(1);
        expect(root.listAnimations()).toHaveLength(0);
    });

    it('the door handle stays under 1,300 triangles', async () => {
        const root = await read('door_handle');
        const triangles = root.listMeshes()[0].listPrimitives()[0].getIndices().getCount() / 3;

        expect(triangles).toBeLessThan(1300);
    });
});
