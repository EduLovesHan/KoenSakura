varying vec3 vNormal;

void main() {
    // Transformar y pasar la normal al fragment shader
    vNormal = normalize(normalMatrix * normal);
    
    // Calcular la posición final de proyección
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
