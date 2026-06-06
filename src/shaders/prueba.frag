varying vec3 vNormal;

void main() {
    // Mapear el componente Y de la normal normalizada de [-1, 1] a [0, 1]
    // El eje Y apunta hacia "arriba" en el espacio local/vista
    float mixFactor = (vNormal.y + 1.0) * 0.5;
    
    // Color rosa flor de cerezo (Sakura) para las caras que apuntan arriba
    vec3 colorArriba = vec3(1.0, 0.5, 0.7);
    
    // Color verde musgo/jardín para las caras que apuntan abajo
    vec3 colorAbajo = vec3(0.3, 0.6, 0.3);
    
    // Interpolar colores según la inclinación de la normal
    vec3 colorFinal = mix(colorAbajo, colorArriba, mixFactor);
    
    gl_FragColor = vec4(colorFinal, 1.0);
}
