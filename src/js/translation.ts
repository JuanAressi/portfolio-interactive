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
        navbar: {
            home: 'Home',
            work: 'My Work',
            about: 'About Me',
            translate: 'Translate',
            email: 'Email',
            github: 'GitHub',
            linkedin: 'LinkedIn',
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
        navbar: {
            home: 'Inicio',
            work: 'Mi Trabajo',
            about: 'Sobre Mí',
            translate: 'Traducir',
            email: 'Correo',
            github: 'GitHub',
            linkedin: 'LinkedIn',
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

const translatePage = (language: Language): void => {
    const strings = lang[language as keyof typeof lang];

    const headerTitle = document.querySelector('[data-translate="header.title"]');
    const headerProfession = document.querySelector('[data-translate="header.profession"]');
    const workTitle = document.querySelector('[data-translate="work.title"]');
    const projectsTitle = document.querySelector('[data-translate="projects.title"]');
    const projectsItem1 = document.querySelector('[data-translate="projects.item-1"]');
    const projectsItem2 = document.querySelector('[data-translate="projects.item-2"]');
    const projectsItem3 = document.querySelector('[data-translate="projects.item-3"]');
    const aboutTitle = document.querySelector('[data-translate="about.title"]');
    const aboutParagraph1 = document.querySelector('[data-translate="about.paragraph-1"]');
    const aboutParagraph2 = document.querySelector('[data-translate="about.paragraph-2"]');
    const aboutParagraph3 = document.querySelector('[data-translate="about.paragraph-3"]');
    const aboutParagraph4 = document.querySelector('[data-translate="about.paragraph-4"]');
    const navbarHome = document.querySelector('[data-translate="navbar.home"]');
    const navbarWork = document.querySelector('[data-translate="navbar.work"]');
    const navbarAbout = document.querySelector('[data-translate="navbar.about"]');
    const navbarTranslate = document.querySelector('[data-translate="navbar.translate"]');
    const navbarEmail = document.querySelector('[data-translate="navbar.email"]');
    const navbarGithub = document.querySelector('[data-translate="navbar.github"]');
    const navbarLinkedin = document.querySelector('[data-translate="navbar.linkedin"]');

    dramaticGlitch(headerTitle as HTMLElement | null, strings.header.title);
    dramaticGlitch(headerProfession as HTMLElement | null, strings.header.profession);
    dramaticGlitch(workTitle as HTMLElement | null, strings.work.title);
    dramaticGlitch(projectsTitle as HTMLElement | null, strings.projects.title);
    dramaticGlitch(projectsItem1 as HTMLElement | null, strings.projects['item-1']);
    dramaticGlitch(projectsItem2 as HTMLElement | null, strings.projects['item-2']);
    dramaticGlitch(projectsItem3 as HTMLElement | null, strings.projects['item-3']);
    dramaticGlitch(aboutTitle as HTMLElement | null, strings.about.title);
    dramaticGlitch(aboutParagraph1 as HTMLElement | null, strings.about['paragraph-1']);
    dramaticGlitch(aboutParagraph2 as HTMLElement | null, strings.about['paragraph-2']);
    dramaticGlitch(aboutParagraph3 as HTMLElement | null, strings.about['paragraph-3']);
    dramaticGlitch(aboutParagraph4 as HTMLElement | null, strings.about['paragraph-4']);
    dramaticGlitch(navbarHome as HTMLElement | null, strings.navbar.home);
    dramaticGlitch(navbarWork as HTMLElement | null, strings.navbar.work);
    dramaticGlitch(navbarAbout as HTMLElement | null, strings.navbar.about);
    dramaticGlitch(navbarTranslate as HTMLElement | null, strings.navbar.translate);
    dramaticGlitch(navbarEmail as HTMLElement | null, strings.navbar.email);
    dramaticGlitch(navbarGithub as HTMLElement | null, strings.navbar.github);
    dramaticGlitch(navbarLinkedin as HTMLElement | null, strings.navbar.linkedin);
};

const syncNavAriaLabels = (language: Language): void => {
    const strings = lang[language as keyof typeof lang].navbar;
    const map: Array<[string, string]> = [
        ['[data-nav="home"]', strings.home],
        ['[data-nav="work"]', strings.work],
        ['[data-nav="about"]', strings.about],
        ['[data-nav="translate"]', strings.translate],
        ['.dropdown-trigger', strings.translate],
        ['[data-nav="email"]', strings.email],
        ['[data-nav="github"]', strings.github],
        ['[data-nav="linkedin"]', strings.linkedin],
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
    let startTime = performance.now();
    const correctPositions = new Set<number>();
    const frameDelay = 32;
    const duration = 450;

    function frame(now: number) {
        let progress = (now - startTime) / duration;
        if (progress < 1) {
            let output = '';
            for (let i = 0; i < finalText.length; i++) {
                if (correctPositions.has(i)) {
                    output += finalText[i];
                    continue;
                }

                let chance = Math.pow(1 - progress, 2);
                if (Math.random() < chance) {
                    output += chars.charAt(Math.floor(Math.random() * chars.length));
                } else {
                    output += finalText[i];
                    correctPositions.add(i);
                }
            }
            element!.textContent = output;
            setTimeout(() => requestAnimationFrame(frame), frameDelay);
        } else {
            element!.textContent = finalText;
        }
    }

    requestAnimationFrame(frame);
}
