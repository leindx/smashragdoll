// Módulo de respuesta háptica (Vibración física para móviles / Capacitor)

class HapticsManager {
  constructor() {
    this.hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  // Impacto ligero (ej. bofetada leve o toque)
  light() {
    if (this.hasVibration) {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  }

  // Impacto medio (ej. tomate o puñetazo)
  medium() {
    if (this.hasVibration) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
    }
  }

  // Impacto fuerte / Electrocución
  heavy() {
    if (this.hasVibration) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch (e) {}
    }
  }
}

export const haptics = new HapticsManager();
