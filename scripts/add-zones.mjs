
import { readFileSync, writeFileSync } from 'fs';

const PATH = './public/assets/objectMap.json';
const data = JSON.parse(readFileSync(PATH, 'utf-8'));


const ZONA_MAP = {
    // zona principal
    'assets/models/plazaPrincipal_optimizado.glb': 'principal',
    'assets/models/plazaPrincipal_colisiones.glb': 'principal',
    'assets/models/bandera.glb': 'principal',
    'assets/models/farolaPrueba.glb': 'principal',
    'assets/models/bamboo.glb': 'principal',
    'assets/models/cerezo2.glb': 'principal',
    'assets/models/cerezo.glb': 'principal',
    'assets/models/arbol1.glb': 'principal',


    'assets/models/arbolCerezoPequeño.glb': 'principal',
    'assets/models/vegetacion.glb': 'principal',
    'assets/models/vegetacion2.glb': 'principal',

    'assets/models/banca.glb': 'principal',
    'assets/models/toroStone.glb': 'principal',
    'assets/models/stand.glb': 'principal',
    'assets/models/letreroBasico.glb': 'principal',
    'assets/models/gatoNegroMov.glb': 'principal',
    'assets/models/gatoGrisMov.glb': 'principal',
    'assets/models/ciervoSamba.glb': 'principal',
    'assets/models/linterna.glb': 'principal',

    'assets/models/museo.glb': 'principal',

    //  zona museo   
    'assets/models/loboGirl_optimized.glb': 'museo',
    'assets/models/loboBoy_optimized.glb': 'museo',
    'assets/models/monje.glb': 'museo',
    'assets/models/samurai.glb': 'museo',
    'assets/models/geisha_optimized.glb': 'museo',
    'assets/models/kimono.glb': 'museo',
    'assets/models/vestidor.glb': 'museo',
    'assets/models/mesitaMusica.glb': 'museo',
    'assets/models/utah.glb': 'museo',
    'assets/models/walk.glb': 'museo',
    'assets/models/disc.glb': 'museo',
    'assets/models/luzNoche.glb': 'museo',
    'assets/models/lampara.glb': 'museo',



    'assets/models/infoMuseo.glb': 'museo',
    'assets/models/infoMaqueta.glb': 'museo',
    'assets/models/bonsai.glb': 'museo',

    // zona dentro del museo
    'assets/models/pisoHiroshima.glb': 'hiroshima',
    'assets/models/hiroshima.glb': 'hiroshima',
    'assets/models/maqHiroshima.glb': 'hiroshima',
    'assets/models/perroCat.glb': 'hiroshima',
    'assets/models/estatuaHachiko.glb': 'hiroshima',

    'assets/models/mostrador.glb': 'hiroshima',
    'assets/models/fresco.glb': 'hiroshima',


    //  zona yokai 
    'assets/models/yokaiOkiku.glb': 'yokai',
    'assets/models/yokaiJorogumo.glb': 'yokai',
    'assets/models/muñeca.glb': 'yokai',
    'assets/models/kokeshi.glb': 'yokai',
    'assets/models/altar.glb': 'yokai',

    //  zona comida
    'assets/models/ichirakuRamen.glb': 'ramen',

    'assets/models/foocourt.glb': 'ramen',
    'assets/models/foodLetrero.glb': 'ramen',
    'assets/models/foodTable.glb': 'ramen',
    'assets/models/guoba.glb': 'ramen',
    'assets/models/naruto1.glb': 'ramen',
    'assets/models/naruto2.glb': 'ramen',
    'assets/models/ramen.glb': 'ramen',
    'assets/models/maquina.glb': 'ramen',
    'assets/models/eva.glb': 'ramen',
    'assets/models/monedero.glb': 'ramen',


    'assets/models/menta.glb': 'ramen',

    //  zona lago
    'assets/models/pezKoi.glb': 'lago',
    'assets/models/plazaLago.glb': 'lago',
    'assets/models/ciervoComiendo.glb': 'lago',
    'assets/models/ciervoViendoAlCielo.glb': 'lago',


    //  principal

};

const ZONA_FALLBACK = 'principal';
let count = { principal: 0, museo: 0, hiroshima: 0, yokai: 0, ramen: 0, lago: 0, sin_zona: 0 };

const resultado = data.map(item => {
    const zona = ZONA_MAP[item.archivo] || ZONA_FALLBACK;
    if (!ZONA_MAP[item.archivo]) {
        console.warn(`⚠️  Sin zona asignada: ${item.archivo} → fallback '${ZONA_FALLBACK}'`);
        count.sin_zona++;
    } else {
        count[zona] = (count[zona] || 0) + 1;
    }
    return { ...item, zona };
});

writeFileSync(PATH, JSON.stringify(resultado, null, 2), 'utf-8');

// console.log('Distribución por zona:');
// Object.entries(count).forEach(([zona, n]) => {
//     if (n > 0) console.log(`${zona}: ${n} modelos`);
// });
