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

// ── Point Lights del Pool (farolas) ──
uniform vec3 uPointLightPos0;
uniform vec3 uPointLightPos1;
uniform vec3 uPointLightPos2;
uniform vec3 uPointLightPos3;
uniform vec3 uPointLightPos4;
uniform vec3 uPointLightPos5;
uniform vec3 uPointLightColor;      // Color compartido (las 6 farolas)
uniform float uPointLightIntensity; // Intensidad compartida
uniform float uPointLightDistance;  // Radio de atenuación

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// Calcula la contribución difusa de un point light con atenuación por distancia
vec3 calcPointLight(vec3 lightPos, vec3 N) {
    vec3 toLight = lightPos - vPosition;
    float dist = length(toLight);
    if (dist > uPointLightDistance || uPointLightDistance <= 0.0) return vec3(0.0);
    vec3 L = toLight / dist; // normalize
    float diff = max(dot(N, L), 0.0);
    // Atenuación lineal suave
    float atten = clamp(1.0 - dist / uPointLightDistance, 0.0, 1.0);
    atten *= atten; // Caída cuadrática para resultado más natural
    return uPointLightColor * uPointLightIntensity * diff * atten;
}

void main() {
    // Normalizar la normal recibida
    vec3 N = normalize(vNormal);
    
    // Dirección de la luz (desde el fragmento hacia la luz)
    vec3 L = normalize(uLightPosition - vPosition);
    
    // Dirección de la vista (desde el fragmento hacia la cámara)
    vec3 V = normalize(uCameraPosition - vPosition);
    
    // 1. Componente Ambiental
    vec3 ambient = uAmbientColor * uAmbientIntensity;
    
    // 2. Componente Difusa (Lambertian) — Luz direccional
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = uLightColor * uLightIntensity * diff;
    
    // 3. Componente Especular (Phong)
    vec3 R = reflect(-L, N); // Vector de reflexión
    float spec = pow(max(dot(R, V), 0.0), uShininess);
    vec3 specular = uSpecularColor * uSpecularIntensity * spec;
    
    // 4. Contribución de las 6 Point Lights (farolas)
    vec3 pointDiffuse = vec3(0.0);
    pointDiffuse += calcPointLight(uPointLightPos0, N);
    pointDiffuse += calcPointLight(uPointLightPos1, N);
    pointDiffuse += calcPointLight(uPointLightPos2, N);
    pointDiffuse += calcPointLight(uPointLightPos3, N);
    pointDiffuse += calcPointLight(uPointLightPos4, N);
    pointDiffuse += calcPointLight(uPointLightPos5, N);
    
    // Obtener color base (textura o color plano)
    vec4 texColor = vec4(1.0);
    if (uHasTexture > 0.5) {
        texColor = texture2D(uMap, vUv);
    }
    vec3 baseColor = texColor.rgb * uBaseColor;
    
    // Combinar iluminación Phong + Point Lights
    vec3 colorFinal = (ambient + diffuse + pointDiffuse) * baseColor + specular;
    
    gl_FragColor = vec4(colorFinal, texColor.a);
}
