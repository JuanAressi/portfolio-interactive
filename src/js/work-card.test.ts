import { describe, expect, it } from 'vitest';
import {
    JOB_FIELD_MAX,
    getAllJobPreviews,
    getJobPreview,
    getLangCode,
    isDenseJobPreview,
} from './jobs-data.ts';
import { TECH_SLUGS, createTechIconSvg, isTechSlug } from './tech-icons.ts';
import { applyMonitorJob, createMonitorJobCard, setMonitorJobIdle } from './work-card.ts';

describe('getLangCode', () => {
    it('follows the lang of the document', () => {
        document.documentElement.lang = 'en';
        expect(getLangCode()).toBe('en');

        document.documentElement.lang = 'es';
        expect(getLangCode()).toBe('es');
    });
});

describe('getJobPreview', () => {
    it('returns en dense job by id', () => {
        const job = getJobPreview('capgemini', 'en');
        expect(job?.company).toContain('Capgemini');
        expect(job?.role).toBe('Backend Developer');
        expect(job?.years).toBeTruthy();
        expect(job?.techs).toEqual(['php', 'javascript']);
    });

    it('returns es job by id with Spanish role', () => {
        const job = getJobPreview('capgemini', 'es');
        expect(job?.role).toContain('Backend');
        expect(job?.outcome.length).toBeGreaterThan(0);
    });

    it('returns null for unknown id', () => {
        expect(getJobPreview('nope', 'en')).toBeNull();
    });
});

describe('isDenseJobPreview', () => {
    it('is true for Ignitix / Capgemini / Secco / Persiscal / SACSI', () => {
        for (const id of ['ignitix', 'capgemini', 'secco', 'persiscal', 'sacsi'] as const) {
            expect(isDenseJobPreview(getJobPreview(id, 'en')!)).toBe(true);
            expect(isDenseJobPreview(getJobPreview(id, 'es')!)).toBe(true);
        }
    });
});

describe('authored soft maxes', () => {
    it('keeps every authored field within JOB_FIELD_MAX', () => {
        for (const job of getAllJobPreviews()) {
            expect(job.company.length).toBeLessThanOrEqual(JOB_FIELD_MAX.company);
            expect(job.role.length).toBeLessThanOrEqual(JOB_FIELD_MAX.role);
            expect(job.years.length).toBeLessThanOrEqual(JOB_FIELD_MAX.years);
            expect(job.outcome.length).toBeLessThanOrEqual(JOB_FIELD_MAX.outcome);
            expect(job.bullets.length).toBeLessThanOrEqual(JOB_FIELD_MAX.bulletsMax);
            expect(job.techs.length).toBeLessThanOrEqual(JOB_FIELD_MAX.techsMax);
            for (const bullet of job.bullets) {
                expect(bullet.length).toBeLessThanOrEqual(JOB_FIELD_MAX.bullet);
            }
        }
    });

    it('Ignitix has laravel in techs; Capgemini has no react', () => {
        expect(getJobPreview('ignitix', 'en')!.techs).toEqual(['javascript', 'php', 'laravel']);
        expect(getJobPreview('capgemini', 'en')!.techs).not.toContain('react');
        expect(getJobPreview('secco', 'en')!.techs).toEqual([
            'javascript',
            'react',
            'php',
            'laravel',
        ]);
    });

    it('Persiscal has nextjs+laravel; SACSI has wordpress+php+javascript+react', () => {
        expect(getJobPreview('persiscal', 'en')!.techs).toEqual(['nextjs', 'laravel']);
        expect(getJobPreview('sacsi', 'en')!.techs).toEqual([
            'wordpress',
            'php',
            'javascript',
            'react',
        ]);
    });
});

describe('tech-icons', () => {
    it('exports the six known slugs', () => {
        expect(TECH_SLUGS).toEqual(['javascript', 'php', 'laravel', 'react', 'nextjs', 'wordpress']);
        expect(isTechSlug('javascript')).toBe(true);
        expect(isTechSlug('cobol')).toBe(false);
    });

    it('builds SVG with path for each slug', () => {
        for (const slug of TECH_SLUGS) {
            const svg = createTechIconSvg(slug);
            expect(svg).not.toBeNull();
            expect(svg!.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(10);
            expect(svg!.getAttribute('aria-hidden')).toBe('true');
        }
        expect(createTechIconSvg('unknown')).toBeNull();
    });
});

describe('monitor job card', () => {
    it('applies dense zones and clears on idle', () => {
        const el = createMonitorJobCard();
        const job = getJobPreview('ignitix', 'en')!;
        applyMonitorJob(el, job);

        expect(el.querySelector('[data-work-field="role"]')?.textContent).toBe(job.role);
        expect(el.querySelector('[data-work-field="outcome"]')?.textContent).toBe(job.outcome);
        expect(el.querySelectorAll('[data-work-field="bullets"] li')).toHaveLength(4);
        expect(el.querySelectorAll('[data-work-field="techs"] svg')).toHaveLength(3);
        expect(el.dataset.activeJob).toBe('ignitix');
        expect(el.style.opacity).toBe('1');
        expect(el.querySelector('[data-work-field="detail"]')).toBeNull();

        setMonitorJobIdle(el);
        expect(el.querySelector('[data-work-field="role"]')?.textContent).toBe('');
        expect(el.querySelectorAll('[data-work-field="techs"] svg')).toHaveLength(0);
        expect(el.querySelectorAll('[data-work-field="bullets"] li')).toHaveLength(0);
        expect(el.dataset.activeJob).toBeUndefined();
        expect(el.getAttribute('data-idle')).toBe('true');
    });

    it('rebuilds tech rail when switching jobs (no leftover icons)', () => {
        const el = createMonitorJobCard();
        applyMonitorJob(el, getJobPreview('capgemini', 'en')!);
        expect(el.querySelectorAll('[data-work-field="techs"] svg')).toHaveLength(2);

        applyMonitorJob(el, getJobPreview('secco', 'en')!);
        expect(el.querySelectorAll('[data-work-field="techs"] svg')).toHaveLength(4);
        expect(el.querySelector('[data-work-field="techs"]')?.getAttribute('aria-label')).toContain(
            'React'
        );

        applyMonitorJob(el, getJobPreview('capgemini', 'en')!);
        expect(el.querySelectorAll('[data-work-field="techs"] svg')).toHaveLength(2);
    });
});
