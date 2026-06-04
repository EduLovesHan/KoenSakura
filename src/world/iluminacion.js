import * as THREE from 'three';
export const materialesEmisivos = [];
let ambientLight, directionalLight;
let esNoche = false;

// Instanciar las luces en la escena
export function inicializarIluminacion(scene) {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
}

// Lógica matemática y visual del cambio de skybox
export function alternarDiaNoche(skybox) {
    esNoche = !esNoche;
    
    if (esNoche) {
        ambientLight.color.setHex(0x223355); 
        ambientLight.intensity = 0.3;
        directionalLight.color.setHex(0x5577aa); 
        directionalLight.intensity = 0.3;
        skybox.cambiarRuta('assets/texturas/SkyBoxNoche/', '.png'); 
        
        materialesEmisivos.forEach(mat => mat.emissiveIntensity = 5.0); 
    } else {
        ambientLight.color.setHex(0xffffff); 
        ambientLight.intensity = 0.6;
        directionalLight.color.setHex(0xffffff); 
        directionalLight.intensity = 1.0;
        skybox.cambiarRuta('assets/texturas/SkyBoxAtardecer/', '.png'); 
        
        materialesEmisivos.forEach(mat => mat.emissiveIntensity = 0.0);
    }
    
    return { ambInt: ambientLight.intensity, dirInt: directionalLight.intensity };
}

// Conectarsliders con las luces
export function configurarControlesIluminacion(skybox) {
    const luzAmbSlider = document.getElementById('luz-amb-slider');
    const luzDirSlider = document.getElementById('luz-dir-slider');
    const modoNocheCheckbox = document.getElementById('modo-noche-checkbox');

    const actualizarUI = (ints) => {
        if (luzAmbSlider) luzAmbSlider.value = ints.ambInt;
        if (luzDirSlider) luzDirSlider.value = ints.dirInt;
        if (modoNocheCheckbox) modoNocheCheckbox.checked = esNoche;
    };

    // alternar rapido con N
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'n') {
            const nuevasIntensidades = alternarDiaNoche(skybox);
            actualizarUI(nuevasIntensidades);
        }
    });

    // Eventos de los Sliders del menú
    if (luzAmbSlider) {
        luzAmbSlider.addEventListener('input', (e) => {
            ambientLight.intensity = parseFloat(e.target.value);
        });
    }
    if (luzDirSlider) {
        luzDirSlider.addEventListener('input', (e) => {
            directionalLight.intensity = parseFloat(e.target.value);
        });
    }
    
    if (modoNocheCheckbox) {
        modoNocheCheckbox.addEventListener('change', () => {
            const nuevasIntensidades = alternarDiaNoche(skybox);
            actualizarUI(nuevasIntensidades);
        });
    }
}