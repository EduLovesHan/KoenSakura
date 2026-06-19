import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import {
    meshopt,
    dedup,
    weld,
    quantize,
    prune,
    resample,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { statSync } from 'fs';
import { join as pathJoin } from 'path';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
    });

const MODELS_DIR = './public/assets/models';

const MODELOS_PRIORIDAD = [
    'plazaPrincipal_optimizado.glb',
    'foocourt.glb',
    'loboBoy_optimized.glb',
    'loboGirl_optimized.glb',
    'monedero.glb',
    'toro2.glb',
    'foodLetrero.glb',
    'museo.glb',
    'stand.glb',
    'ichirakuRamen.glb',
    'geisha_optimized.glb',
    'perroCat.glb',
    'maquina.glb',
    'vestidor.glb',
    'toro.glb',
    'yokaiOkiku.glb',
    'yokaiJorogumo.glb',
    'ciervoComiendo.glb',
    'mesaAmbientada.glb',
    'samurai.glb',
    'plato.glb',
    'maqHiroshima.glb',
    'monje.glb',
    'ciervoSamba.glb',
    'kimono.glb',
    'mesitaMusica.glb',
    'walk.glb',
    'toroStone.glb',
    'gatoGrisMov.glb',
    'utah.glb',
    'pezKoi.glb',
    'mostrador.glb',
    'hiroshima.glb',
    'disc.glb',
    'estatuaHachiko.glb',
    'estatua.glb',
    'mesaMaqueta.glb',
    'pedestalMuseo.glb',
    'lampara.glb',
    'plazaLago.glb',
    'ramen.glb',
    'foodTable.glb',
    'fresco.glb',
    'plantaSakura.glb',
    'ciervoViendoAlCielo.glb',
    'banca.glb',
    'bandera.glb',
    'altar.glb',
    'guoba.glb',
    'gatoNegroMov.glb',
    'luzNoche.glb',
    'farolaPrueba.glb',
    'bamboo.glb',
    'bonsai.glb',
    'arbolCerezoPequeño.glb',
    'arbolPino.glb',
    'arbol1.glb',
    'arbol2.glb',
    'arbol3.glb',
];

let totalAntes = 0;
let totalDespues = 0;
let procesados = 0;
let errores = 0;

function getSizeMB(filepath) {
    try {
        return statSync(filepath).size / (1024 * 1024);
    } catch {
        return 0;
    }
}

async function comprimirModelo(nombreArchivo) {
    const rutaCompleta = pathJoin(MODELS_DIR, nombreArchivo);

    let sizeAntes;
    try {
        sizeAntes = getSizeMB(rutaCompleta);
    } catch (e) {
        // console.log(`No encontrado: ${nombreArchivo}`);
        return;
    }

    totalAntes += sizeAntes;
    // console.log(`\n ${nombreArchivo} (${sizeAntes.toFixed(2)} MB)`);

    try {
        const doc = await io.read(rutaCompleta);

        await doc.transform(
            dedup(),
            prune(),
            weld({ tolerance: 0.0001 }),
            meshopt({ encoder: MeshoptEncoder, level: 'high' })
        );

        await io.write(rutaCompleta, doc);

        const sizeDespues = getSizeMB(rutaCompleta);
        totalDespues += sizeDespues;
        const reduccion = ((1 - sizeDespues / sizeAntes) * 100).toFixed(1);
        // console.log(`  ${sizeDespues.toFixed(2)} MB (↓${reduccion}%)`);
        procesados++;
    } catch (err) {
        // console.error(` Error: ${err.message}`);
        totalDespues += sizeAntes; // Contamos el tamaño original si falla
        errores++;
    }
}

// console.log(` Directorio: ${MODELS_DIR}`);
// console.log(` Modelos a procesar: ${MODELOS_PRIORIDAD.length}\n`);
// console.log('─'.repeat(50));

for (const modelo of MODELOS_PRIORIDAD) {
    await comprimirModelo(modelo);
}

// console.log('\n' + '═'.repeat(50));
// console.log('RESUMEN:');
// console.log(`Procesados: ${procesados}  Errores: ${errores} `);
// console.log(`Tamaño original:    ${totalAntes.toFixed(2)} MB`);
// console.log(`Tamaño comprimido:  ${totalDespues.toFixed(2)} MB`);
// console.log(`Reducción total:    ${((1 - totalDespues / totalAntes) * 100).toFixed(1)}%`);
// console.log('═'.repeat(50));
