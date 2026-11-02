// When the 3D scene loads. Has to stay free of three.js: it runs before it gets downloaded.

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
