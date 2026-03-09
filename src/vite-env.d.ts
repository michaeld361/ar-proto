/// <reference types="vite/client" />

// WebXR type declarations for TypeScript
interface Navigator {
    xr?: XRSystem;
}

interface XRSystem {
    isSessionSupported(mode: string): Promise<boolean>;
    requestSession(mode: string, options?: any): Promise<XRSession>;
}

interface XRSession extends EventTarget {
    requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
    requestHitTestSource?(options: { space: XRReferenceSpace }): Promise<XRHitTestSource>;
    end(): Promise<void>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

interface XRReferenceSpace extends EventTarget { }

interface XRHitTestSource {
    cancel(): void;
}

interface XRFrame {
    getHitTestResults(source: XRHitTestSource): XRHitTestResult[];
}

interface XRHitTestResult {
    getPose(baseSpace: XRReferenceSpace): XRPose | null;
}

interface XRPose {
    transform: XRRigidTransform;
}

interface XRRigidTransform {
    matrix: Float32Array;
    position: DOMPointReadOnly;
    orientation: DOMPointReadOnly;
}

interface XRSessionInit {
    requiredFeatures?: string[];
    optionalFeatures?: string[];
    domOverlay?: { root: HTMLElement };
}
