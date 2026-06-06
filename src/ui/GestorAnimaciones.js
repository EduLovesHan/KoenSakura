import { gsap } from 'gsap';

// Animaciones para elementos de la Interfaz 
export const animacionesUI = {
  // Slide-up y fade-in para el menú superior o modales al mostrarse
  aparecerMenu: (elementoHtml) => {
    if (!elementoHtml) return null;
    
    // Desactivar transiciones de CSS para evitar conflictos con GSAP
    elementoHtml.style.transition = 'none';
    gsap.killTweensOf(elementoHtml);
    
    return gsap.fromTo(elementoHtml, 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  },

  // Desvanecimiento suave y desplazamiento hacia abajo para ocultar el menú sin cortes
  desaparecerMenu: (elementoHtml, callbackCompleto) => {
    if (!elementoHtml) return null;
    
    // Desactivar transiciones de CSS para evitar conflictos con GSAP
    elementoHtml.style.transition = 'none';
    gsap.killTweensOf(elementoHtml);
    
    return gsap.to(elementoHtml, {
      opacity: 0,
      y: 50,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => {
        if (callbackCompleto) callbackCompleto();
      }
    });
  },

  // Efecto de pulso suave de escala (hover) en botones de la interfaz
  pulsoBoton: (boton) => {
    if (!boton) return null;
    return gsap.to(boton, {
      scale: 1.08,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut'
    });
  }
};
