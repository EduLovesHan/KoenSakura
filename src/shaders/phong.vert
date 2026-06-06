varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    
    // Transformar normales a espacio de cámara
    vNormal = normalize(normalMatrix * normal);
    
    // Transformar posición del vértice a espacio de cámara
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vPosition = viewPosition.xyz;
    
    gl_Position = projectionMatrix * viewPosition;
}
