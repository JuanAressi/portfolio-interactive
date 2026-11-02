// When and whether the 3D scene loads. Has to stay free of three.js: it decides if it gets
// downloaded at all.

const IDLE_TIMEOUT_MS = 1500;

export function afterFirstPaint(callback: () => void): void {
    // An animation frame isn't enough: it runs before the paint it belongs to is on screen, and
    // the idle period that follows starts right there.
    new PerformanceObserver((_entries, observer) => {
        observer.disconnect();
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
        } else {
            setTimeout(callback, 0);
        }
    }).observe({ type: 'paint', buffered: true });
}

// THREE.WebGLRenderer logs a console.error before throwing when it gets no context, so this has
// to be known beforehand. webgl2 only: it's the one context three.js can render on.
export function supportsWebGL2(): boolean {
    return document.createElement('canvas').getContext('webgl2') !== null;
}
