/* =============================================
   McLaren Artura Spider — Camera Overlay AR
   Uses getUserMedia + DeviceOrientation for
   gyroscope-tracked AR with hotspots.
   Works on iOS Safari without WebXR.
   ============================================= */

import { hotspots } from './hotspots';
import { openPanel } from './panels';

let videoElement: HTMLVideoElement | null = null;
let arOverlay: HTMLElement | null = null;
let stream: MediaStream | null = null;
let arModelViewer: any = null;

// Device orientation state
let initialAlpha: number | null = null;
let initialBeta: number | null = null;
let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

/**
 * Check if camera-based AR is available
 */
export function isCameraARSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Request iOS DeviceOrientation permission (required iOS 13+)
 */
async function requestOrientationPermission(): Promise<boolean> {
    // iOS 13+ requires explicit permission
    const DeviceOrientationEvt = DeviceOrientationEvent as any;
    if (typeof DeviceOrientationEvt.requestPermission === 'function') {
        try {
            const response = await DeviceOrientationEvt.requestPermission();
            return response === 'granted';
        } catch {
            return false;
        }
    }
    // Android / non-iOS — permission not needed
    return true;
}

/**
 * Start device orientation tracking
 * Maps phone rotation → model-viewer camera orbit
 */
function startOrientationTracking(): void {
    initialAlpha = null;
    initialBeta = null;

    orientationHandler = (event: DeviceOrientationEvent) => {
        if (!arModelViewer) return;

        const alpha = event.alpha ?? 0; // Z-axis rotation (compass heading)
        const beta = event.beta ?? 0;   // X-axis rotation (tilt front-back)
        // const gamma = event.gamma ?? 0; // Y-axis rotation (tilt left-right)

        // Capture initial orientation as reference
        if (initialAlpha === null) {
            initialAlpha = alpha;
            initialBeta = beta;
        }

        // Calculate relative rotation from initial position
        let deltaAlpha = alpha - initialAlpha;
        let deltaBeta = beta - (initialBeta ?? 70);

        // Normalise alpha to -180..180
        if (deltaAlpha > 180) deltaAlpha -= 360;
        if (deltaAlpha < -180) deltaAlpha += 360;

        // Map device orientation to camera orbit
        // Alpha (compass) → theta (horizontal rotation around model)
        // Beta (tilt) → phi (vertical angle)
        const theta = -deltaAlpha; // Negate so turning right rotates view right
        const phi = 90 - deltaBeta; // Map tilt to elevation angle

        // Clamp phi to prevent flipping
        const clampedPhi = Math.max(10, Math.min(170, phi));

        // Apply to model-viewer camera
        arModelViewer.cameraOrbit = `${theta}deg ${clampedPhi}deg 105%`;
        arModelViewer.fieldOfView = '45deg';
    };

    window.addEventListener('deviceorientation', orientationHandler, true);
}

/**
 * Stop device orientation tracking
 */
function stopOrientationTracking(): void {
    if (orientationHandler) {
        window.removeEventListener('deviceorientation', orientationHandler, true);
        orientationHandler = null;
    }
    initialAlpha = null;
    initialBeta = null;
}

/**
 * Start the camera overlay AR experience
 */
export async function startCameraAR(modelViewer: any): Promise<void> {
    try {
        // Request orientation permission first (iOS)
        const orientationGranted = await requestOrientationPermission();

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
        arModelViewer = modelViewer.cloneNode(true) as any;
        arModelViewer.id = 'ar-model-viewer';
        arModelViewer.removeAttribute('auto-rotate');
        arModelViewer.setAttribute('camera-controls', '');
        arModelViewer.setAttribute('touch-action', 'pan-y');
        arModelViewer.setAttribute('environment-image', 'neutral');
        arModelViewer.setAttribute('exposure', '1.2');
        arModelViewer.setAttribute('shadow-intensity', '0');
        arModelViewer.setAttribute('skybox-image', '');
        arModelViewer.setAttribute('field-of-view', '45deg');
        arModelViewer.setAttribute('camera-orbit', '0deg 90deg 105%');
        arModelViewer.setAttribute('interaction-prompt', 'none');
        arModelViewer.style.cssText = `
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            z-index: 2;
            background: transparent;
            --poster-color: transparent;
        `;
        // Remove cloned hotspot buttons (we'll add fresh ones)
        arModelViewer.querySelectorAll('.hotspot').forEach((el: Element) => el.remove());
        arOverlay.appendChild(arModelViewer);

        // Add hotspot buttons into AR model-viewer
        hotspots.forEach((hs) => {
            const btn = document.createElement('button');
            btn.className = 'hotspot ar-hotspot';
            btn.setAttribute('slot', `hotspot-${hs.id.replace('hs-', '')}`);
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

        // AR HUD
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
        instruction.textContent = orientationGranted
            ? 'Walk around to explore · Tap hotspots for details'
            : 'Drag to rotate · Pinch to resize · Tap hotspots';
        arOverlay.appendChild(instruction);

        // Fade out instruction after 5s
        setTimeout(() => {
            instruction.style.transition = 'opacity 1s ease';
            instruction.style.opacity = '0';
        }, 5000);

        // Add to DOM
        document.body.appendChild(arOverlay);

        // Hide main viewer
        const viewerContainer = document.getElementById('viewer-container');
        if (viewerContainer) viewerContainer.style.display = 'none';

        // Start gyroscope tracking if permission granted
        if (orientationGranted) {
            // Disable manual camera controls when gyro is active
            arModelViewer.removeAttribute('camera-controls');
            startOrientationTracking();
        }

    } catch (err) {
        console.error('Camera AR failed:', err);
        alert('Could not access camera. Please grant camera permission and try again.');
    }
}

/**
 * Stop the camera AR experience
 */
export function stopCameraAR(): void {
    stopOrientationTracking();

    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
    }

    if (arOverlay && arOverlay.parentNode) {
        arOverlay.parentNode.removeChild(arOverlay);
        arOverlay = null;
    }

    videoElement = null;
    arModelViewer = null;

    // Show main viewer again
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) viewerContainer.style.display = '';
}
