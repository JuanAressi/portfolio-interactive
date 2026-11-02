import { isNativeLayout } from './scroll.ts';

export interface SceneTier {
    pixelRatio: number;
    shadows: boolean;
    chair: boolean;
}

const MAX_PIXEL_RATIO = 1.5;

export function getSceneTier(): SceneTier {
    if (isNativeLayout()) {
        return { pixelRatio: 1, shadows: false, chair: false };
    }
    return {
        pixelRatio: Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
        shadows: true,
        chair: true,
    };
}
