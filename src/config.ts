import type { Provider } from '@supabase/supabase-js';

export const WebsiteName: string = 'Pattyly';

/* You'll need to configure your providers in
your Supabase project settings `/supabase/config.toml` */
export const oAuthProviders: Provider[] = [
	'google'
];
