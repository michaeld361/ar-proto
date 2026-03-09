/* =============================================
   McLaren Artura Spider — Animations
   Reveal, hotspot, and micro-animation helpers
   ============================================= */

/**
 * Animate the car reveal with fade-in + scale-up
 */
export function playRevealAnimation(modelViewer: HTMLElement): void {
    modelViewer.style.opacity = '0';
    modelViewer.style.transform = 'scale(0.95)';
    modelViewer.style.transition = 'none';

    setTimeout(() => {
        modelViewer.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        modelViewer.style.opacity = '1';
        modelViewer.style.transform = 'scale(1)';
    }, 50);
}

/**
 * Orbit camera to a hotspot position
 */
export function orbitToHotspot(
    modelViewer: any,
    theta: number,
    phi: number,
    radius: string = '105%'
): void {
    modelViewer.cameraOrbit = `${theta}deg ${phi}deg ${radius}`;
    modelViewer.cameraTarget = 'auto auto auto';
}

/**
 * Reset camera to default orbit
 */
export function resetCameraOrbit(modelViewer: any): void {
    modelViewer.cameraOrbit = '45deg 65deg 105%';
    modelViewer.cameraTarget = 'auto auto auto';
    modelViewer.fieldOfView = '30deg';
}

/**
 * Camera orbit presets for each hotspot
 * Provides a nice framing when a hotspot is tapped
 */
export const cameraPresets: Record<string, { theta: number; phi: number; radius: string }> = {
    'hs-doors': { theta: 70, phi: 60, radius: '90%' },
    'hs-spoiler': { theta: 180, phi: 55, radius: '95%' },
    'hs-wheels': { theta: 50, phi: 75, radius: '85%' },
    'hs-mirrors': { theta: 45, phi: 60, radius: '80%' },
    'hs-splitter': { theta: 10, phi: 70, radius: '90%' },
    'hs-exhaust': { theta: 200, phi: 65, radius: '90%' },
    'hs-headlights': { theta: 340, phi: 65, radius: '85%' },
    'hs-engine': { theta: 180, phi: 45, radius: '85%' },
};
