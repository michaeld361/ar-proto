/* =============================================
   McLaren Artura Spider — Three.js WebXR AR Session
   Custom AR mode with DOM Overlay for hotspots
   ============================================= */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { hotspots } from './hotspots';

import { openPanel, closePanel } from './panels';

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let xrSession: XRSession | null = null;
let model: THREE.Group | null = null;
let reticle: THREE.Mesh | null = null;
let hitTestSource: XRHitTestSource | null = null;
let isModelPlaced = false;
let hotspotMarkers: THREE.Mesh[] = [];


// Hotspot 3D positions relative to model (to recalibrate per model)
const hotspot3DPositions: { id: string; position: THREE.Vector3 }[] = [
    { id: 'hs-doors', position: new THREE.Vector3(0.8, 0.5, 0.2) },
    { id: 'hs-spoiler', position: new THREE.Vector3(0, 0.7, -1.2) },
    { id: 'hs-wheels', position: new THREE.Vector3(0.8, 0.1, 0.5) },
    { id: 'hs-mirrors', position: new THREE.Vector3(0.7, 0.6, 0.4) },
    { id: 'hs-splitter', position: new THREE.Vector3(0, 0.1, 1.4) },
    { id: 'hs-exhaust', position: new THREE.Vector3(0, 0.2, -1.5) },
    { id: 'hs-headlights', position: new THREE.Vector3(0.4, 0.3, 1.3) },
    { id: 'hs-engine', position: new THREE.Vector3(0, 0.5, -0.6) },
];

// DOM Overlay element
let overlayEl: HTMLElement | null = null;
let hotspotUIContainer: HTMLElement | null = null;

/**
 * Check if WebXR immersive-ar is supported
 */
export async function isARSupported(): Promise<boolean> {
    if (!navigator.xr) return false;
    try {
        return await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
        return false;
    }
}

/**
 * Create the DOM overlay for AR mode
 */
function createAROverlay(): HTMLElement {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'ar-overlay';
    overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: none;
  `;

    // AR HUD - top bar
    const hud = document.createElement('div');
    hud.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    padding-top: max(16px, env(safe-area-inset-top));
    background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%);
    pointer-events: auto;
  `;

    const brand = document.createElement('div');
    brand.innerHTML = `
    <div style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 6px; color: white;">McLAREN</div>
    <div style="font-family: 'Space Grotesk', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 3px; color: #FF8000;">ARTURA SPIDER</div>
  `;

    const exitBtn = document.createElement('button');
    exitBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
    exitBtn.style.cssText = `
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: rgba(16,16,16,0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
    cursor: pointer;
    pointer-events: auto;
  `;
    exitBtn.addEventListener('click', () => endARSession());

    hud.appendChild(brand);
    hud.appendChild(exitBtn);
    overlay.appendChild(hud);

    // Placement instruction
    const instruction = document.createElement('div');
    instruction.id = 'ar-instruction';
    instruction.style.cssText = `
    position: absolute;
    bottom: 100px; left: 50%; transform: translateX(-50%);
    padding: 12px 24px;
    background: rgba(16,16,16,0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px; font-weight: 500;
    letter-spacing: 2px; text-transform: uppercase;
    color: white;
    pointer-events: none;
    transition: opacity 0.5s ease;
  `;
    instruction.textContent = 'Tap to place the car';
    overlay.appendChild(instruction);

    // Hotspot UI container (screen-projected 2D labels)
    const hotspotContainer = document.createElement('div');
    hotspotContainer.id = 'ar-hotspots';
    hotspotContainer.style.cssText = `
    position: absolute; inset: 0;
    pointer-events: none;
  `;
    overlay.appendChild(hotspotContainer);
    hotspotUIContainer = hotspotContainer;

    document.body.appendChild(overlay);
    return overlay;
}

/**
 * Create 3D hotspot markers as glowing orange spheres
 */
function createHotspotMarkers(parentGroup: THREE.Group): void {
    hotspotMarkers = [];

    hotspot3DPositions.forEach(({ id, position }) => {
        // Outer ring (glow)
        const ringGeometry = new THREE.RingGeometry(0.04, 0.055, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF8000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);

        // Inner dot
        const dotGeometry = new THREE.SphereGeometry(0.02, 16, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF8000,
            transparent: true,
            opacity: 1.0,
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);

        // Group them
        const marker = new THREE.Group() as THREE.Group & { userData: { hotspotId: string } };
        marker.add(ring);
        marker.add(dot);
        marker.position.copy(position);
        marker.userData.hotspotId = id;

        // Make ring always face camera
        ring.lookAt(camera!.position);

        parentGroup.add(marker);
        hotspotMarkers.push(dot); // Use dot for raycasting
        (dot as any).userData = { hotspotId: id };
    });
}

/**
 * Create screen-space hotspot labels
 */
