import {env} from 'cloudflare:workers';
export function getStore(){if(!env.DB)throw new Error('SAVE_UNAVAILABLE');return env.DB;}
