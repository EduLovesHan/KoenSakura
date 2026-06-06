uniform vec3 uAmbientColor;
uniform float uAmbientIntensity;

uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uLightPosition; // Posición de la luz en espacio de cámara

uniform vec3 uSpecularColor;
uniform float uSpecularIntensity;
uniform float uShininess;
uniform vec3 uCameraPosition; // vec3(0,0,0) en espacio de cámara

uniform sampler2D uMap;
uniform float uHasTexture;
uniform vec3 uBaseColor;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    // Normalizar la normal recibida
    vec3 N = normalize(vNormal);
    
    // Dirección de la luz (desde el fragmento hacia la luz)
    vec3 L = normalize(uLightPosition - vPosition);
    
    // Dirección de la vista (desde el fragmento hacia la cámara)
    vec3 V = normalize(uCameraPosition - vPosition);
    
    // 1. Componente Ambiental
    vec3 ambient = uAmbientColor * uAmbientIntensity;
    
    // 2. Componente Difusa (Lambertian)
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = uLightColor * uLightIntensity * diff;
    
    // 3. Componente Especular (Phong)
    vec3 R = reflect(-L, N); // Vector de reflexión
    float spec = pow(max(dot(R, V), 0.0), uShininess);
    vec3 specular = uSpecularColor * uSpecularIntensity * spec;
    
    // Obtener color base (textura o color plano)
    vec4 texColor = vec4(1.0);
    if (uHasTexture > 0.5) {
        texColor = texture2D(uMap, vUv);
    }
    vec3 baseColor = texColor.rgb * uBaseColor;
    
    // Combinar iluminación Phong
    vec3 colorFinal = (ambient + diffuse) * baseColor + specular;
    
    gl_FragColor = vec4(colorFinal, texColor.a);
}
