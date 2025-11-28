import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { EmailService } from '$lib/services/email-service';
import { env } from '$env/dynamic/private';

// Liste des emails autorisés (à mettre dans les variables d'environnement en production)
const ADMIN_EMAILS = (env.ADMIN_EMAILS || '').split(',').filter(Boolean);

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	// Vérifier si l'utilisateur est déjà authentifié en tant qu'admin
	const adminSession = cookies.get('admin_session');
	if (adminSession === 'authenticated') {
		// Charger les analytics
		return await loadAnalytics(locals);
	}

	// Récupérer l'email depuis l'URL si présent (après envoi OTP)
	const email = url.searchParams.get('email');

	return {
		authenticated: false,
		email: email || null
	};
};

async function loadAnalytics(locals: any) {
	try {
		const supabase = locals.supabaseServiceRole as any;

		// Utilisateurs total
		const { count: totalUsers } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true });

		// Nouveaux inscrits (7j, 1mois, 3mois)
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

		const { count: signups7d } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', sevenDaysAgo.toISOString());

		const { count: signups1m } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', oneMonthAgo.toISOString());

		const { count: signups3m } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', threeMonthsAgo.toISOString());

		// Abonnements actifs
		const { count: activeSubscriptions } = await supabase
			.from('user_products')
			.select('*', { count: 'exact', head: true })
			.eq('subscription_status', 'active');

		// Commandes totales
		const { count: totalOrders } = await supabase
			.from('orders')
			.select('*', { count: 'exact', head: true });

		// Boutiques actives
		const { count: activeShops } = await supabase
			.from('shops')
			.select('*', { count: 'exact', head: true })
			.eq('is_active', true);

		// Analytics depuis events table
		const { data: pageViews } = await supabase
			.from('events')
			.select('metadata')
			.eq('event_name', 'page_view');

		const uniqueSessions = new Set(
			pageViews?.map((e) => e.metadata?.session_id).filter(Boolean) || []
		);

		const { count: signupEvents } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'signup');

		const { count: shopCreatedEvents } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'shop_created');

		const { count: paymentEnabledEvents } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'payment_enabled');

		const { count: subscriptionCancelledEvents } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_cancelled');

		// Commandes récentes (7j, 1mois)
		const { count: orders7d } = await supabase
			.from('orders')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', sevenDaysAgo.toISOString());

		const { count: orders1m } = await supabase
			.from('orders')
			.select('*', { count: 'exact', head: true })
			.gte('created_at', oneMonthAgo.toISOString());

		// Produits actifs
		const { count: activeProducts } = await supabase
			.from('products')
			.select('*', { count: 'exact', head: true })
			.eq('is_active', true);

		// Commandes par statut
		const { data: ordersByStatus } = await supabase
			.from('orders')
			.select('status');

		const ordersStatusCounts = {
			pending: 0,
			quoted: 0,
			to_verify: 0,
			confirmed: 0,
			ready: 0,
			completed: 0,
			cancelled: 0,
			refused: 0
		};

		ordersByStatus?.forEach((order: any) => {
			const status = order.status as keyof typeof ordersStatusCounts;
			if (status in ordersStatusCounts) {
				ordersStatusCounts[status]++;
			}
		});

		// Taux de churn (abonnements annulés / abonnements actifs)
		const churnRate = activeSubscriptions && activeSubscriptions > 0
			? ((subscriptionCancelledEvents || 0) / activeSubscriptions * 100).toFixed(1)
			: '0.0';

		return {
			authenticated: true,
			analytics: {
				totalUsers: totalUsers || 0,
				signups7d: signups7d || 0,
				signups1m: signups1m || 0,
				signups3m: signups3m || 0,
				activeSubscriptions: activeSubscriptions || 0,
				totalOrders: totalOrders || 0,
				orders7d: orders7d || 0,
				orders1m: orders1m || 0,
				activeShops: activeShops || 0,
				activeProducts: activeProducts || 0,
				pageViews: pageViews?.length || 0,
				uniqueVisits: uniqueSessions.size,
				signupEvents: signupEvents || 0,
				shopCreatedEvents: shopCreatedEvents || 0,
				paymentEnabledEvents: paymentEnabledEvents || 0,
				subscriptionCancelledEvents: subscriptionCancelledEvents || 0,
				churnRate: churnRate,
				ordersByStatus: ordersStatusCounts
			}
		};
	} catch (err) {
		console.error('Error loading analytics:', err);
		throw error(500, 'Erreur lors du chargement des analytics');
	}
}

