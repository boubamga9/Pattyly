export const ssr = false;

import { fail, redirect, type Actions } from '@sveltejs/kit';

import { setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types.js';
import { formSchema } from './schema';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const next = url.searchParams.get('next');
	const plan = url.searchParams.get('plan');
	// ✅ Récupérer le ref depuis l'URL ou le cookie
	const affiliateCode = url.searchParams.get('ref') || cookies.get('affiliate_ref');
	
	const isCheckout = Boolean(
		typeof next === 'string' &&
		decodeURIComponent(next).match(/^\/checkout\/.+$/),
	);

	return {
		isCheckout,
		plan,
		affiliateCode, // ✅ Passer le code aux données
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

		const {
			error,
			data: { user },
		} = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: undefined  // Force l'OTP au lieu du lien magique
			}
		});

		// ✅ Tracking: Signup event (fire-and-forget pour ne pas bloquer)
		if (user?.id) {
			const { logEventAsync, Events } = await import('$lib/utils/analytics');
			logEventAsync(
				event.locals.supabaseServiceRole,
				Events.SIGNUP,
				{ email },
				user.id,
				'/register'
			);
		}

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
				return setError(form, '', 'Cet email est déjà utilisé. Veuillez utiliser un autre email.');
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
			// ✅ Transmettre le ref dans l'URL de confirmation (depuis l'URL ou le cookie)
			const affiliateCode = event.url.searchParams.get('ref') || event.cookies.get('affiliate_ref');
			console.log('🔍 [REGISTER] Ref lors de l\'inscription:', affiliateCode);
			const confirmationUrl = affiliateCode 
				? `/confirmation?email=${encodeURIComponent(user.email)}&ref=${encodeURIComponent(affiliateCode)}`
				: `/confirmation?email=${encodeURIComponent(user.email)}`;
			
			console.log('🔍 [REGISTER] URL de confirmation:', confirmationUrl);
			throw redirect(303, confirmationUrl);
		}


		// Fallback (normalement on ne devrait jamais arriver ici)
		throw redirect(303, '/');
	},
};