import type { TechSlug } from './tech-icons.ts';

export type { TechSlug };

export type JobPreview = {
    id: string;
    company: string;
    role: string;
    years: string;
    outcome: string;
    bullets: string[];
    techs: TechSlug[];
};

/** Soft maxes — Vitest fails if authored strings exceed these. */
export const JOB_FIELD_MAX = {
    company: 48,
    role: 48,
    years: 40,
    outcome: 110,
    bullet: 100,
    bulletsMax: 3,
    techsMax: 5,
} as const;

export function isDenseJobPreview(job: JobPreview): boolean {
    return Boolean(job.outcome) && job.bullets.length >= 2 && job.techs.length >= 1;
}

const pendingEn = (id: string, company: string, role: string): JobPreview => ({
    id,
    company,
    role,
    years: '—',
    outcome: '',
    bullets: [],
    techs: [],
});

const pendingEs = (id: string, company: string, role: string): JobPreview => ({
    id,
    company,
    role,
    years: '—',
    outcome: '',
    bullets: [],
    techs: [],
});

const jobsEn: Record<string, JobPreview> = {
    persiscal: pendingEn('persiscal', 'Persiscal', 'Full Stack Developer'),
    patatag: pendingEn('patatag', 'Patatag', 'Software Engineer'),
    ignitix: {
        id: 'ignitix',
        company: 'Ignitix IT Consulting GmbH',
        role: 'Full Stack Web Developer',
        years: 'Feb 2024 — Present',
        outcome: 'Invoice app, REST APIs, and architecture redesign for billing scale.',
        bullets: [
            'Built invoice generation that tightened the billing process.',
            'Designed and maintained REST APIs for internal and external systems.',
            'Raised coding standards and ops docs for maintainability.',
        ],
        techs: ['javascript', 'php', 'laravel'],
    },
    capgemini: {
        id: 'capgemini',
        company: 'Capgemini — Yahoo!',
        role: 'Backend Developer',
        years: 'Jun 2023 — Dec 2023',
        outcome: 'Scrum delivery, automated tests, and service version migrations.',
        bullets: [
            'Delivered backend work in Scrum with the Yahoo! engagement team.',
            'Added automated tests to raise code quality and cut regressions.',
            'Migrated services to newer stacks for compatibility and maintainability.',
        ],
        techs: ['php', 'javascript'],
    },
    secco: {
        id: 'secco',
        company: 'Secco',
        role: 'Full Stack Web Developer',
        years: 'Dec 2022 — Jun 2023',
        outcome: 'React + Laravel apps; legacy upgrades, UX refactors, performance.',
        bullets: [
            'Shipped full-stack apps focused on React.js and Laravel.',
            'Migrated PHP/Laravel versions on critical legacy systems.',
            'Refactored UI and load paths to improve UX and performance.',
        ],
        techs: ['javascript', 'react', 'php', 'laravel'],
    },
    sacsi: pendingEn('sacsi', 'SACSI', 'Junior Developer'),
};

const jobsEs: Record<string, JobPreview> = {
    persiscal: pendingEs('persiscal', 'Persiscal', 'Desarrollador Full Stack'),
    patatag: pendingEs('patatag', 'Patatag', 'Ingeniero de Software'),
    ignitix: {
        id: 'ignitix',
        company: 'Ignitix IT Consulting GmbH',
        role: 'Desarrollador Full Stack Web',
        years: 'Feb 2024 — Actualidad',
        outcome: 'App de facturación, APIs REST y rediseño de arquitectura para escalar billing.',
        bullets: [
            'Desarrollé generación de facturas que optimizó el proceso de cobro.',
            'Diseñé y mantuve APIs REST para sistemas internos y externos.',
            'Elevé estándares de código y documentación operativa.',
        ],
        techs: ['javascript', 'php', 'laravel'],
    },
    capgemini: {
        id: 'capgemini',
        company: 'Capgemini — Yahoo!',
        role: 'Desarrollador Backend',
        years: 'Jun 2023 — Dic 2023',
        outcome: 'Entrega en Scrum, tests automatizados y migraciones de servicios.',
        bullets: [
            'Entregué backend en Scrum con el equipo del engagement Yahoo!.',
            'Implementé tests automatizados para subir calidad y bajar errores.',
            'Migré servicios a versiones nuevas para compatibilidad y mantenimiento.',
        ],
        techs: ['php', 'javascript'],
    },
    secco: {
        id: 'secco',
        company: 'Secco',
        role: 'Desarrollador Full Stack Web',
        years: 'Dic 2022 — Jun 2023',
        outcome: 'Apps React + Laravel; upgrades legacy, UX y performance.',
        bullets: [
            'Desarrollé apps full stack con foco en React.js y Laravel.',
            'Migré versiones de PHP/Laravel en sistemas legacy críticos.',
            'Refactoricé UI y carga para mejorar UX y performance.',
        ],
        techs: ['javascript', 'react', 'php', 'laravel'],
    },
    sacsi: pendingEs('sacsi', 'SACSI', 'Desarrollador Junior'),
};

export function getJobPreview(id: string, language?: string | null): JobPreview | null {
    const table = language === 'es' ? jobsEs : jobsEn;
    return table[id] ?? null;
}

export function getLangCode(): 'en' | 'es' {
    return localStorage.getItem('selectedLanguage') === 'es' ? 'es' : 'en';
}

/** All authored jobs (both languages) for length / dense fixtures in tests. */
export function getAllJobPreviews(): JobPreview[] {
    return [...Object.values(jobsEn), ...Object.values(jobsEs)];
}
