import { afterFirstPaint } from './scene-boot.ts';
import { initScroll } from './scroll.ts';

const scroll = initScroll();

afterFirstPaint(() => {
    import('./scene.js')
        .then(({ startScene }) => startScene(scroll))
        .catch(error => {
            console.error('Error cargando la escena:', error);
        });
});
