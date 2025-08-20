const lang = {
    en: {
        header: {
            title: 'Systems Engineer',
            profession: 'Full Stack Developer',
        },
        work: {
            title: 'My Work Experience',
        },
        about: {
            title: "Hi, I'm Juan",
            'paragraph-1': "I'm a Systems Engineer / Full Stack Developer from Argentina",
            'paragraph-2':
                'My journey in technology started with a curiosity about how things work, which evolved into a career building solutions that make a difference',
            'paragraph-3':
                'I transform ideas into innovative digital solutions, creating products that combine functionality, design, and real value for users',
            'paragraph-4':
                'With expertise in modern web technologies, I specialize in developing scalable applications that combine beautiful design with robust functionality, focusing on clean code, user-centered design, and continuous learning',
        },
        navbar: {
            work: 'My Work',
            about: 'About Me',
            translate: 'Translate',
            email: 'Email',
        },
    },
    es: {
        header: {
            title: 'Ingeniero de Sistemas',
            profession: 'Desarrollador Full Stack',
        },
        work: {
            title: 'My Work Experience',
        },
        about: {
            title: "Hi, I'm Juan",
            'paragraph-1': 'Soy un Ingeniero de Sistemas / Desarrollador Full Stack de Argentina',
            'paragraph-2':
                'Mi viaje en la tecnología comenzó con curiosidad sobre cómo funcionan las cosas, que evolucionó en una carrera construyendo soluciones que hagan una diferencia',
            'paragraph-3':
                'Transformo ideas en soluciones digitales innovadoras, creando productos que combinan funcionalidad, diseño y valor real para los usuarios',
            'paragraph-4':
                'Con expertise en tecnologías web modernas, me especializo en desarrollar aplicaciones escalables que combinan diseño elegante con funcionalidad robusta, enfocándome en código limpio, diseño centrado en el usuario y aprendizaje continuo',
        },
        navbar: {
            work: 'Mi Trabajo',
            about: 'Sobre Mí',
            translate: 'Traducir',
            email: 'Correo',
        },
    },
};

enum Language {
    ES = 'es',
    EN = 'en',
}

// Add event listener to the translate button.
const translateButton = document.querySelectorAll('.translate-button');
translateButton.forEach((button: Element) => {
    button.addEventListener('click', (event: Event) => {
        // Get the selected language from the button.
        let selectedLanguage = (event.target as HTMLElement).getAttribute(
            'data-language'
        ) as Language;

        // Get the language from the Local Storage.
        const currentLanguage = localStorage.getItem('selectedLanguage');

        // If the selected language is the same as the current language, return.
        if (currentLanguage === selectedLanguage) return;

        // Translate the page.
        handlePageTranslation(selectedLanguage);

        // Toggle the selected class.
        translateButton.forEach((button: Element) => {
            (button as HTMLElement).classList.toggle('selected');
        });
    });
});

/**
 * Handle the page translation and set the selected language in the Local Storage.
 *
 * @param selectedLanguage - The selected language.
 * @returns void
 */
const handlePageTranslation = (selectedLanguage: Language): void => {
    // If the selected language is not found, set the default language to Spanish.
    if (!selectedLanguage) {
        selectedLanguage = Language.EN;
    }

    // Verify that the selected language is valid.
    if (selectedLanguage !== Language.ES && selectedLanguage !== Language.EN) {
        selectedLanguage = Language.EN;
    }

    // Set the selected language in the Local Storage.
    localStorage.setItem('selectedLanguage', selectedLanguage);

    // Translate the page.
    translatePage(selectedLanguage);
};

/**
 * Translate the elements of the page.
 *
 * @param language - The language to translate the page to.
 * @returns void
 */
const translatePage = (language: Language): void => {
    // Get the elements of the page to translate.
    const headerTitle = document.querySelector('[data-translate="header.title"]');
    const headerProfession = document.querySelector('[data-translate="header.profession"]');
    const workTitle = document.querySelector('[data-translate="work.title"]');
    const aboutTitle = document.querySelector('[data-translate="about.title"]');
    const aboutParagraph1 = document.querySelector('[data-translate="about.paragraph-1"]');
    const aboutParagraph2 = document.querySelector('[data-translate="about.paragraph-2"]');
    const aboutParagraph3 = document.querySelector('[data-translate="about.paragraph-3"]');
    const aboutParagraph4 = document.querySelector('[data-translate="about.paragraph-4"]');
    const navbarWork = document.querySelector('[data-translate="navbar.work"]');
    const navbarAbout = document.querySelector('[data-translate="navbar.about"]');
    const navbarTranslate = document.querySelector('[data-translate="navbar.translate"]');
    const navbarEmail = document.querySelector('[data-translate="navbar.email"]');

    // Translate the elements.
    dramaticGlitch(headerTitle as HTMLElement, lang[language as keyof typeof lang].header.title);
    dramaticGlitch(
        headerProfession as HTMLElement,
        lang[language as keyof typeof lang].header.profession
    );
    dramaticGlitch(workTitle as HTMLElement, lang[language as keyof typeof lang].work.title);
    dramaticGlitch(aboutTitle as HTMLElement, lang[language as keyof typeof lang].about.title);
    dramaticGlitch(
        aboutParagraph1 as HTMLElement,
        lang[language as keyof typeof lang].about['paragraph-1']
    );
    dramaticGlitch(
        aboutParagraph2 as HTMLElement,
        lang[language as keyof typeof lang].about['paragraph-2']
    );
    dramaticGlitch(
        aboutParagraph3 as HTMLElement,
        lang[language as keyof typeof lang].about['paragraph-3']
    );
    dramaticGlitch(
        aboutParagraph4 as HTMLElement,
        lang[language as keyof typeof lang].about['paragraph-4']
    );
    dramaticGlitch(navbarWork as HTMLElement, lang[language as keyof typeof lang].navbar.work);
    dramaticGlitch(navbarAbout as HTMLElement, lang[language as keyof typeof lang].navbar.about);
    dramaticGlitch(
        navbarTranslate as HTMLElement,
        lang[language as keyof typeof lang].navbar.translate
    );
    dramaticGlitch(navbarEmail as HTMLElement, lang[language as keyof typeof lang].navbar.email);
};

/**
 * Translate the page on load.
 *
 * @returns void
 */
const translatePageOnLoad = (): void => {
    // Get the language from the Local Storage.
    let language = localStorage.getItem('selectedLanguage');

    // Translate the page.
    handlePageTranslation(language as Language);

    // Get the dropdown selected language.
    const dropdownSelectedLanguage = document.querySelector(`[data-language="${language}"]`);

    // If the dropdown selected language is found, add the selected class.
    if (dropdownSelectedLanguage) {
        (dropdownSelectedLanguage as HTMLElement).classList.add('selected');
    }
};

translatePageOnLoad();

function dramaticGlitch(element: HTMLElement, text: string) {
    const finalText = text;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz,./'               ";
    let startTime = performance.now();
    const correctPositions = new Set();
    const frameDelay = 66;
    const duration = 2000;

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
            element.textContent = output;
            setTimeout(() => requestAnimationFrame(frame), frameDelay);
        } else {
            element.textContent = finalText;
        }
    }

    requestAnimationFrame(frame);
}
