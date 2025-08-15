import { z } from 'zod';

export const emailFormSchema = z.object({
	email: z
		.string({ required_error: 'Please fill in the email' })
		.email({ message: 'Invalid email' }),
});

export type EmailFormSchema = typeof emailFormSchema;

///

export const infoFormSchema = z.object({
	// Note: In our new schema, we don't have a 'name' field in profiles
	// The email is managed through Supabase Auth
	// We can add other profile fields here if needed in the future
});

export type InfoFormSchema = typeof infoFormSchema;

///

export const deleteAccountFormSchema = z.object({
	confirmation: z.string({
		required_error: 'Please fill in the confirmation',
	}),
});

export type DeleteAccountFormSchema = typeof deleteAccountFormSchema;

export const changePasswordFormSchema = z
	.object({
		old_password: z.string({
			required_error: 'Please fill in the old password',
		}),
		new_password: z
			.string({
				required_error: 'Please fill in the new password',
			})
			.min(6, 'Password must be at least 6 characters'),
		confirm_password: z
			.string({
				required_error: 'Please fill in the confirm password',
			})
			.min(6, 'Password must be at least 6 characters'),
	})
	.refine((data) => data.new_password == data.confirm_password, {
		message: "Passwords didn't match",
		path: ['confirm_password'],
	});

export type ChangePasswordFormSchema = typeof changePasswordFormSchema;

export const createPasswordFormSchema = z
	.object({
		new_password: z
			.string({
				required_error: 'Please fill in the password',
			})
			.min(6, 'Password must be at least 6 characters'),
		confirm_password: z
			.string({
				required_error: 'Please fill in the confirm password',
			})
			.min(6, 'Password must be at least 6 characters'),
	})
	.refine((data) => data.new_password == data.confirm_password, {
		message: "Passwords didn't match",
		path: ['confirm_password'],
	});

export type CreatePasswordFormSchema = typeof createPasswordFormSchema;
