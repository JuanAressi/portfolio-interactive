const lang = {
    en: {
        header: {
            title: 'Systems Engineer',
            profession: 'Full Stack Developer',
        },
        work: {
            title: 'My Work Experience',
        },
        projects: {
            title: 'Projects',
            'item-1': 'Portfolio Interactive',
            'item-2': 'Open Source Tools',
            'item-3': 'Side Experiments',
        },
        about: {
            title: "Hi, I'm Juan",
            'paragraph-1': "I'm a Systems Engineer and Full Stack Developer from Argentina.",
            'paragraph-2':
                'My journey in technology started with a curiosity about how things work, which evolved into a career building solutions that make a difference',
            'paragraph-3':
                'I transform ideas into innovative digital solutions, creating products that combine functionality, design, and real value for users',
            'paragraph-4':
                'With expertise in modern web technologies, I specialize in developing scalable applications that combine beautiful design with robust functionality, focusing on clean code, user-centered design, and continuous learning',
        },
        contact: {
            title: "Let's get in touch",
            email: 'Email',
            github: 'GitHub',
            linkedin: 'LinkedIn',
            cv: 'Download CV',
        },
        navbar: {
            home: 'Home',
            work: 'My Work',
            about: 'About Me',
            contact: 'Contact',
            translate: 'Translate',
        },
    },
    es: {
        header: {
            title: 'Ingeniero en Sistemas',
            profession: 'Desarrollador Full Stack',
        },
        work: {
            title: 'Experiencia laboral',
        },
        projects: {
            title: 'Proyectos',
            'item-1': 'Portfolio Interactive',
            'item-2': 'Herramientas open source',
            'item-3': 'Experimentos',
        },
        about: {
            title: 'Hola, soy Juan',
            'paragraph-1': 'Soy Ingeniero en Sistemas y Desarrollador Full Stack de Argentina.',
            'paragraph-2':
                'Mi viaje en la tecnología comenzó con curiosidad sobre cómo funcionan las cosas, que evolucionó en una carrera construyendo soluciones que hagan una diferencia',
            'paragraph-3':
                'Transformo ideas en soluciones digitales innovadoras, creando productos que combinan funcionalidad, diseño y valor real para los usuarios',
            'paragraph-4':
                'Con expertise en tecnologías web modernas, me especializo en desarrollar aplicaciones escalables que combinan diseño elegante con funcionalidad robusta, enfocándome en código limpio, diseño centrado en el usuario y aprendizaje continuo',
        },
        contact: {
            title: 'Hablemos',
            email: 'Correo',
            github: 'GitHub',
            linkedin: 'LinkedIn',
            cv: 'Descargar CV',
        },
        navbar: {
            home: 'Inicio',
            work: 'Mi Trabajo',
            about: 'Sobre Mí',
            contact: 'Contacto',
            translate: 'Traducir',
        },
    },
};

enum Language {
    ES = 'es',
    EN = 'en',
}

const translateButtons = document.querySelectorAll('.translate-button');

translateButtons.forEach((button: Element) => {
    button.addEventListener('click', (event: Event) => {
        event.stopPropagation();

        const target = (event.currentTarget as HTMLElement) || (event.target as HTMLElement);
        const selectedLanguage = (
            target.closest('[data-language]') as HTMLElement | null
        )?.getAttribute('data-language') as Language | null;

        if (!selectedLanguage) return;

        const currentLanguage = localStorage.getItem('selectedLanguage');
        if (currentLanguage === selectedLanguage) {
            document.querySelector('.dropdown')?.classList.remove('active');
            document.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            return;
        }

        handlePageTranslation(selectedLanguage);
        syncLanguageSelectedClass(selectedLanguage);

        document.querySelector('.dropdown')?.classList.remove('active');
        document.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
    });
});

const handlePageTranslation = (selectedLanguage: Language): void => {
    if (!selectedLanguage) {
        selectedLanguage = Language.EN;
    }

    if (selectedLanguage !== Language.ES && selectedLanguage !== Language.EN) {
        selectedLanguage = Language.EN;
    }

    localStorage.setItem('selectedLanguage', selectedLanguage);

    translatePage(selectedLanguage);
    syncNavAriaLabels(selectedLanguage);
    window.dispatchEvent(
        new CustomEvent('portfolio:lang', { detail: { language: selectedLanguage } })
    );
};

const getByPath = (strings: Record<string, unknown>, path: string): string => {
    const value = path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object' && key in acc) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, strings);

    if (typeof value !== 'string') {
        console.warn(`[translation] missing key: ${path}`);
        return '';
    }

    return value;
};

const translatePage = (language: Language): void => {
    const strings = lang[language as keyof typeof lang];

    document.querySelectorAll<HTMLElement>('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (!key) return;
        dramaticGlitch(element, getByPath(strings, key));
    });
};

const syncNavAriaLabels = (language: Language): void => {
    const strings = lang[language as keyof typeof lang].navbar;
    const map: Array<[string, string]> = [
        ['[data-nav="home"]', strings.home],
        ['[data-nav="work"]', strings.work],
        ['[data-nav="about"]', strings.about],
        ['[data-nav="contact"]', strings.contact],
        ['[data-nav="translate"]', strings.translate],
        ['.dropdown-trigger', strings.translate],
    ];

    map.forEach(([selector, label]) => {
        const el = document.querySelector(selector);
        if (el) {
            el.setAttribute('aria-label', label);
        }
    });
};

const syncLanguageSelectedClass = (language: Language): void => {
    document.querySelectorAll('.translate-button').forEach(button => {
        button.classList.toggle('selected', button.getAttribute('data-language') === language);
    });
};

const translatePageOnLoad = (): void => {
    let language = localStorage.getItem('selectedLanguage') as Language | null;
    if (!language) {
        language = Language.EN;
    }

    handlePageTranslation(language);
    syncLanguageSelectedClass(language);
};

translatePageOnLoad();

function dramaticGlitch(element: HTMLElement | null, text: string) {
    if (!element) return;

    const finalText = text;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        element.textContent = finalText;
        return;
    }

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,./'ñó10               ";
    const startTime = performance.now();
    const duration = 650;

    // Each character gets its own reveal threshold, biased left-to-right with jitter,
    // so the text resolves as a cascading decrypt instead of every char settling at once.
    const revealThresholds = Array.from({ length: finalText.length }, (_, i) => {
        const base = finalText.length > 1 ? i / (finalText.length - 1) : 0;
        const jitter = (Math.random() - 0.5) * 0.35;
        return Math.min(1, Math.max(0, base * 0.7 + jitter));
    });

    function frame(now: number) {
        const progress = (now - startTime) / duration;
        if (progress < 1) {
            let output = '';
            for (let i = 0; i < finalText.length; i++) {
                if (progress >= revealThresholds[i]) {
                    output += finalText[i];
                } else {
                    output += chars.charAt(Math.floor(Math.random() * chars.length));
                }
            }
            element!.textContent = output;
            requestAnimationFrame(frame);
        } else {
            element!.textContent = finalText;
        }
    }

    requestAnimationFrame(frame);
}
