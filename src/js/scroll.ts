// Scroll and navigation. Loads right away and never imports three.js, so the page works before
// the scene arrives and on devices that never get one.
//
// Guillaume FakeScroll method: native document scroll → lerp → content translateY.

export interface ScrollFrame {
    /** Smoothed scroll position: 0 at the top of the page, 1 at the bottom. */
    progress: number;
    /** False while the position is easing, and on the frame after the page height changes. */
    settled: boolean;
}

export interface ScrollHandle {
    /** Runs on every animation frame, right after the content has moved. */
    onFrame(listener: (frame: ScrollFrame) => void): void;
}

const NAV_SECTION_IDS = ['home', 'work', 'about', 'contact'];

// Guillaume uses ~0.1 on a 60fps ticker.
const SMOOTHING = 0.16;
const SETTLED_DISTANCE = 0.05;

export function isNativeLayout(): boolean {
    return window.innerWidth < 768 || window.innerHeight < 600;
}

function readScrollY(): number {
    return document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function initSectionNav(): (scrollPosition: number) => void {
    const entries = NAV_SECTION_IDS.flatMap(id => {
        const section = document.getElementById(id);
        const button = document.querySelector(`[data-nav="${id}"]`);
        return section && button ? [{ id, section, button }] : [];
    });
    let activeId: string | null = null;

    function setActive(id: string): void {
        if (activeId === id) return;
        activeId = id;

        for (const entry of entries) {
            const isActive = entry.id === id;
            entry.button.classList.toggle('is-active', isActive);
            if (isActive) {
                entry.button.setAttribute('aria-current', 'page');
            } else {
                entry.button.removeAttribute('aria-current');
            }
        }
    }

    return scrollPosition => {
        const referenceY = scrollPosition + window.innerHeight * 0.5;
        let nextId = entries[0]?.id;

        for (const entry of entries) {
            if (entry.section.offsetTop <= referenceY) nextId = entry.id;
        }

        if (nextId) setActive(nextId);
    };
}

export function initScroll(): ScrollHandle {
    const content = document.getElementById('content');
    const fakeScroll = document.querySelector<HTMLElement>('.FakeScroll');
    const scrollWrapper = document.getElementById('scroll-wrapper');
    const progressBar = document.getElementById('scroll-progress');
    const updateActiveSection = initSectionNav();
    const listeners: Array<(frame: ScrollFrame) => void> = [];

    let targetScrollY = 0;
    let smoothScrollY = 0;
    let maxScroll = 0;
    let useNativeLayout = false;
    let layoutChanged = false;

    function updateFakeScroll(): void {
        const previousMaxScroll = maxScroll;
        useNativeLayout = isNativeLayout();
        if (scrollWrapper) {
            scrollWrapper.style.position = useNativeLayout ? 'relative' : 'fixed';
        }

        if (useNativeLayout) {
            if (content) content.style.transform = '';
            if (fakeScroll) fakeScroll.style.height = '0px';
            maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        } else {
            if (fakeScroll && content) {
                fakeScroll.style.height = `${content.offsetHeight}px`;
            }
            maxScroll = Math.max(0, (fakeScroll?.offsetHeight || 0) - window.innerHeight);
        }

        if (maxScroll !== previousMaxScroll) layoutChanged = true;
    }

    function scrollToSection(id: string): void {
        const section = document.getElementById(id);
        if (!section) return;
        updateFakeScroll();
        const top = useNativeLayout
            ? section.getBoundingClientRect().top + readScrollY()
            : section.offsetTop;
        window.scrollTo({ top: Math.max(0, Math.min(top, maxScroll || top)), behavior: 'smooth' });
    }

    function resetScrollToTop(): void {
        window.scrollTo(0, 0);
        targetScrollY = 0;
        smoothScrollY = 0;
        if (!useNativeLayout && content) {
            content.style.transform = 'translateY(0px)';
        }
        if (progressBar) {
            progressBar.style.height = '0%';
        }
        updateActiveSection(0);
    }

    function tick(): void {
        requestAnimationFrame(tick);

        targetScrollY = readScrollY();
        smoothScrollY += (targetScrollY - smoothScrollY) * SMOOTHING;

        if (!useNativeLayout && content) {
            content.style.transform = `translateY(${-smoothScrollY}px)`;
        }
        if (progressBar) {
            const progress = maxScroll > 0 ? (smoothScrollY / maxScroll) * 100 : 0;
            progressBar.style.height = `${progress}%`;
        }
        updateActiveSection(targetScrollY);

        const frame = {
            progress: Math.min(smoothScrollY / Math.max(maxScroll, 1), 1),
            settled: !layoutChanged && Math.abs(targetScrollY - smoothScrollY) < SETTLED_DISTANCE,
        };
        layoutChanged = false;
        for (const listener of listeners) listener(frame);
    }

    document
        .querySelectorAll(NAV_SECTION_IDS.map(id => `[data-nav="${id}"]`).join(', '))
        .forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-nav');
                if (id) scrollToSection(id);
            });
        });

    window.addEventListener(
        'scroll',
        () => {
            targetScrollY = readScrollY();
            updateActiveSection(targetScrollY);
        },
        { passive: true }
    );

    window.addEventListener('resize', updateFakeScroll);

    // font-display: swap can change the height of the content once Manrope replaces the fallback.
    document.fonts.load('1em Manrope').then(updateFakeScroll, updateFakeScroll);

    updateFakeScroll();

    // Always start at top after reload (disable browser scroll restoration).
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    resetScrollToTop();
    window.addEventListener('pageshow', event => {
        // bfcache / back-forward can restore scroll — force top again.
        if (event.persisted) resetScrollToTop();
    });

    tick();

    return { onFrame: listener => listeners.push(listener) };
}
