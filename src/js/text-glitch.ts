// Entrance effect over text that is already in the HTML: it only ever borrows what the element
// shows for a moment, so without JS, or if it never runs, the text is simply there.

const PLAYED_KEY = 'portfolio:entrance-played';
const LANGUAGE_SWITCH_KEY = 'portfolio:language-switched';

const DURATION_MS = 650;
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,./'ñó10               ";

function glitchText(element: HTMLElement): void {
    const finalText = element.textContent ?? '';
    const startTime = performance.now();

    // Each character gets its own reveal threshold, biased left-to-right with jitter,
    // so the text resolves as a cascading decrypt instead of every char settling at once.
    const revealThresholds = Array.from({ length: finalText.length }, (_, i) => {
        const base = finalText.length > 1 ? i / (finalText.length - 1) : 0;
        const jitter = (Math.random() - 0.5) * 0.35;
        return Math.min(1, Math.max(0, base * 0.7 + jitter));
    });

    function frame(now: number): void {
        const progress = (now - startTime) / DURATION_MS;
        if (progress >= 1) {
            element.textContent = finalText;
            return;
        }

        let output = '';
        for (let i = 0; i < finalText.length; i++) {
            output +=
                progress >= revealThresholds[i]
                    ? finalText[i]
                    : SCRAMBLE_CHARS.charAt(Math.floor(Math.random() * SCRAMBLE_CHARS.length));
        }
        element.textContent = output;
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

/** True on the first page of the session and on arrival from a language link. Consumes the flag. */
function consumeEntrance(): boolean {
    try {
        const isFirstLoad = sessionStorage.getItem(PLAYED_KEY) === null;
        const isLanguageSwitch = sessionStorage.getItem(LANGUAGE_SWITCH_KEY) !== null;
        sessionStorage.setItem(PLAYED_KEY, '1');
        sessionStorage.removeItem(LANGUAGE_SWITCH_KEY);
        return isFirstLoad || isLanguageSwitch;
    } catch {
        // Blocked storage: no way to tell a first load from a reload, and the text is fine as is.
        return false;
    }
}

/** Called right before leaving for the other language. */
export function markLanguageSwitch(): void {
    try {
        sessionStorage.setItem(LANGUAGE_SWITCH_KEY, '1');
    } catch {
        // Same as above: the other route just arrives without the effect.
    }
}

export function playEntranceGlitch(): void {
    const shouldPlay = consumeEntrance();
    if (!shouldPlay) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll<HTMLElement>('[data-glitch]').forEach(glitchText);
}