export const actions: Actions = {
	sendOTP: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.toLowerCase().trim();

		if (!email) {
			return {
				success: false,
				error: 'Email requis'
			};
		}

		try {
			const supabase = locals.supabaseServiceRole as any;

			// Vérifier si un profil existe pour cet email
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('id, email')
				.eq('email', email)
				.single();

			// Si aucun profil n'existe, ne rien faire (sécurité)
			if (profileError || !profile) {
				// Ne pas révéler si l'email existe ou non
				return {
					success: true,
					message: 'Si cet email est autorisé, un code vous a été envoyé.'
				};
			}

			// Vérifier si l'email est dans la liste des admins autorisés
			if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
				// Ne pas révéler que l'email n'est pas autorisé
				return {
					success: true,
					message: 'Si cet email est autorisé, un code vous a été envoyé.'
				};
			}

			// Générer un code OTP (6 chiffres)
			const code = Math.floor(100000 + Math.random() * 900000).toString();
			const expiresAt = new Date();
			expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code valide 10 minutes

			// Supprimer les anciens codes pour cet email
			await supabase.from('admin_otp_codes').delete().eq('email', email);

			// Insérer le nouveau code
			const { error: insertError } = await supabase
				.from('admin_otp_codes')
				.insert({
					email,
					code,
					expires_at: expiresAt.toISOString()
				});

			if (insertError) {
				console.error('Error inserting OTP code:', insertError);
				return {
					success: false,
					error: 'Erreur lors de la génération du code'
				};
			}

			// Envoyer l'email avec le code
			try {
				await EmailService.sendAdminOTP({
					email,
					code
				});
			} catch (emailError) {
				console.error('Error sending OTP email:', emailError);
				// Ne pas révéler l'erreur à l'utilisateur, mais retourner un succès quand même
			}

			// Retourner un succès avec l'email pour que le frontend affiche le formulaire OTP
			return {
				success: true,
				message: 'Si cet email est autorisé, un code vous a été envoyé.',
				email: email
			};
		} catch (err) {
			console.error('Error in sendOTP:', err);
			return {
				success: false,
				error: 'Erreur lors de l\'envoi du code'
			};
		}
	},

	verifyOTP: async ({ request, locals, cookies, url }) => {
		const formData = await request.formData();
		let email = (formData.get('email') as string)?.toLowerCase().trim();
		
		// Si l'email n'est pas dans le formData, le récupérer depuis l'URL
		if (!email) {
			email = url.searchParams.get('email')?.toLowerCase().trim() || '';
		}
		
		const code = formData.get('code') as string;

		if (!email || !code) {
			return {
				success: false,
				error: 'Email et code requis'
			};
		}

		try {
			const supabase = locals.supabaseServiceRole as any;

			// Vérifier le code
			const { data: otpData, error: otpError } = await supabase
				.from('admin_otp_codes')
				.select('*')
				.eq('email', email)
				.eq('code', code)
				.eq('used', false)
				.gt('expires_at', new Date().toISOString())
				.single();

			if (otpError || !otpData) {
				return {
					success: false,
					error: 'Code invalide ou expiré'
				};
		}

			// Marquer le code comme utilisé
			await supabase
				.from('admin_otp_codes')
				.update({ used: true })
				.eq('id', otpData.id);

			// Créer la session admin
			cookies.set('admin_session', 'authenticated', {
				path: '/',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 // 24 heures
			});

			throw redirect(303, '/admin');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) {
				throw err; // C'est une redirection
			}
			console.error('Error in verifyOTP:', err);
			return {
				success: false,
				error: 'Erreur lors de la vérification du code'
			};
		}
	},

	logout: async ({ cookies }) => {
		cookies.delete('admin_session', { path: '/' });
		throw redirect(303, '/admin');
	}
};

