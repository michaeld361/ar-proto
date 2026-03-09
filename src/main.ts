/* =============================================
   McLaren Artura Spider — Main Entry Point
   App state machine: LOADING → ONBOARDING → EXPLORING
   Variant Launch SDK for cross-platform WebXR AR
   ============================================= */

import '@google/model-viewer';
import './styles/main.css';
import { hotspots } from './hotspots';
import type { HotspotData } from './hotspots';
import { initPanels, openPanel, closePanel } from './panels';
import { playRevealAnimation, orbitToHotspot, resetCameraOrbit, cameraPresets } from './animations';

// ── State ────────────────────────────────────

type AppState = 'LOADING' | 'ONBOARDING' | 'EXPLORING';
let state: AppState = 'LOADING';

// ── DOM References ───────────────────────────

const splashScreen = document.getElementById('splash-screen') as HTMLElement;
const loaderFill = document.getElementById('loader-fill') as HTMLElement;
const loaderText = document.getElementById('loader-text') as HTMLElement;
const onboarding = document.getElementById('onboarding') as HTMLElement;
const onboardingStart = document.getElementById('onboarding-start') as HTMLElement;
const viewerContainer = document.getElementById('viewer-container') as HTMLElement;
const modelViewer = document.getElementById('mclaren-viewer') as any;
const btnResetView = document.getElementById('btn-reset-view') as HTMLElement;

// ── GLB Model ────────────────────────────────
// Using a model-viewer sample for PoC. Replace with the optimised McLaren Artura GLB.
const MODEL_URL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
// When you have the McLaren Artura model:
// const MODEL_URL = '/models/mclaren-artura-spider.glb';

// ── Environment HDR ──────────────────────────
const ENV_URL = 'https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr';

// ── Initialisation ───────────────────────────

function init(): void {
    updateLoader(10, 'Initialising…');

    // Set model source
    modelViewer.setAttribute('src', MODEL_URL);
    modelViewer.setAttribute('environment-image', ENV_URL);
    modelViewer.setAttribute('skybox-image', '');

    // Listen for model load progress
    modelViewer.addEventListener('progress', (event: CustomEvent) => {
        const progress = Math.round(event.detail.totalProgress * 100);
        updateLoader(10 + progress * 0.8, progress < 100 ? 'Loading 3D model…' : 'Preparing scene…');
    });

    // When model is fully loaded
    modelViewer.addEventListener('load', () => {
        updateLoader(100, 'Ready');

        // Brief pause then transition to onboarding
        setTimeout(() => {
            transitionToOnboarding();
        }, 800);
    });

    // Fallback in case load event doesn't fire (e.g. model already cached)
    setTimeout(() => {
        if (state === 'LOADING') {
            updateLoader(100, 'Ready');
            setTimeout(() => transitionToOnboarding(), 500);
        }
    }, 8000);

    // Set up hotspot click handlers
    setupHotspots();

    // Initialise panel system
    initPanels();

    // Reset view button
    btnResetView.addEventListener('click', () => {
        resetCameraOrbit(modelViewer);
        closePanel();
    });
}

// ── Loader ───────────────────────────────────

function updateLoader(percent: number, text: string): void {
    loaderFill.style.width = `${Math.min(percent, 100)}%`;
    loaderText.textContent = text;
}

// ── State Transitions ────────────────────────

function transitionToOnboarding(): void {
    state = 'ONBOARDING';

    // Fade out splash
    splashScreen.classList.add('fade-out');

    setTimeout(() => {
        splashScreen.classList.add('hidden');
        onboarding.classList.remove('hidden');
    }, 600);

    // Onboarding CTA
    onboardingStart.addEventListener('click', () => {
        transitionToExploring();
    });
}

function transitionToExploring(): void {
    state = 'EXPLORING';

    // Hide onboarding
    onboarding.classList.add('hidden');

    // Show viewer
    viewerContainer.classList.remove('hidden');

    // Play reveal animation
    playRevealAnimation(modelViewer);
}

// ── Hotspot System ───────────────────────────

function setupHotspots(): void {
    const hotspotMap = new Map<string, HotspotData>();
    hotspots.forEach((h) => hotspotMap.set(h.id, h));

    // Attach click handlers to each hotspot button
    hotspots.forEach((hotspot) => {
        const el = document.getElementById(hotspot.id);
        if (!el) return;

        el.addEventListener('click', (e: Event) => {
            e.stopPropagation();

            const data = hotspotMap.get(hotspot.id);
            if (!data) return;

            // Orbit camera to hotspot
            const preset = cameraPresets[hotspot.id];
            if (preset) {
                orbitToHotspot(modelViewer, preset.theta, preset.phi, preset.radius);
            }

            // Open info panel
            openPanel(data);
        });
    });
}

// ── Variant Launch Integration ───────────────
// The Variant Launch SDK is loaded via <script> in index.html.
// It polyfills WebXR for iOS Safari via an App Clip bridge,
// so the standard WebXR AR flow in model-viewer "just works"
// on both Android (Scene Viewer) and iOS (ARKit via Variant Launch).
//
// Configuration is handled by the data attributes on the script tag.
// No additional JS setup is required for the basic AR flow —
// model-viewer's built-in AR button will trigger the Variant Launch
// experience on iOS and Scene Viewer/WebXR on Android.

// ── Boot ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
