import { startScene } from './scene.js';
import type { ScrollHandle } from './scroll.ts';

// Where along the camera path the share image is taken (see camera-movement.js).
const CAMERA_PROGRESS = 1;

// A scroll that never moves. `settled` lets the scene stop drawing once the picture is complete.
const stillScroll: ScrollHandle = {
    onFrame(listener) {
        const tick = () => {
            listener({ progress: CAMERA_PROGRESS, settled: true });
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },
};

startScene(stillScroll);
