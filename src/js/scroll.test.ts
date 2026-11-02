import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initScroll, type ScrollFrame, type ScrollHandle } from './scroll.ts';

const CONTENT_HEIGHT = 4000;
const VIEWPORT = { width: 1280, height: 800 };

let frames: FrameRequestCallback[] = [];

function runFrame(): void {
    const pending = frames;
    frames = [];
    pending.forEach(callback => callback(0));
}

function setScrollY(value: number): void {
    document.documentElement.scrollTop = value;
}

function setViewport(width: number, height: number): void {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
}

function mockLayout(): void {
    const offsetHeight = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get');
    offsetHeight.mockImplementation(function (this: HTMLElement) {
        if (this.id === 'content') return CONTENT_HEIGHT;
        return parseInt(this.style.height, 10) || 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
        this: HTMLElement
    ) {
        return ['home', 'work', 'about', 'contact'].indexOf(this.id) * 1000;
    });
}

function collectFrames(scroll: ScrollHandle): ScrollFrame[] {
    const collected: ScrollFrame[] = [];
    scroll.onFrame(frame => collected.push(frame));
    return collected;
}

describe('initScroll', () => {
    let scrollTo: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="FakeScroll"></div>
            <div id="scroll-wrapper">
                <div id="content">
                    <div id="home"></div><div id="work"></div>
                    <div id="about"></div><div id="contact"></div>
                </div>
            </div>
            <button data-nav="home"></button><button data-nav="work"></button>
            <button data-nav="about"></button><button data-nav="contact"></button>
            <div id="scroll-progress"></div>
        `;
        frames = [];
        scrollTo = vi.fn();
        setViewport(VIEWPORT.width, VIEWPORT.height);
        setScrollY(0);
        mockLayout();
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
            frames.push(callback)
        );
        vi.stubGlobal('scrollTo', scrollTo);
        Object.defineProperty(document, 'fonts', {
            configurable: true,
            value: { load: () => new Promise(() => {}) },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('works with nobody subscribed: moves the content and the progress bar', () => {
        initScroll();
        setScrollY(1000);
        runFrame();

        const content = document.getElementById('content')!;
        const bar = document.getElementById('scroll-progress')!;
        expect(content.style.transform).toBe('translateY(-160px)');
        expect(parseFloat(bar.style.height)).toBeCloseTo((160 / 3200) * 100);
    });

    it('sizes the fake scroll after the content', () => {
        initScroll();

        const fakeScroll = document.querySelector<HTMLElement>('.FakeScroll')!;
        expect(fakeScroll.style.height).toBe(`${CONTENT_HEIGHT}px`);
    });

    it('reports eased progress and settles once the position catches up', () => {
        const reported = collectFrames(initScroll());
        setScrollY(3200);
        runFrame();
        expect(reported.at(-1)).toEqual({ progress: 0.16, settled: false });

        for (let i = 0; i < 100; i++) runFrame();
        expect(reported.at(-1)!.progress).toBeCloseTo(1);
        expect(reported.at(-1)!.settled).toBe(true);
    });

    it('reports one unsettled frame when the page height changes while still', () => {
        const scroll = initScroll();
        runFrame();
        const reported = collectFrames(scroll);
        runFrame();
        expect(reported.at(-1)!.settled).toBe(true);

        setViewport(VIEWPORT.width, 700);
        window.dispatchEvent(new Event('resize'));
        runFrame();
        expect(reported.at(-1)!.settled).toBe(false);

        runFrame();
        expect(reported.at(-1)!.settled).toBe(true);
    });

    it('scrolls to the section of the nav button, within the scrollable range', () => {
        initScroll();

        document.querySelector<HTMLElement>('[data-nav="work"]')!.click();
        expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'smooth' });

        vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(9000);
        document.querySelector<HTMLElement>('[data-nav="contact"]')!.click();
        expect(scrollTo).toHaveBeenLastCalledWith({ top: 3200, behavior: 'smooth' });
    });

    it('marks the section under the middle of the viewport as active', () => {
        initScroll();
        const home = document.querySelector('[data-nav="home"]')!;
        const about = document.querySelector('[data-nav="about"]')!;
        expect(home.getAttribute('aria-current')).toBe('page');

        setScrollY(1700);
        window.dispatchEvent(new Event('scroll'));

        expect(about.getAttribute('aria-current')).toBe('page');
        expect(about.classList.contains('is-active')).toBe(true);
        expect(home.hasAttribute('aria-current')).toBe(false);
    });

    it('leaves the content alone on the native layout', () => {
        setViewport(390, 844);
        initScroll();
        setScrollY(500);
        runFrame();

        const wrapper = document.getElementById('scroll-wrapper')!;
        expect(wrapper.style.position).toBe('relative');
        expect(document.getElementById('content')!.style.transform).toBe('');
        expect(document.querySelector<HTMLElement>('.FakeScroll')!.style.height).toBe('0px');
    });
});
