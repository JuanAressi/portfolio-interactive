import { beforeEach, describe, expect, it } from 'vitest';
import { initLanguageMenu } from './language-menu.ts';

function byClass(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`${selector} not found`);
    return element;
}

// jsdom has no navigation: records what the click would have done, and stops it.
function clickLink(link: HTMLAnchorElement): { navigated: boolean; href: string } {
    let result = { navigated: false, href: '' };
    const record = (event: Event) => {
        result = { navigated: !event.defaultPrevented, href: link.href };
        event.preventDefault();
    };
    window.addEventListener('click', record, { once: true });
    link.click();
    return result;
}

describe('initLanguageMenu', () => {
    let dropdown: HTMLElement;
    let trigger: HTMLElement;
    let otherLanguage: HTMLAnchorElement;
    let currentLanguage: HTMLAnchorElement;

    beforeEach(() => {
        history.replaceState(null, '', location.pathname);
        sessionStorage.clear();
        document.body.innerHTML = `
            <div class="dropdown">
                <button class="dropdown-trigger" aria-expanded="false"></button>
                <a class="translate-button" data-language="en" href="/en/"></a>
                <a class="translate-button" data-language="es" href="/" aria-current="true"></a>
            </div>
        `;
        initLanguageMenu();
        dropdown = byClass('.dropdown');
        trigger = byClass('.dropdown-trigger');
        otherLanguage = byClass('[data-language="en"]') as HTMLAnchorElement;
        currentLanguage = byClass('[data-language="es"]') as HTMLAnchorElement;
    });

    it('toggles the menu and aria-expanded from the trigger', () => {
        trigger.click();
        expect(dropdown.classList.contains('active')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');

        trigger.click();
        expect(dropdown.classList.contains('active')).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on any click outside the menu', () => {
        trigger.click();
        document.body.click();

        expect(dropdown.classList.contains('active')).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('carries the active section to the other language', () => {
        history.replaceState(null, '', '#work');

        const { navigated, href } = clickLink(otherLanguage);

        expect(navigated).toBe(true);
        expect(new URL(href).pathname).toBe('/en/');
        expect(new URL(href).hash).toBe('#work');
    });

    it('flags the switch for the destination page', () => {
        clickLink(otherLanguage);

        expect(sessionStorage.getItem('portfolio:language-switched')).toBe('1');
    });

    it('adds no hash from Home, and drops one left over from an earlier section', () => {
        otherLanguage.hash = '#about';

        const { href } = clickLink(otherLanguage);

        expect(new URL(href).hash).toBe('');
    });

    it('only closes the menu when the language is already the current one', () => {
        trigger.click();

        const { navigated } = clickLink(currentLanguage);

        expect(navigated).toBe(false);
        expect(dropdown.classList.contains('active')).toBe(false);
        expect(sessionStorage.getItem('portfolio:language-switched')).toBeNull();
    });
});
