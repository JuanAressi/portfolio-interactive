import { beforeEach, describe, expect, it } from 'vitest';
import { initLanguageMenu } from './language-menu.ts';

function byClass(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`${selector} not found`);
    return element;
}

describe('initLanguageMenu', () => {
    let dropdown: HTMLElement;
    let trigger: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = `
            <div class="dropdown">
                <button class="dropdown-trigger" aria-expanded="false"></button>
                <button class="translate-button"></button>
            </div>
        `;
        initLanguageMenu();
        dropdown = byClass('.dropdown');
        trigger = byClass('.dropdown-trigger');
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

    it('does not close by itself when a language button is clicked', () => {
        trigger.click();
        byClass('.translate-button').click();

        expect(dropdown.classList.contains('active')).toBe(true);
    });
});
