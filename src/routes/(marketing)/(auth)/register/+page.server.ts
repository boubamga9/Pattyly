export const ssr = false;

import { fail, redirect, type Actions } from '@sveltejs/kit';

import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types.js';
import { formSchema } from './schema';

export const load: PageServerLoad = async ({ url }) => {
	const next = url.searchParams.get('next');
	const isCheckout = Boolean(
		typeof next === 'string' &&
		decodeURIComponent(next).match(/^\/checkout\/.+$/),
	);

	return {
		isCheckout,
		form: await superValidate(zod(formSchema)),
	};
};

export const actions: Actions = {
	default: async (event) => {
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

		const redirectUrl = `${process.env.PUBLIC_SITE_URL || 'http://localhost:5176'}/auth/callback?next=onboarding`;

		const {
			error,
			data: { user, session },
		} = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: redirectUrl
			}
		});

		if (error) {

			// Check to see if sign-ups are disabled in Supabase
			if (
				error.code === 'signup_disabled' ||
				error.message?.includes('Signups not allowed')
			) {
				return {
					form,
					signupDisabled: true,
				};
			}

			// Détecter l'erreur "User already registered"
			if (
				error.code === 'user_already_exists'
			) {
				// Rediriger vers la confirmation pour renvoyer l'email
				throw redirect(303, `/confirmation?email=${encodeURIComponent(email)}`);
			}

			// Détecter d'autres erreurs courantes
			if (error.message?.includes('Invalid email')) {
				return setError(form, 'email', 'Format d\'email invalide. Veuillez vérifier votre adresse email.');
			}

			if (error.message?.includes('Password should be at least')) {
				return setError(form, 'password', 'Le mot de passe doit contenir au moins 6 caractères.');
			}

			// Erreur générique pour les autres cas
			console.log(error)
			return setError(form, '', 'Impossible de créer le compte. Veuillez réessayer.');
		}

		// Si l'inscription a réussi (avec ou sans session), rediriger vers la confirmation
		if (user && user.email) {

			throw redirect(303, `/confirmation?email=${encodeURIComponent(user.email)}`);
		}

		// Fallback (normalement on ne devrait jamais arriver ici)
		throw redirect(303, '/');
	},
};