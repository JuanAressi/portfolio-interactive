import { afterFirstPaint, supportsWebGL2 } from './scene-boot.ts';
import { initScroll } from './scroll.ts';

const scroll = initScroll();

afterFirstPaint(() => {
    if (!supportsWebGL2()) return;

    import('./scene.js')
        .then(({ startScene }) => startScene(scroll))
        .catch(error => {
            console.error('Error cargando la escena:', error);
        });
});
