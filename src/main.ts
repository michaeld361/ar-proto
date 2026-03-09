/* =============================================
   McLaren Artura Spider — Main Entry Point
   App state machine: LOADING → ONBOARDING → EXPLORING
   Three.js WebXR AR with Variant Launch SDK
   model-viewer as 3D turntable fallback
   ============================================= */

import '@google/model-viewer';
import './styles/main.css';
import { hotspots } from './hotspots';
import type { HotspotData } from './hotspots';
import { initPanels, openPanel, closePanel } from './panels';
import { playRevealAnimation, orbitToHotspot, resetCameraOrbit, cameraPresets } from './animations';
import { isARSupported, startARSession } from './ar-session';

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
const arButton = document.getElementById('ar-button') as HTMLElement;

// ── GLB Model ────────────────────────────────
// Using a model-viewer sample for PoC. Replace with the optimised McLaren Artura GLB.
const MODEL_URL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
// When you have the McLaren Artura model:
// const MODEL_URL = '/models/mclaren-artura-spider.glb';


// ── Initialisation ───────────────────────────

function init(): void {
    updateLoader(10, 'Initialising…');

    // Set model source (model-viewer is used as the 3D turntable)
    modelViewer.setAttribute('src', MODEL_URL);

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

    // Set up hotspot click handlers (for model-viewer turntable mode)
    setupHotspots();

    // Initialise panel system
    initPanels();

    // Reset view button
    btnResetView.addEventListener('click', () => {
        resetCameraOrbit(modelViewer);
        closePanel();
    });

    // Set up custom AR button
    setupARButton();
}

// ── AR Button Setup ──────────────────────────

async function setupARButton(): Promise<void> {
    const supported = await isARSupported();

    if (supported) {
        // WebXR AR is available (Android natively, iOS via Variant Launch)
        arButton.classList.remove('hidden');
        arButton.addEventListener('click', () => {
            startARSession(MODEL_URL);
        });
    } else {
        // No WebXR support — hide AR button, turntable only
        arButton.classList.add('hidden');
        console.log('WebXR AR not supported on this device. Using 3D turntable mode.');
    }
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

// ── Hotspot System (model-viewer turntable) ──

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

// ── Boot ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
