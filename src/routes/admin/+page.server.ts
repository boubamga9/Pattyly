import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { EmailService } from '$lib/services/email-service';
import { env } from '$env/dynamic/private';
import { randomBytes } from 'crypto';

// Liste des emails autorisés (à mettre dans les variables d'environnement en production)
const ADMIN_EMAILS = (env.ADMIN_EMAILS || '').split(',').filter(Boolean);

/**
 * Génère un token de session sécurisé
 */
function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Vérifie si un token de session est valide
 */
async function verifyAdminSession(
	supabase: any,
	token: string | undefined
): Promise<{ valid: boolean; email: string | null }> {
	if (!token) {
		return { valid: false, email: null };
	}

	try {
		const { data: session, error: sessionError } = await supabase
			.from('admin_sessions')
			.select('email, expires_at')
			.eq('token', token)
			.gt('expires_at', new Date().toISOString())
			.single();

		if (sessionError || !session) {
			return { valid: false, email: null };
		}

		return { valid: true, email: session.email };
	} catch (err) {
		console.error('Error verifying admin session:', err);
		return { valid: false, email: null };
	}
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const supabase = locals.supabaseServiceRole as any;

	// Vérifier si l'utilisateur est déjà authentifié en tant qu'admin
	const sessionToken = cookies.get('admin_session_token');
	const sessionVerification = await verifyAdminSession(supabase, sessionToken);

	if (sessionVerification.valid) {
		// Charger les analytics
		return await loadAnalytics(locals);
	}

	// Récupérer l'email depuis l'URL si présent (après envoi OTP)
	const emailFromUrl = url.searchParams.get('email');

	return {
		authenticated: false,
		email: emailFromUrl || null
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
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
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

		// ✅ NOUVEAU : Séparer les visites par type d'utilisateur
		const pageViewsByType = {
			pastry: [] as any[],
			client: [] as any[],
			visitor: [] as any[]
		};

		pageViews?.forEach((event: any) => {
			const userType = event.metadata?.user_type || 'visitor';
			if (userType === 'pastry') {
				pageViewsByType.pastry.push(event);
			} else if (userType === 'client') {
				pageViewsByType.client.push(event);
			} else {
				pageViewsByType.visitor.push(event);
			}
		});

		// Sessions uniques par type
		const uniqueSessionsPastry = new Set(
			pageViewsByType.pastry.map((e: any) => e.metadata?.session_id).filter(Boolean)
		);
		const uniqueSessionsClient = new Set(
			pageViewsByType.client.map((e: any) => e.metadata?.session_id).filter(Boolean)
		);
		const uniqueSessionsVisitor = new Set(
			pageViewsByType.visitor.map((e: any) => e.metadata?.session_id).filter(Boolean)
		);

		// Total unique sessions (tous types confondus)
		const uniqueSessions = new Set(
			pageViews?.map((e: any) => e.metadata?.session_id).filter(Boolean) || []
		);

		// ✅ NOUVEAU : Pages visitées (grouper par page et compter)
		const pageViewsCount: Record<string, number> = {};
		pageViews?.forEach((event: any) => {
			const page = event.metadata?.page;
			if (page) {
				pageViewsCount[page] = (pageViewsCount[page] || 0) + 1;
			}
		});

		// Trier les pages par nombre de vues (décroissant) et prendre le top 10
		const topPages = Object.entries(pageViewsCount)
			.map(([page, count]) => ({ page, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

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

		// ✅ NOUVEAU : Calcul du churn rate par période (souscriptions vs annulations)
		// Souscriptions par période
		const { count: subscriptions7d } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_started')
			.gte('created_at', sevenDaysAgo.toISOString());

		const { count: subscriptions30d } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_started')
			.gte('created_at', thirtyDaysAgo.toISOString());

		const { count: subscriptions90d } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_started')
			.gte('created_at', ninetyDaysAgo.toISOString());

		// Annulations par période
		const { count: cancellations7d } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_cancelled')
			.gte('created_at', sevenDaysAgo.toISOString());

		const { count: cancellations30d } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_cancelled')
			.gte('created_at', thirtyDaysAgo.toISOString());

		const { count: cancellations90d } = await supabase
			.from('events')
			.select('*', { count: 'exact', head: true })
			.eq('event_name', 'subscription_cancelled')
			.gte('created_at', ninetyDaysAgo.toISOString());

		// Calculer les churn rates
		const churn7d = (subscriptions7d || 0) > 0
			? (((cancellations7d || 0) / subscriptions7d) * 100).toFixed(1)
			: '0.0';

		const churn30d = (subscriptions30d || 0) > 0
			? (((cancellations30d || 0) / subscriptions30d) * 100).toFixed(1)
			: '0.0';

		const churn90d = (subscriptions90d || 0) > 0
			? (((cancellations90d || 0) / subscriptions90d) * 100).toFixed(1)
			: '0.0';

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

		// Ancien calcul de churn (déprécié - gardé pour compatibilité)
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
				// ✅ NOUVEAU : Visites séparées par type d'utilisateur
				visitsByType: {
					pastry: {
						pageViews: pageViewsByType.pastry.length,
						uniqueSessions: uniqueSessionsPastry.size
					},
					client: {
						pageViews: pageViewsByType.client.length,
						uniqueSessions: uniqueSessionsClient.size
					},
					visitor: {
						pageViews: pageViewsByType.visitor.length,
						uniqueSessions: uniqueSessionsVisitor.size
					}
				},
				signupEvents: signupEvents || 0,
				shopCreatedEvents: shopCreatedEvents || 0,
				paymentEnabledEvents: paymentEnabledEvents || 0,
				subscriptionCancelledEvents: subscriptionCancelledEvents || 0,
				churnRate: churnRate, // Ancien calcul (déprécié)
				churnRates: {
					churn7d: churn7d,
					churn30d: churn30d,
					churn90d: churn90d,
					subscriptions7d: subscriptions7d || 0,
					subscriptions30d: subscriptions30d || 0,
					subscriptions90d: subscriptions90d || 0,
					cancellations7d: cancellations7d || 0,
					cancellations30d: cancellations30d || 0,
					cancellations90d: cancellations90d || 0
				},
				topPages: topPages,
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

		// Nettoyer le code : enlever les espaces et ne garder que les chiffres
		const code = (formData.get('code') as string)?.trim().replace(/\s/g, '');

		if (!email || !code) {
			return {
				success: false,
				error: 'Email et code requis'
			};
		}

		try {
			const supabase = locals.supabaseServiceRole as any;

			// Vérifier le code (sans la vérification used pour debug)
			const { data: otpData, error: otpError } = await supabase
				.from('admin_otp_codes')
				.select('*')
				.eq('email', email)
				.eq('code', code)
				.eq('used', false)
				.gt('expires_at', new Date().toISOString())
				.single();

			console.log('🔍 [Admin OTP] Verification attempt:', {
				email,
				code,
				otpError: otpError?.message,
				otpData: otpData ? 'found' : 'not found'
			});

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

			// Générer un token de session sécurisé
			const sessionToken = generateSessionToken();
			const expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + 24); // 24 heures

			// Supprimer les anciennes sessions pour cet email
			await supabase
				.from('admin_sessions')
				.delete()
				.eq('email', email);

			// Créer une nouvelle session en base de données
			const { error: sessionError } = await supabase
				.from('admin_sessions')
				.insert({
					email,
					token: sessionToken,
					expires_at: expiresAt.toISOString()
				});

			if (sessionError) {
				console.error('Error creating admin session:', sessionError);
				return {
					success: false,
					error: 'Erreur lors de la création de la session'
				};
			}

			// Créer le cookie avec le token (pas juste 'authenticated')
			cookies.set('admin_session_token', sessionToken, {
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

	logout: async ({ cookies, locals }) => {
		const supabase = locals.supabaseServiceRole as any;
		const sessionToken = cookies.get('admin_session_token');

		// Supprimer la session de la base de données
		if (sessionToken) {
			await supabase
				.from('admin_sessions')
				.delete()
				.eq('token', sessionToken);
		}

		// Supprimer le cookie
		cookies.delete('admin_session_token', { path: '/' });
		throw redirect(303, '/admin');
	}
};


