import * as THREE from 'three';

export class Lights {
    constructor(scene) {
        this.scene = scene;
        
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
        this.scene.add(this.ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(10, 20, 10);
        this.scene.add(this.directionalLight);

        this.targetAmbientColor = new THREE.Color(0xffffff);
        this.targetAmbientIntensity = 0.6;
        this.targetDirColor = new THREE.Color(0xffffff);
        this.targetDirIntensity = 1.0;
        this.targetEmissiveIntensity = 0.0;
        
        this.materialesEmisivos = [];
    }

    alternarDiaNoche(esNoche) {
        if (esNoche) {
            this.targetAmbientColor.setHex(0x223355); 
            this.targetAmbientIntensity = 0.3;
            this.targetDirColor.setHex(0x5577aa); 
            this.targetDirIntensity = 0.3;
            this.targetEmissiveIntensity = 5.0; 
        } else {
            this.targetAmbientColor.setHex(0xffffff); 
            this.targetAmbientIntensity = 0.6;
            this.targetDirColor.setHex(0xffffff); 
            this.targetDirIntensity = 1.0;
            this.targetEmissiveIntensity = 0.0;
        }
    }

    update() {
        this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, this.targetAmbientIntensity, 0.03);
        this.ambientLight.color.lerp(this.targetAmbientColor, 0.03);
        
        this.directionalLight.intensity = THREE.MathUtils.lerp(this.directionalLight.intensity, this.targetDirIntensity, 0.03);
        this.directionalLight.color.lerp(this.targetDirColor, 0.03);
        
        this.materialesEmisivos.forEach(mat => {
            mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, this.targetEmissiveIntensity, 0.03);
        });
    }
}
