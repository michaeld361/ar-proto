/* =============================================
   McLaren Artura Spider — Camera Overlay AR
   Uses getUserMedia for camera feed + model-viewer
   overlay with DOM hotspots. Works on iOS Safari.
   ============================================= */

import { hotspots } from './hotspots';
import { openPanel } from './panels';

let videoElement: HTMLVideoElement | null = null;
let arOverlay: HTMLElement | null = null;
let stream: MediaStream | null = null;

/**
 * Check if camera-based AR is available (getUserMedia support)
 */
export function isCameraARSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Start the camera overlay AR experience
 */
export async function startCameraAR(modelViewer: any): Promise<void> {
    try {
        // Request rear camera
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        });

        // Create the AR overlay
        arOverlay = document.createElement('div');
        arOverlay.id = 'camera-ar-overlay';
        arOverlay.style.cssText = `
            position: fixed; inset: 0; z-index: 100;
            background: black;
        `;

        // Camera feed video
        videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('autoplay', '');
        videoElement.muted = true;
        videoElement.style.cssText = `
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: cover;
            z-index: 1;
        `;
        arOverlay.appendChild(videoElement);
        await videoElement.play();

        // Clone model-viewer into AR overlay with transparent background
        const arModelViewer = modelViewer.cloneNode(true) as any;
        arModelViewer.id = 'ar-model-viewer';
        arModelViewer.removeAttribute('auto-rotate');
        arModelViewer.setAttribute('camera-controls', '');
        arModelViewer.setAttribute('touch-action', 'pan-y');
        arModelViewer.setAttribute('environment-image', 'neutral');
        arModelViewer.setAttribute('exposure', '1.2');
        arModelViewer.setAttribute('shadow-intensity', '0');
        arModelViewer.setAttribute('skybox-image', '');
        arModelViewer.style.cssText = `
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            z-index: 2;
            background: transparent;
            --poster-color: transparent;
        `;
        // Remove any cloned hotspot buttons (we'll add new ones)
        arModelViewer.querySelectorAll('.hotspot').forEach((el: Element) => el.remove());
        arOverlay.appendChild(arModelViewer);

        // Create hotspot overlay on top
        const hotspotLayer = document.createElement('div');
        hotspotLayer.id = 'ar-hotspot-layer';
        hotspotLayer.style.cssText = `
            position: absolute; inset: 0; z-index: 3;
            pointer-events: none;
        `;
        arOverlay.appendChild(hotspotLayer);

        // Add hotspot buttons into model-viewer (they render via model-viewer slots)
        hotspots.forEach((hs) => {
            const btn = document.createElement('button');
            btn.className = 'hotspot ar-hotspot';
            btn.setAttribute('slot', `hotspot-${hs.id.replace('hs-', '')}`);
            // Copy position from original hotspot
            const original = document.getElementById(hs.id);
            if (original) {
                btn.setAttribute('data-position', original.getAttribute('data-position') || '0 0 0');
                btn.setAttribute('data-normal', original.getAttribute('data-normal') || '0 1 0');
            }
            btn.innerHTML = `
                <div class="hotspot__ring"></div>
                <div class="hotspot__dot"></div>
                <div class="hotspot__label">${hs.title.split(' ').slice(0, 2).join(' ')}</div>
            `;
            btn.style.pointerEvents = 'auto';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPanel(hs);
            });
            arModelViewer.appendChild(btn);
        });

        // AR HUD - top bar with exit button
        const hud = document.createElement('div');
        hud.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; z-index: 10;
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px;
            padding-top: max(16px, env(safe-area-inset-top));
            background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);
            pointer-events: auto;
        `;

        const brand = document.createElement('div');
        brand.innerHTML = `
            <div style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 6px; color: white;">McLAREN</div>
            <div style="font-family: 'Space Grotesk', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 3px; color: #FF8000;">ARTURA SPIDER · AR</div>
        `;

        const exitBtn = document.createElement('button');
        exitBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
        exitBtn.style.cssText = `
            width: 44px; height: 44px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            background: rgba(16,16,16,0.85);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            cursor: pointer;
        `;
        exitBtn.addEventListener('click', () => stopCameraAR());

        hud.appendChild(brand);
        hud.appendChild(exitBtn);
        arOverlay.appendChild(hud);

        // Bottom instruction
        const instruction = document.createElement('div');
        instruction.style.cssText = `
            position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
            z-index: 10; padding: 10px 20px;
            background: rgba(16,16,16,0.85);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 999px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 11px; font-weight: 500;
            letter-spacing: 2px; text-transform: uppercase;
            color: rgba(255,255,255,0.8);
            pointer-events: none;
        `;
        instruction.textContent = 'Pinch to resize · Drag to rotate';
        arOverlay.appendChild(instruction);

        // Fade out instruction after 4s
        setTimeout(() => {
            instruction.style.transition = 'opacity 1s ease';
            instruction.style.opacity = '0';
        }, 4000);

        // Add to DOM
        document.body.appendChild(arOverlay);

        // Hide main viewer
        const viewerContainer = document.getElementById('viewer-container');
        if (viewerContainer) viewerContainer.style.display = 'none';

    } catch (err) {
        console.error('Camera AR failed:', err);
        alert('Could not access camera. Please grant camera permission and try again.');
    }
}

/**
 * Stop the camera AR experience
 */
export function stopCameraAR(): void {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
    }

    if (arOverlay && arOverlay.parentNode) {
        arOverlay.parentNode.removeChild(arOverlay);
        arOverlay = null;
    }

    videoElement = null;

    // Show main viewer again
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) viewerContainer.style.display = '';
}
