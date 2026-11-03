import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markLanguageSwitch, playEntranceGlitch } from './text-glitch.ts';

const TEXT = "Hi, I'm Juan — ñandú";

let frames: FrameRequestCallback[] = [];
let reducedMotion = false;

function runFrame(now: number): void {
    const pending = frames;
    frames = [];
    pending.forEach(callback => callback(now));
}

const glitched = () => document.querySelector('[data-glitch]')!.textContent;

describe('playEntranceGlitch', () => {
    beforeEach(() => {
        document.body.innerHTML = `<p data-glitch>${TEXT}</p><p id="other">untouched</p>`;
        sessionStorage.clear();
        frames = [];
        reducedMotion = false;
        vi.spyOn(performance, 'now').mockReturnValue(0);
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
            frames.push(callback)
        );
        vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('leaves the text exactly as it found it', () => {
        playEntranceGlitch();
        expect(glitched()).toBe(TEXT);

        runFrame(100);
        expect(glitched()).not.toBe(TEXT);
        expect(glitched()).toHaveLength(TEXT.length);

        runFrame(650);
        expect(glitched()).toBe(TEXT);
        expect(frames).toEqual([]);
    });

    it('only touches the marked elements', () => {
        playEntranceGlitch();
        runFrame(100);

        expect(document.getElementById('other')!.textContent).toBe('untouched');
    });

    it('plays on the first load of the session, not on the next one', () => {
        playEntranceGlitch();
        expect(frames).toHaveLength(1);

        frames = [];
        playEntranceGlitch();
        expect(frames).toEqual([]);
    });

    it('plays once after a language switch, consuming the flag', () => {
        playEntranceGlitch();
        frames = [];

        markLanguageSwitch();
        playEntranceGlitch();
        expect(frames).toHaveLength(1);

        frames = [];
        playEntranceGlitch();
        expect(frames).toEqual([]);
    });

    it('does nothing with prefers-reduced-motion, and still consumes the flag', () => {
        reducedMotion = true;
        markLanguageSwitch();

        playEntranceGlitch();

        expect(frames).toEqual([]);
        expect(glitched()).toBe(TEXT);

        reducedMotion = false;
        playEntranceGlitch();
        expect(frames).toEqual([]);
    });

    it('survives blocked storage, with the text in place', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('denied', 'SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('denied', 'SecurityError');
        });

        expect(() => markLanguageSwitch()).not.toThrow();
        expect(() => playEntranceGlitch()).not.toThrow();
        expect(frames).toEqual([]);
        expect(glitched()).toBe(TEXT);
    });
});
