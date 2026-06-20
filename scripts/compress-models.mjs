import { execSync } from 'child_process';
import { statSync } from 'fs';
import { join as pathJoin } from 'path';

const MODELS_DIR = './public/assets/models';

// Lista de modelos a optimizar (excluyendo plazaPrincipal_optimizado.glb, museo.glb y ichirakuRamen.glb)
const MODELOS_A_COMPRIMIR = [
    'foocourt.glb',
    'loboBoy_optimized.glb',
    'loboGirl_optimized.glb',
    'monedero.glb',
    'foodLetrero.glb',
    'stand.glb',
    'geisha_optimized.glb',
    'perroCat.glb',
    'maquina.glb',
    'vestidor.glb',
    'yokaiOkiku.glb',
    'yokaiJorogumo.glb',
    'ciervoComiendo.glb',
    'samurai.glb',
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
    'lampara.glb',
    'plazaLago.glb',
    'ramen.glb',
    'foodTable.glb',
    'fresco.glb',
    'ciervoViendoAlCielo.glb',
    'banca.glb',
    'bandera.glb',
    'altar.glb',
    'guoba.glb',
    'gatoNegroMov.glb',
    'luzNoche.glb',
    'farolaPrueba.glb',
    'bamboo.glb',
    'arbol1.glb',
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

function runCLI(cmd) {
    try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

async function comprimirModelo(nombreArchivo) {
    const ruta = pathJoin(MODELS_DIR, nombreArchivo);
    const sizeAntes = getSizeMB(ruta);
    if (sizeAntes === 0) return; // No existe el archivo

    totalAntes += sizeAntes;
    console.log(`\n📦 Procesando: ${nombreArchivo} (${sizeAntes.toFixed(2)} MB)`);

    const nameLower = nombreArchivo.toLowerCase();
    let ok = true;

    // 1. Simplificación de geometría para modelos densos y pesados (> 3MB, lobos)
    if (sizeAntes > 3.0 && (nameLower.includes('lobo') || nameLower.includes('girl') || nameLower.includes('boy'))) {
        console.log(`  └─ Simplificando geometría (ratio 0.75)...`);
        ok = ok && runCLI(`npx gltf-transform simplify ${ruta} ${ruta} --ratio 0.75`);
    }

    // 2. Redimensionado de texturas para modelos de entorno grandes (> 2MB)
    if (sizeAntes > 2.0 && (nameLower.includes('court') || nameLower.includes('letrero') || nameLower.includes('stand') || nameLower.includes('monedero'))) {
        console.log(`  └─ Redimensionando texturas a máx 1024px...`);
        ok = ok && runCLI(`npx gltf-transform resize ${ruta} ${ruta} --width 1024 --height 1024`);
    }

    // 3. Compresión WebP de texturas (para todos los modelos)
    console.log(`  └─ Convirtiendo texturas a WebP...`);
    ok = ok && runCLI(`npx gltf-transform webp ${ruta} ${ruta}`);

    // 4. Re-aplicación de compresión Draco (para asegurar máxima compresión al final)
    console.log(`  └─ Aplicando compresión Draco...`);
    ok = ok && runCLI(`npx gltf-transform draco ${ruta} ${ruta}`);

    if (ok) {
        const sizeDespues = getSizeMB(ruta);
        totalDespues += sizeDespues;
        const reduccion = ((1 - sizeDespues / sizeAntes) * 100).toFixed(1);
        console.log(`  ✅ Completado: ${sizeAntes.toFixed(2)} MB -> ${sizeDespues.toFixed(2)} MB (↓${reduccion}%)`);
        procesados++;
    } else {
        console.log(`  ❌ Error durante la optimización. Se mantendrá el archivo original.`);
        // Restaurar archivo original usando git para no dejar un archivo corrupto o a medias
        runCLI(`git restore ${ruta}`);
        totalDespues += sizeAntes;
        errores++;
    }
}

console.log(`=======================================================`);
console.log(`Directorios de modelos: ${MODELS_DIR}`);
console.log(`Modelos a optimizar: ${MODELOS_A_COMPRIMIR.length}`);
console.log(`Excluidos: plazaPrincipal_optimizado.glb, museo.glb, ichirakuRamen.glb`);
console.log(`=======================================================`);

for (const modelo of MODELOS_A_COMPRIMIR) {
    await comprimirModelo(modelo);
}

console.log(`\n=======================================================`);
console.log(`RESUMEN DE OPTIMIZACIÓN:`);
console.log(`Procesados con éxito: ${procesados}  Errores/Cancelados: ${errores}`);
console.log(`Tamaño original total: ${totalAntes.toFixed(2)} MB`);
console.log(`Tamaño optimizado total: ${totalDespues.toFixed(2)} MB`);
const totalReduccion = ((1 - totalDespues / totalAntes) * 100).toFixed(1);
console.log(`Reducción total: ${totalReduccion}%`);
console.log(`=======================================================`);
