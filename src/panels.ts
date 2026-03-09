/* =============================================
   McLaren Artura Spider — Panel Manager
   Handles info panel open/close/content
   ============================================= */

import type { HotspotData } from './hotspots';

const panel = document.getElementById('info-panel') as HTMLElement;
const panelBackdrop = document.getElementById('panel-backdrop') as HTMLElement;
const panelClose = document.getElementById('panel-close') as HTMLElement;
const panelTitle = document.getElementById('panel-title') as HTMLElement;
const panelDescription = document.getElementById('panel-description') as HTMLElement;
const panelSpecs = document.getElementById('panel-specs') as HTMLElement;

let currentHotspot: string | null = null;
let isOpen = false;

/**
 * Open the info panel with hotspot data
 */
export function openPanel(hotspot: HotspotData): void {
    // If same hotspot is already open, close it
    if (isOpen && currentHotspot === hotspot.id) {
        closePanel();
        return;
    }

    // Update content
    panelTitle.textContent = hotspot.title;
    panelDescription.textContent = hotspot.description;

    // Build spec cards
    panelSpecs.innerHTML = hotspot.specs
        .map(
            (spec) => `
    <div class="panel__spec">
      <span class="panel__spec-label">${spec.label}</span>
      <span class="panel__spec-value">${spec.value}</span>
    </div>
  `
        )
        .join('');

    // Show panel
    panel.classList.remove('hidden');
    currentHotspot = hotspot.id;
    isOpen = true;

    // Trigger animation frame for transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            panel.classList.add('active');
        });
    });
}

/**
 * Close the info panel
 */
export function closePanel(): void {
    if (!isOpen) return;

    panel.classList.remove('active');
    isOpen = false;
    currentHotspot = null;

    // Wait for animation to finish before hiding
    setTimeout(() => {
        if (!isOpen) {
            panel.classList.add('hidden');
        }
    }, 600);
}

/**
 * Check if panel is currently open
 */
export function isPanelOpen(): boolean {
    return isOpen;
}

/**
 * Initialise panel event listeners
 */
export function initPanels(): void {
    // Close on backdrop tap
    panelBackdrop.addEventListener('click', closePanel);

    // Close button
    panelClose.addEventListener('click', closePanel);

    // Close on Escape key
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            closePanel();
        }
    });
}
