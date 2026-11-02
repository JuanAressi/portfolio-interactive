import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterFirstPaint, supportsWebGL2 } from './scene-boot.ts';

describe('afterFirstPaint', () => {
    let paint: () => void;
    let disconnect: ReturnType<typeof vi.fn>;
    let observe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        disconnect = vi.fn();
        observe = vi.fn();
        vi.stubGlobal(
            'PerformanceObserver',
            class {
                observe = observe;
                disconnect = disconnect;
                constructor(callback: (entries: unknown, observer: unknown) => void) {
                    paint = () => callback([], this);
                }
            }
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('waits for an idle period that starts after the paint', () => {
        const idle = vi.fn();
        vi.stubGlobal('requestIdleCallback', idle);
        const callback = vi.fn();

        afterFirstPaint(callback);
        expect(observe).toHaveBeenCalledWith({ type: 'paint', buffered: true });
        expect(idle).not.toHaveBeenCalled();

        paint();
        expect(idle).toHaveBeenCalledWith(callback, { timeout: 1500 });
        expect(callback).not.toHaveBeenCalled();
    });

    it('stops listening after the first paint', () => {
        vi.stubGlobal('requestIdleCallback', vi.fn());

        afterFirstPaint(vi.fn());
        paint();

        expect(disconnect).toHaveBeenCalledOnce();
    });

    it('falls back to a timer where requestIdleCallback does not exist', () => {
        vi.useFakeTimers();
        expect('requestIdleCallback' in window).toBe(false);
        const callback = vi.fn();

        afterFirstPaint(callback);
        paint();
        expect(callback).not.toHaveBeenCalled();

        vi.runAllTimers();
        expect(callback).toHaveBeenCalledOnce();
    });
});

describe('supportsWebGL2', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is false when the browser gives no webgl2 context', () => {
        const getContext = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue(null);

        expect(supportsWebGL2()).toBe(false);
        expect(getContext).toHaveBeenCalledWith('webgl2');
    });

    it('is true when it does', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never);

        expect(supportsWebGL2()).toBe(true);
    });
});
