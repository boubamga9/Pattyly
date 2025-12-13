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

		// Options de notification selon les best practices Web Push
		// TTL: 24 heures (86400 secondes) - une commande reste pertinente pendant 24h
		// Urgency: 'high' - livraison immédiate pour les nouvelles commandes
		// Topic: optionnel, peut être utilisé pour grouper les notifications similaires
		const notificationOptions = {
			TTL: 86400, // 24 heures en secondes
			urgency: 'high' as const, // Livraison immédiate (priorité maximale)
			// topic: payload.tag, // Utiliser le tag de la notification comme topic (optionnel)
		};

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
					notificationPayload,
					notificationOptions
				);
				logger.log(`✅ Notification envoyée avec succès à ${subscription.endpoint.substring(0, 50)}...`);
				return { success: true, endpoint: subscription.endpoint };
			} catch (error: any) {
				const statusCode = error.statusCode || error.status;
				const errorMessage = error.message || 'Erreur inconnue';
				const isNetworkError =
					errorMessage.includes('socket hang up') ||
					errorMessage.includes('ECONNRESET') ||
					errorMessage.includes('ETIMEDOUT') ||
					errorMessage.includes('ENOTFOUND') ||
					!statusCode; // Si pas de statusCode, c'est probablement une erreur réseau

				console.error(`❌ Erreur lors de l'envoi à ${subscription.endpoint}:`, {
					statusCode: statusCode || 'N/A (erreur réseau)',
					message: errorMessage,
					endpoint: subscription.endpoint.substring(0, 50) + '...',
					isNetworkError,
				});

				// Gestion des erreurs selon les spécifications Web Push et APNs
				// 410 Gone: Subscription expirée ou révoquée - supprimer de la DB
				// 404 Not Found: Subscription introuvable - supprimer de la DB
				// 400 Bad Request: Payload invalide - ne pas supprimer, mais logger
				// 413 Payload Too Large: Payload trop gros - ne pas supprimer, mais logger
				// 429 Too Many Requests: Rate limit - ne pas supprimer, mais logger
				// 401 Unauthorized: Clé VAPID invalide - ne pas supprimer, mais logger (problème de config)
				// Erreurs réseau (socket hang up, timeout, etc.) - ne pas supprimer, erreur temporaire

				if (statusCode === 410 || statusCode === 404) {
					// Subscription invalide - supprimer de la base de données
					logger.log(`🗑️ Suppression de la subscription invalide (${statusCode}): ${subscription.endpoint.substring(0, 50)}...`);
					await supabase
						.from('push_subscriptions')
						.delete()
						.eq('endpoint', subscription.endpoint)
						.catch((deleteError) => {
							console.error('Erreur lors de la suppression de la subscription:', deleteError);
						});
				} else if (isNetworkError) {
					// Erreur réseau temporaire (socket hang up, timeout, etc.)
					// Ne pas supprimer la subscription - c'est probablement temporaire
					// La notification sera réessayée au prochain événement ou peut être perdue
					console.warn(`⚠️ Erreur réseau temporaire (${errorMessage}) pour ${subscription.endpoint.substring(0, 50)}... - La subscription est conservée`);
				} else if (statusCode === 400 || statusCode === 413) {
					// Erreur de payload - ne pas supprimer la subscription, mais logger l'erreur
					console.error(`⚠️ Erreur de payload (${statusCode}): ${errorMessage}`);
				} else if (statusCode === 429) {
					// Rate limit - ne pas supprimer, mais logger
					console.warn(`⚠️ Rate limit atteint (429) pour ${subscription.endpoint.substring(0, 50)}...`);
				} else if (statusCode === 401) {
					// Problème d'authentification VAPID - erreur de configuration
					console.error(`🔴 Erreur d'authentification VAPID (401): ${errorMessage}`);
				} else {
					// Autre erreur inconnue
					console.error(`⚠️ Erreur inconnue (${statusCode || 'N/A'}): ${errorMessage}`);
				}

				return { success: false, endpoint: subscription.endpoint, error: errorMessage, statusCode: statusCode || 'NETWORK_ERROR' };
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
