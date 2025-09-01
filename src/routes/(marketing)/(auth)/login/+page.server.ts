export const ssr = false;

import { fail, redirect, type Actions } from '@sveltejs/kit';

import type { Provider } from '@supabase/supabase-js';
import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types.js';
import { formSchema } from './schema';

export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(zod(formSchema)),
	};
};

export const actions: Actions = {
	default: async (event) => {
		const provider = event.url.searchParams.get('provider') as Provider;
		const searchParams = event.url.searchParams;
		const redirectTo = searchParams.get('redirectTo');
		searchParams.set('next', searchParams.get('next') || '/dashboard');

		if (provider) {
			if (!redirectTo) return fail(400, {});

			const { data, error } = await event.locals.supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				return fail(400, {});
			}

			redirect(303, data.url);
		}

		// Vérifier si c'est une erreur de rate limiting
		const rateLimitExceeded = event.request.headers.get('x-rate-limit-exceeded');
		if (rateLimitExceeded === 'true') {
			const rateLimitMessage = event.request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';


			// Utiliser setError au lieu de fail pour une meilleure gestion
			const form = await superValidate(zod(formSchema));
			setError(form, '', rateLimitMessage);
			return { form };
		}

		const supabase = event.locals.supabase;
		const form = await superValidate(event, zod(formSchema));
		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { email, password } = form.data;

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {

			// Détecter l'erreur "Email not confirmed"
			if (error.code === 'email_not_confirmed') {
				// Rediriger vers la confirmation pour renvoyer l'email
				throw redirect(303, `/confirmation?email=${encodeURIComponent(email)}`);
			}

			// Détecter d'autres erreurs courantes
			if (error.code === 'invalid_credentials') {
				return setError(form, '', 'Email ou mot de passe incorrect');
			}

			if (error.message?.includes('Too many requests')) {
				return setError(form, '', 'Trop de tentatives. Attendez avant de réessayer.');
			}

			// Erreur générique
			return setError(form, '', 'Erreur lors de la connexion. Veuillez réessayer.');
		}

		redirect(303, '/auth/callback?next=/dashboard');
	},
};
