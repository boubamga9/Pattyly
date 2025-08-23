export const ssr = false;

import { fail, type Actions } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import type { PageServerLoad } from './$types';
import { formSchema } from './schema';

export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(zod(formSchema)),
	};
};

export const actions: Actions = {
	default: async ({ url, request, locals: { supabase } }) => {
		// Vérifier si c'est une erreur de rate limiting
		const rateLimitExceeded = request.headers.get('x-rate-limit-exceeded');
		if (rateLimitExceeded === 'true') {
			const rateLimitMessage = request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';
			console.log('🚫 Rate limiting détecté dans l\'action forgot-password:', rateLimitMessage);

			// Utiliser setError au lieu de fail pour une meilleure gestion
			const form = await superValidate(request, zod(formSchema));
			setError(form, '', rateLimitMessage);
			return { form };
		}

		const form = await superValidate(request, zod(formSchema));
		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { email } = form.data;
		const redirectTo = url.searchParams.get('redirectTo');
		if (!redirectTo) {
			return setError(form, '', 'Invalid redirect URL.');
		}

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo,
		});

		if (error) {
			return setError(
				form,
				'',
				'An error occured while sending the reset email. Please try again later.',
			);
		}

		return message(form, {
			success: 'Sent. Check your email for reset password instructions.',
		});
	},
};
