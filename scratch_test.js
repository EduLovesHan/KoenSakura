import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { inspect } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
    });

const doc = await io.read('./public/assets/models/foocourt.glb');
const report = inspect(doc);
console.log('Keys in report:', Object.keys(report));
console.log('Textures:', report.textures);
