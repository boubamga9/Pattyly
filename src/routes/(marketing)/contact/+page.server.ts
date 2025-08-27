import type { PostgrestError } from '@supabase/supabase-js';
import { fail, type Actions, type ServerLoad } from '@sveltejs/kit';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { formSchema } from './schema';

export const load: ServerLoad = async () => {
	return {
		form: await superValidate(zod(formSchema)),
	};
};

export const actions: Actions = {
	default: async (event) => {
		// Vérifier si c'est une erreur de rate limiting
		const rateLimitExceeded = event.request.headers.get('x-rate-limit-exceeded');
		if (rateLimitExceeded === 'true') {
			const rateLimitMessage = event.request.headers.get('x-rate-limit-message') || 'Trop de tentatives. Veuillez patienter.';
			console.log('🚫 Rate limiting détecté dans l\'action:', rateLimitMessage);

			// Utiliser setError au lieu de fail pour une meilleure gestion
			const form = await superValidate(zod(formSchema));
			setError(form, '', rateLimitMessage);
			return { form };
		}

		const supabaseServiceRole = event.locals.supabaseServiceRole;
		const form = await superValidate(event, zod(formSchema));
		if (!form.valid) {
			return fail(400, {
				form,
			});
		}

		const { name, email, subject, body } = form.data;

		// const transport = createTransport({
		// 	host: PRIVATE_SMTP_HOST,
		// 	port: Number(PRIVATE_SMTP_PORT),
		// 	secure: true,
		// 	auth: {
		// 		user: PRIVATE_SMTP_USER,
		// 		pass: PRIVATE_SMTP_PASSWORD,
		// 	},
		// });

		const insert = supabaseServiceRole.from('contact_messages').insert({
			name,
			email,
			subject,
			body,
			updated_at: new Date(),
		});

		// const send = transport.sendMail({
		// 	from: `${name} ${PRIVATE_SMTP_USER}`,
		// 	to: PRIVATE_NOTIFICATIONS_EMAIL,
		// 	subject,
		// 	text: `from: ${name} <${email}>\nsubject:${subject}\n\n${body}`,
		// });

		// let result: SMTPTransport.SentMessageInfo | null = null,
		let error: PostgrestError | null = null;

		try {
			[/*result,*/ { error }] = await Promise.all([/*send, */ insert]);
		} catch (e) {
			console.warn("Impossible d'envoyer l'email de contact.", e);
			if (!error) {
				console.info(
					`Message de contact de ${name} <${email}> avec le sujet "${subject}" et le corps "${body}" a été sauvegardé dans la table \`contact_messages\` de ta base de données.`,
				);
			}
		}

		if (error) {
			console.error(
				'Erreur lors de l\'insertion du message de contact dans la base de données : ',
				error,
			);
			console.error(
				`Le message de contact de ${name} <${email}> avec le sujet "${subject}" et le corps "${body}" n'a pas été sauvegardé.`,
			);
		}

		// if (result && result.rejected.length > 0) {
		// 	console.error('Rejected email send response: ', result.response);
		// 	console.error(
		// 		`Email from ${name} <${email}> with subject ${subject} and body ${body} was rejected.`,
		// 	);
		// 	return setError(
		// 		form,
		// 		'',
		// 		'An error occured while sending the message. Please try again later.',
		// 	);
		// }

		return message(form, {
			success: 'Merci pour ton message. On te répondra bientôt !',
		});
	},
};
