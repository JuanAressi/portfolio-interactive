import { en } from './en.ts';
import { es } from './es.ts';

export const dictionaries = { es, en };

export type Locale = keyof typeof dictionaries;
