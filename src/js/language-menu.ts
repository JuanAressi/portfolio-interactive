export function initLanguageMenu(): void {
    const dropdown = document.querySelector('.dropdown');
    const trigger = document.querySelector('.dropdown-trigger');
    if (!dropdown || !trigger) return;

    trigger.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = dropdown.classList.toggle('active');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    dropdown.querySelectorAll<HTMLAnchorElement>('.translate-button').forEach(link => {
        link.addEventListener('click', event => {
            if (link.hasAttribute('aria-current')) {
                // Already on this language: just close the menu.
                event.preventDefault();
            } else {
                link.hash = location.hash;
            }
        });
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
    });
}

initLanguageMenu();
