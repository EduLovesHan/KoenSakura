import * as THREE from 'three';

class Skybox {
    /**
     * @param {THREE.Scene} escena
     * @param {THREE.LoadingManager|null} loadingManager  
     */
    constructor(escena, loadingManager = null) {
        this.escena = escena;
        this.loader = loadingManager
            ? new THREE.CubeTextureLoader(loadingManager)
            : new THREE.CubeTextureLoader();

        const textures = [
            'right.webp', 'left.webp',
            'top.webp', 'bottom.webp',
            'front.webp', 'back.webp'
        ];
        const esMovil = window.esMovil;
        const sufijoMovil = esMovil ? '_mobile' : '';

        // Skybox de Día
        this.loader.setPath(`assets/textures/SkyBox1${sufijoMovil}/`);
        this.texturaDia = this.loader.load(
            textures,
            undefined,
            undefined,
            (error) => console.error("Error al precargar Skybox de Día:", error)
        );

        // Skybox de Noche
        this.loader.setPath(`assets/textures/SkyBox2${sufijoMovil}/`);
        this.texturaNoche = this.loader.load(
            textures,
            undefined,
            undefined,
            (error) => console.error("Error al precargar Skybox de Noche:", error)
        );

        // Asignar el de día como fondo de escena inicial
        this.escena.background = this.texturaDia;

        // Crear el domo nocturno para el Crossfade
        const radio = esMovil ? 270 : 800;
        const geometriaEsfera = new THREE.SphereGeometry(radio, esMovil ? 16 : 32, esMovil ? 16 : 32);

        // Shader para mapear la CubeTexture de Noche con opacidad
        this.materialEsferaNoche = new THREE.ShaderMaterial({
            uniforms: {
                tCube: { value: this.texturaNoche },
                opacity: { value: 0.0 }
            },
            vertexShader: `
                varying vec3 vDirection;
                void main() {
                    vDirection = position;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    // Forzar a que se dibuje en el plano lejano para que actúe de fondo
                    gl_Position.z = gl_Position.w;
                }
            `,
            fragmentShader: `
                uniform samplerCube tCube;
                uniform float opacity;
                varying vec3 vDirection;
                void main() {
                    #if __VERSION__ >= 300
                        vec4 texColor = texture(tCube, normalize(vDirection));
                    #else
                        vec4 texColor = textureCube(tCube, normalize(vDirection));
                    #endif
                    gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
            transparent: true
        });

        this.esferaNoche = new THREE.Mesh(geometriaEsfera, this.materialEsferaNoche);
        this.escena.add(this.esferaNoche);
    }

    // Centrar la esfera de noche en la posición de la cámara
    actualizar(camara) {
        if (this.esferaNoche && camara) {
            this.esferaNoche.position.copy(camara.position);
        }
    }
}

export { Skybox };
