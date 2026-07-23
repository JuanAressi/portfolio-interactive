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
    bulletsMax: 4,
    techsMax: 5,
} as const;

export function isDenseJobPreview(job: JobPreview): boolean {
    return Boolean(job.outcome) && job.bullets.length >= 2 && job.techs.length >= 1;
}

const jobsEn: Record<string, JobPreview> = {
    persiscal: {
        id: 'persiscal',
        company: 'Persiscal',
        role: 'Full Stack Web Developer',
        years: 'Feb 2025 — Present',
        outcome: 'Working on a product where quality directly affects paying customers.',
        bullets: [
            "Built customer-facing features for the trip-management system's core paid product.",
            'Worked across the stack — Next.js on the front end, Laravel on the back end.',
            "Contributed directly to the product that drives the company's revenue.",
        ],
        techs: ['nextjs', 'laravel'],
    },
    sacsi: {
        id: 'sacsi',
        company: 'SACSI',
        role: 'Full Stack Web Developer',
        years: 'Oct 2020 — Nov 2022',
        outcome: 'Owned client production sites from build through ongoing maintenance.',
        bullets: [
            'Built custom WordPress themes and plugins with dynamic, AJAX-driven interfaces.',
            'Integrated third-party APIs into client WordPress sites.',
            'Improved site architecture for usability, performance, and coding-standard compliance.',
            'Developed and maintained features built on React.js.',
        ],
        techs: ['wordpress', 'php', 'javascript', 'react'],
    },
    ignitix: {
        id: 'ignitix',
        company: 'Ignitix IT Consulting GmbH',
        role: 'Full Stack Web Developer',
        years: 'Feb 2024 — Jan 2025',
        outcome: 'A year working on a billing system clients relied on daily.',
        bullets: [
            'Built invoice generation that tightened the billing process.',
            'Designed and maintained REST APIs for internal and external systems.',
            'Raised coding standards and ops docs for maintainability.',
            'Worked directly with consulting clients to scope and prioritize billing-platform requirements.',
        ],
        techs: ['javascript', 'php', 'laravel'],
    },
    capgemini: {
        id: 'capgemini',
        company: 'Capgemini — Yahoo!',
        role: 'Backend Developer',
        years: 'Jun 2023 — Dec 2023',
        outcome: "Contract work inside Yahoo!'s production codebase with their engineering team.",
        bullets: [
            'Delivered backend work in Scrum with the Yahoo! engagement team.',
            'Added automated tests to raise code quality and cut regressions.',
            'Migrated services to newer stacks for compatibility and maintainability.',
            'Improved existing implementations for better performance and a more scalable, organized structure.',
        ],
        techs: ['php', 'javascript'],
    },
    secco: {
        id: 'secco',
        company: 'Secco',
        role: 'Full Stack Web Developer',
        years: 'Dec 2022 — Jun 2023',
        outcome:
            'Worked across the full stack, including the legacy parts most systems avoid touching.',
        bullets: [
            'Shipped full-stack apps focused on React.js and Laravel.',
            'Migrated PHP/Laravel versions on critical legacy systems.',
            'Refactored UI and load paths to improve UX and performance.',
            'Designed and normalized MySQL databases to improve scalability and performance.',
        ],
        techs: ['javascript', 'react', 'php', 'laravel'],
    },
};

const jobsEs: Record<string, JobPreview> = {
    persiscal: {
        id: 'persiscal',
        company: 'Persiscal',
        role: 'Desarrollador Full Stack Web',
        years: 'Feb 2025 — Actualidad',
        outcome:
            'Trabajé en un producto donde la calidad afecta directamente a clientes que pagan.',
        bullets: [
            'Desarrollé funcionalidades para los usuarios del producto pago principal de gestión de viajes.',
            'Trabajé en todo el stack: Next.js en el frontend y Laravel en el backend.',
            'Contribuí directamente al producto que genera los ingresos de la empresa.',
        ],
        techs: ['nextjs', 'laravel'],
    },
    sacsi: {
        id: 'sacsi',
        company: 'SACSI',
        role: 'Desarrollador Full Stack Web',
        years: 'Oct 2020 — Nov 2022',
        outcome:
            'A cargo de sitios en producción de clientes, desde el desarrollo hasta el mantenimiento.',
        bullets: [
            'Desarrollé temas y plugins de WordPress a medida con interfaces dinámicas vía AJAX.',
            'Integré APIs de terceros en sitios WordPress de clientes.',
            'Mejoré la arquitectura del sitio en usabilidad, rendimiento y estándares de código.',
            'Desarrollé y mantuve funcionalidades sobre React.js.',
        ],
        techs: ['wordpress', 'php', 'javascript', 'react'],
    },
    ignitix: {
        id: 'ignitix',
        company: 'Ignitix IT Consulting GmbH',
        role: 'Desarrollador Full Stack Web',
        years: 'Feb 2024 — Ene 2025',
        outcome:
            'Un año trabajando en un sistema de facturación del que los clientes dependían a diario.',
        bullets: [
            'Desarrollé generación de facturas que optimizó el proceso de cobro.',
            'Diseñé y mantuve APIs REST para sistemas internos y externos.',
            'Elevé estándares de código y documentación operativa.',
            'Prioricé requerimientos de la plataforma de facturación junto a clientes de consultoría.',
        ],
        techs: ['javascript', 'php', 'laravel'],
    },
    capgemini: {
        id: 'capgemini',
        company: 'Capgemini — Yahoo!',
        role: 'Desarrollador Backend',
        years: 'Jun 2023 — Dic 2023',
        outcome:
            'Trabajo de consultoría dentro del código en producción de Yahoo!, junto a su equipo.',
        bullets: [
            'Entregué backend en Scrum con el equipo del engagement Yahoo!.',
            'Implementé tests automatizados para subir calidad y bajar errores.',
            'Migré servicios a versiones nuevas para compatibilidad y mantenimiento.',
            'Optimicé implementaciones para mejorar rendimiento y escalabilidad.',
        ],
        techs: ['php', 'javascript'],
    },
    secco: {
        id: 'secco',
        company: 'Secco',
        role: 'Desarrollador Full Stack Web',
        years: 'Dic 2022 — Jun 2023',
        outcome:
            'Trabajé en todo el stack, incluidas las partes legacy que la mayoría evita tocar.',
        bullets: [
            'Desarrollé apps full stack con foco en React.js y Laravel.',
            'Migré versiones de PHP/Laravel en sistemas legacy críticos.',
            'Refactoricé UI y carga para mejorar UX y performance.',
            'Diseñé y normalicé bases de datos MySQL para mejorar la escalabilidad y el rendimiento.',
        ],
        techs: ['javascript', 'react', 'php', 'laravel'],
    },
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
