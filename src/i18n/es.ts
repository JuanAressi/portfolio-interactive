export const es = {
    meta: {
        title: 'Juan Aressi — Desarrollador full stack',
        description:
            'Ingeniero en Sistemas y desarrollador full stack de Argentina. Diseño y desarrollo sitios y sistemas web con movimiento e interacción. Cofundador de Cubrama.',
        role: 'Desarrollador full stack',
    },
    header: {
        title: 'Ingeniero en Sistemas',
        profession: 'Desarrollador Full Stack',
    },
    work: {
        title: 'Experiencia laboral',
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
};

/** Spanish is the default locale, so its shape is the one every language has to match. */
export type Dictionary = typeof es;