function updateHotspotScreenPositions(): void {
    if (!hotspotUIContainer || !camera || !model || !isModelPlaced) return;

    // Clear existing labels
    hotspotUIContainer.innerHTML = '';

    const width = renderer!.domElement.width;
    const height = renderer!.domElement.height;

    hotspot3DPositions.forEach(({ id, position }) => {
        const worldPos = new THREE.Vector3();
        worldPos.copy(position);
        model!.localToWorld(worldPos);

        // Project to screen
        const screenPos = worldPos.clone().project(camera!);
        const x = (screenPos.x * 0.5 + 0.5) * width;
        const y = (-screenPos.y * 0.5 + 0.5) * height;

        // Only show if in front of camera
        if (screenPos.z > 1) return;

        const hotspotData = hotspots.find(h => h.id === id);
        if (!hotspotData) return;

        const label = document.createElement('button');
        label.style.cssText = `
      position: absolute;
      left: ${x}px; top: ${y}px;
      transform: translate(-50%, -50%);
      width: 44px; height: 44px;
      border-radius: 50%;
      border: 2px solid #FF8000;
      background: rgba(255, 128, 0, 0.15);
      cursor: pointer;
      pointer-events: auto;
      display: flex; align-items: center; justify-content: center;
    `;

        const dot = document.createElement('div');
        dot.style.cssText = `
      width: 10px; height: 10px;
      background: #FF8000;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(255,128,0,0.5);
    `;
        label.appendChild(dot);

        const nameTag = document.createElement('span');
        nameTag.textContent = hotspotData.title.split(' ').slice(0, 2).join(' ');
        nameTag.style.cssText = `
      position: absolute;
      top: calc(100% + 4px); left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 9px; font-weight: 600;
      letter-spacing: 1px; text-transform: uppercase;
      color: rgba(255,255,255,0.9);
      background: rgba(16,16,16,0.85);
      padding: 2px 6px; border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.08);
    `;
        label.appendChild(nameTag);

        label.addEventListener('click', (e) => {
            e.stopPropagation();
            openPanel(hotspotData);
        });

        hotspotUIContainer!.appendChild(label);
    });
}

/**
 * Start an immersive AR session
 */
export async function startARSession(modelUrl: string): Promise<void> {
    if (!navigator.xr) {
        alert('WebXR is not supported on this device/browser.');
        return;
    }

    // Create Three.js renderer
    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Create scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(1, 2, 1);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemiLight);

    // Placement reticle
    const reticleGeometry = new THREE.RingGeometry(0.1, 0.12, 32);
    reticleGeometry.rotateX(-Math.PI / 2);
    const reticleMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF8000,
        transparent: true,
        opacity: 0.7,
    });
    reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
    reticle.visible = false;
    reticle.matrixAutoUpdate = false;
    scene.add(reticle);

    // Create DOM overlay
    overlayEl = createAROverlay();

    // Add renderer to DOM
    renderer.domElement.style.cssText = 'position: fixed; inset: 0; z-index: 99;';
    document.body.appendChild(renderer.domElement);

    // Hide the main viewer
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) viewerContainer.style.display = 'none';

    // Request WebXR session with DOM Overlay
    try {
        const sessionOptions: XRSessionInit = {
            requiredFeatures: ['hit-test', 'local-floor'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: overlayEl },
        } as any;

        xrSession = await navigator.xr!.requestSession('immersive-ar', sessionOptions);
        renderer.xr.setReferenceSpaceType('local-floor');
        await renderer.xr.setSession(xrSession);

        // Load the 3D model
        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            model = gltf.scene;

            // Scale model appropriately (adjust for your model)
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetSize = 0.5; // 0.5 meters for initial placement
            const scaleFactor = targetSize / maxDim;
            model.scale.setScalar(scaleFactor);

            model.visible = false; // Hidden until placed
            scene!.add(model);
        });

        // Set up hit testing  
        const viewerRefSpace = await xrSession.requestReferenceSpace('viewer');
        hitTestSource = await xrSession.requestHitTestSource!({ space: viewerRefSpace });

        // Handle tap to place
        xrSession.addEventListener('select', onSelect);

        // Handle session end
        xrSession.addEventListener('end', () => {
            cleanupARSession();
        });

        // Start render loop
        renderer.setAnimationLoop(onXRFrame);

    } catch (err) {
        console.error('Failed to start AR session:', err);
        cleanupARSession();
        alert('Could not start AR session. Make sure you are on a supported device and have granted camera access.');
    }
}

/**
 * Handle tap gesture in AR
 */
function onSelect(): void {
    if (!model || !reticle) return;

    if (!isModelPlaced) {
        // Place the model at reticle position
        model.position.setFromMatrixPosition(reticle.matrix);
        model.visible = true;
        isModelPlaced = true;
        reticle.visible = false;

        // Create hotspot markers
        createHotspotMarkers(model);

        // Hide placement instruction
        const instruction = document.getElementById('ar-instruction');
        if (instruction) instruction.style.opacity = '0';
    }
}

/**
 * XR render loop
 */
function onXRFrame(_time: DOMHighResTimeStamp, frame: XRFrame): void {
    if (!renderer || !scene || !camera) return;

    const refSpace = renderer.xr.getReferenceSpace();
    if (!refSpace) return;

    // Hit testing for reticle (before placement)
    if (!isModelPlaced && hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(refSpace);
            if (pose && reticle) {
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            }
        }
    }

    // Make hotspot rings face camera
    if (model && isModelPlaced) {
        model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
                child.lookAt(camera!.position);
            }
        });

        // Update screen-projected hotspot labels
        updateHotspotScreenPositions();
    }

    renderer.render(scene, camera);
}

/**
 * End the AR session
 */
export async function endARSession(): Promise<void> {
    if (xrSession) {
        await xrSession.end();
    }
    cleanupARSession();
}

/**
 * Clean up AR resources
 */
function cleanupARSession(): void {
    closePanel();

    if (renderer) {
        renderer.setAnimationLoop(null);
        if (renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer.dispose();
        renderer = null;
    }

    if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
    }

    // Show the main viewer again
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) viewerContainer.style.display = '';

    scene = null;
    camera = null;
    model = null;
    reticle = null;
    hitTestSource = null;
    isModelPlaced = false;
    hotspotMarkers = [];
    hotspotUIContainer = null;
    xrSession = null;
}
