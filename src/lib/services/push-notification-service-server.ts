/**
 * Service serveur pour envoyer des notifications push aux pâtissiers
 * 
 * Ce service utilise web-push pour envoyer des notifications via le protocole Web Push
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { VAPID_PRIVATE_KEY } from '$env/static/private';
import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import webpush from 'web-push';
import { logger } from '$lib/utils/logger';

interface PushSubscription {
	endpoint: string;
	p256dh: string;
	auth: string;
}

interface NotificationPayload {
	title: string;
	body: string;
	icon?: string;
	badge?: string;
	tag?: string;
	data?: Record<string, any>;
}

/**
 * Envoie une notification push à un pâtissier
 * 
 * @param supabase - Client Supabase avec service_role
 * @param profileId - ID du profil du pâtissier
 * @param payload - Données de la notification
 */
export async function sendPushNotificationToPastryChef(
	supabase: SupabaseClient,
	profileId: string,
	payload: NotificationPayload
): Promise<{ success: boolean; sent: number; error?: string }> {
	logger.log('📤 [Push Notification] sendPushNotificationToPastryChef appelé');
	logger.log('   - Profile ID:', profileId);
	logger.log('   - Payload:', payload.title, '-', payload.body);

	try {
		// Récupérer toutes les subscriptions pour ce profil
		logger.log('🔍 [Push Notification] Récupération des subscriptions pour le profil:', profileId);
		const { data: subscriptions, error: subsError } = await supabase
			.from('push_subscriptions')
			.select('endpoint, p256dh, auth')
			.eq('profile_id', profileId);

		if (subsError) {
			console.error('Erreur lors de la récupération des subscriptions:', subsError);
			return { success: false, sent: 0, error: 'Erreur lors de la récupération des subscriptions' };
		}

		if (!subscriptions || subscriptions.length === 0) {
			logger.log(`Aucune subscription push trouvée pour le profil: ${profileId}`);
			return { success: true, sent: 0 };
		}

		// Vérifier que les clés VAPID sont configurées
		if (!PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
			console.error('Clés VAPID non configurées');
			console.error('PUBLIC_VAPID_PUBLIC_KEY:', PUBLIC_VAPID_PUBLIC_KEY ? 'Présente' : 'MANQUANTE');
			console.error('VAPID_PRIVATE_KEY:', VAPID_PRIVATE_KEY ? 'Présente' : 'MANQUANTE');
			return { success: false, sent: 0, error: 'Configuration VAPID manquante' };
		}

		// Configurer les options VAPID (une seule fois, mais on le fait à chaque appel pour être sûr)
		webpush.setVapidDetails('mailto:contact@pattyly.com', PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

		// Préparer le payload de la notification
		const notificationPayload = JSON.stringify(payload);

		// Envoyer les notifications à toutes les subscriptions
		const sendPromises = subscriptions.map(async (subscription) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: subscription.endpoint,
						keys: {
							p256dh: subscription.p256dh,
							auth: subscription.auth,
						},
					},
					notificationPayload
				);
				logger.log(`✅ Notification envoyée avec succès à ${subscription.endpoint.substring(0, 50)}...`);
				return { success: true, endpoint: subscription.endpoint };
			} catch (error: any) {
				console.error(`❌ Erreur lors de l'envoi à ${subscription.endpoint}:`, error);

				// Si la subscription est invalide (410 Gone ou 404 Not Found), la supprimer de la base
				if (error.statusCode === 410 || error.statusCode === 404) {
					console.log(`🗑️ Suppression de la subscription invalide: ${subscription.endpoint}`);
					await supabase
						.from('push_subscriptions')
						.delete()
						.eq('endpoint', subscription.endpoint)
						.catch((deleteError) => {
							console.error('Erreur lors de la suppression de la subscription:', deleteError);
						});
				}

				return { success: false, endpoint: subscription.endpoint, error: error.message };
			}
		});

		// Attendre que toutes les notifications soient envoyées (ou échouent)
		const results = await Promise.allSettled(sendPromises);
		const successful = results.filter(
			(r) => r.status === 'fulfilled' && r.value.success === true
		).length;

		logger.log(`📊 Résultat: ${successful}/${subscriptions.length} notification(s) envoyée(s) avec succès`);

		return { success: true, sent: successful };
	} catch (error) {
		console.error('Erreur lors de l\'envoi de la notification push:', error);
		return {
			success: false,
			sent: 0,
			error: error instanceof Error ? error.message : 'Erreur inconnue',
		};
	}
}

/**
 * Envoie une notification de nouvelle commande à un pâtissier
 * 
 * @param supabase - Client Supabase avec service_role
 * @param profileId - ID du profil du pâtissier
 * @param orderData - Données de la commande
 */
export async function sendNewOrderPushNotification(
	supabase: SupabaseClient,
	profileId: string,
	orderData: {
		orderId: string;
		customerName: string;
		productName: string;
		pickupDate: string;
		dashboardUrl: string;
	}
): Promise<void> {
	logger.log('🔔 [Push Notification] sendNewOrderPushNotification appelé');
	logger.log('   - Profile ID:', profileId);
	logger.log('   - Order ID:', orderData.orderId);
	logger.log('   - Customer:', orderData.customerName);

	const payload: NotificationPayload = {
		title: 'Nouvelle commande reçue',
		body: `${orderData.customerName} a passé une commande: ${orderData.productName}`,
		icon: '/icons/icon-192x192.png',
		badge: '/icons/icon-192x192.png',
		tag: `order-${orderData.orderId}`,
		data: {
			url: orderData.dashboardUrl,
			orderId: orderData.orderId,
			type: 'new_order',
		},
	};

	// Envoyer la notification (fire-and-forget, on ne bloque pas si ça échoue)
	sendPushNotificationToPastryChef(supabase, profileId, payload)
		.then((result) => {
			logger.log('📊 [Push Notification] Résultat:', result);
		})
		.catch((error) => {
			logger.error('❌ [Push Notification] Erreur (non bloquant):', error);
		});
}
