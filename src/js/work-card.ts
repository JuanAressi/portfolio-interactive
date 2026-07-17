import type { JobPreview } from './jobs-data.ts';
import { createTechIconSvg, techTitlesLabel } from './tech-icons.ts';

// Aspect matches monitor glass aperture (~screenWidth / apertureHeight), not 16:9.
const CARD_WIDTH = 960;
const CARD_HEIGHT = 508;

/**
 * Build a monitor preview DOM node (fixed 960×508 for CSS3D scale math).
 *
 * Zones: header → outcome → bullets → tech rail
 */
export function createMonitorJobCard(): HTMLElement {
    const root = document.createElement('article');
    root.className = 'monitor-job-card monitor-job-card--monitor';
    root.setAttribute('data-work-card', 'monitor');
    root.setAttribute('role', 'region');
    root.style.width = `${CARD_WIDTH}px`;
    root.style.height = `${CARD_HEIGHT}px`;
    root.style.pointerEvents = 'none';

    root.innerHTML = `
      <div class="monitor-job-card__header">
        <p class="monitor-job-card__company" data-work-field="company"></p>
        <h3 class="monitor-job-card__role" data-work-field="role"></h3>
        <p class="monitor-job-card__years" data-work-field="years"></p>
      </div>
      <p class="monitor-job-card__outcome" data-work-field="outcome"></p>
      <ul class="monitor-job-card__bullets" data-work-field="bullets"></ul>
      <ul class="monitor-job-card__techs" data-work-field="techs"></ul>
    `;

    setMonitorJobIdle(root);
    return root;
}

function fillBullets(list: HTMLUListElement, bullets: string[]): void {
    list.replaceChildren(
        ...bullets.map(text => {
            const li = document.createElement('li');
            li.textContent = text;
            return li;
        })
    );
}

function fillTechs(list: HTMLUListElement, techs: JobPreview['techs']): void {
    const nodes: HTMLLIElement[] = [];
    for (const slug of techs) {
        const svg = createTechIconSvg(slug);
        if (!svg) continue;
        const li = document.createElement('li');
        li.className = 'monitor-job-card__tech';
        li.appendChild(svg);
        nodes.push(li);
    }
    list.replaceChildren(...nodes);
    if (nodes.length > 0) {
        list.setAttribute('aria-label', techTitlesLabel(techs));
    } else {
        list.removeAttribute('aria-label');
    }
}

export function applyMonitorJob(root: HTMLElement, data: JobPreview): void {
    const company = root.querySelector('[data-work-field="company"]');
    const role = root.querySelector('[data-work-field="role"]');
    const years = root.querySelector('[data-work-field="years"]');
    const outcome = root.querySelector('[data-work-field="outcome"]');
    const bullets = root.querySelector<HTMLUListElement>('[data-work-field="bullets"]');
    const techs = root.querySelector<HTMLUListElement>('[data-work-field="techs"]');

    if (company) company.textContent = data.company;
    if (role) role.textContent = data.role;
    if (years) years.textContent = data.years;
    if (outcome) outcome.textContent = data.outcome;
    if (bullets) fillBullets(bullets, data.bullets);
    if (techs) fillTechs(techs, data.techs);

    root.classList.toggle('monitor-job-card--empty-body', !data.outcome && data.bullets.length === 0);
    root.setAttribute('aria-label', `${data.company}: ${data.role}`);
    root.dataset.activeJob = data.id;
    root.style.opacity = '1';
    root.removeAttribute('data-idle');
}

export function setMonitorJobIdle(root: HTMLElement): void {
    const company = root.querySelector('[data-work-field="company"]');
    const role = root.querySelector('[data-work-field="role"]');
    const years = root.querySelector('[data-work-field="years"]');
    const outcome = root.querySelector('[data-work-field="outcome"]');
    const bullets = root.querySelector<HTMLUListElement>('[data-work-field="bullets"]');
    const techs = root.querySelector<HTMLUListElement>('[data-work-field="techs"]');

    if (company) company.textContent = '';
    if (role) role.textContent = '';
    if (years) years.textContent = '';
    if (outcome) outcome.textContent = '';
    if (bullets) bullets.replaceChildren();
    if (techs) {
        techs.replaceChildren();
        techs.removeAttribute('aria-label');
    }
    root.classList.remove('monitor-job-card--empty-body');
    root.removeAttribute('aria-label');
    delete root.dataset.activeJob;
    root.style.opacity = '0';
    root.setAttribute('data-idle', 'true');
}

export const WORK_CARD_MONITOR_SIZE = { width: CARD_WIDTH, height: CARD_HEIGHT };
