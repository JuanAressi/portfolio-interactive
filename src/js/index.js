import { afterFirstPaint, supportsWebGL2 } from './scene-boot.ts';
import { initScroll } from './scroll.ts';
import { playEntranceGlitch } from './text-glitch.ts';

const scroll = initScroll();
playEntranceGlitch();

afterFirstPaint(() => {
    if (!supportsWebGL2()) return;

    import('./scene.js')
        .then(({ startScene }) => startScene(scroll))
        .catch(error => {
            console.error('Error cargando la escena:', error);
        });
});
