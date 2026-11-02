export function initLanguageMenu(): void {
    const dropdown = document.querySelector('.dropdown');
    const trigger = document.querySelector('.dropdown-trigger');
    if (!dropdown || !trigger) return;

    trigger.addEventListener('click', event => {
        event.stopPropagation();
        const isOpen = dropdown.classList.toggle('active');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    dropdown.querySelectorAll('.translate-button').forEach(button => {
        button.addEventListener('click', event => {
            event.stopPropagation();
        });
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
    });
}

initLanguageMenu();
