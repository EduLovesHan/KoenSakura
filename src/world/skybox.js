import * as THREE from 'three';

// Clase para gestionar y cargar un Skybox basado en Cubemap y un domo nocturno para transición suave (crossfade)
class Skybox {
    constructor(escena) {
        this.escena = escena;
        this.loader = new THREE.CubeTextureLoader();
        
        const texturas = [
            'right.png', 'left.png',
            'top.png', 'bottom.png',
            'front.png', 'back.png'
        ];

        // 1. Precargar Skybox de Día (Atardecer)
        this.loader.setPath('assets/texturas/SkyBoxAtardecer/');
        this.texturaDia = this.loader.load(
            texturas,
            undefined,
            undefined,
            (error) => console.error("Error al precargar Skybox de Día:", error)
        );

        // 2. Precargar Skybox de Noche
        this.loader.setPath('assets/texturas/SkyBoxNoche/');
        this.texturaNoche = this.loader.load(
            texturas,
            undefined,
            undefined,
            (error) => console.error("Error al precargar Skybox de Noche:", error)
        );

        // Asignar el de día como fondo de escena inicial
        this.escena.background = this.texturaDia;

        // 3. Crear el domo nocturno para el Crossfade
        const radio = 800;
        const geometriaEsfera = new THREE.SphereGeometry(radio, 32, 32);

        // Shader personalizado para mapear la CubeTexture de Noche con opacidad
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

    // Centrar la esfera de noche en la posición de la cámara en cada frame
    actualizar(camara) {
        if (this.esferaNoche && camara) {
            this.esferaNoche.position.copy(camara.position);
        }
    }
}

export { Skybox };
