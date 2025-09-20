import { fail, type Actions, type ServerLoad } from '@sveltejs/kit';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';
import { EmailService } from '$lib/services/email-service';

export const load: ServerLoad = async () => {
	return {
		form: await superValidate(zod(formSchema)),
	};
};

export const actions: Actions = {
	default: async (event) => {
		// --- Vérif rate limiting ---
		const rateLimitExceeded = event.request.headers.get("x-rate-limit-exceeded");
		if (rateLimitExceeded === "true") {
			const rateLimitMessage =
				event.request.headers.get("x-rate-limit-message") ||
				"Trop de tentatives. Veuillez patienter.";
			const form = await superValidate(zod(formSchema));
			setError(form, "", rateLimitMessage);
			return { form };
		}

		const supabase = event.locals.supabaseServiceRole;
		const form = await superValidate(event, zod(formSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { name, email, subject, body } = form.data;

		// --- Sauvegarde en DB ---
		const { error } = await supabase.from("contact_messages").insert({
			name,
			email,
			subject,
			body,
			updated_at: new Date().toISOString(),
		});

		if (error) {
			console.log(error)
			return setError(
				form,
				"",
				"Erreur lors de l'envoi du message. Veuillez réessayer plus tard."
			);
		}

		// --- Envoi des emails (non bloquant) ---
		try {
			await Promise.all([
				EmailService.sendContactConfirmation({
					customerName: name,
					customerEmail: email,
					message: body,
					subject,
				}),
				EmailService.sendContactNotification({
					customerName: name,
					customerEmail: email,
					subject,
					message: body,
					date: new Date().toLocaleDateString("fr-FR"),
				}),
			]);
		} catch (e) { }

		return message(form, {
			success: "Merci pour ton message. On te répondra bientôt !",
		});
	},
};
