import * as THREE from 'three';

// Clase para gestionar y cargar un Skybox basado en Cubemap
class Skybox {
    constructor(escena, ruta = 'assets/texturas/SkyBox/') {
        this.escena = escena;
        this.ruta = ruta;
        
        this.cargar();
    }

    cargar() {
        const loader = new THREE.CubeTextureLoader();
        loader.setPath(this.ruta);

        // carga de las 6 imagenes que conforman el cubemap
        const texturas = [
            'right.png', 'left.png',
            'top.png', 'bottom.png',
            'front.png', 'back.png'
            ];

        const textureCube = loader.load(texturas, 
            () => console.log("Skybox cargado correctamente"),
            undefined, 
            (error) => console.error("Error al cargar el skybox:", error)
        );

        // Asignar el cubemap al fondo de la escena
        this.escena.background = textureCube;
    }
}

export { Skybox };