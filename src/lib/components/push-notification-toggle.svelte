<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-svelte';
	import { subscribeToPush, subscriptionToJSON } from '$lib/utils/push';
	import { onMount } from 'svelte';
	import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';

	let isSupported = false;
	let permission: NotificationPermission = 'default';
	let hasActiveSubscription = false;
	let isSubscribing = false;
	let isUnsubscribing = false;
	let error = '';
	let success = '';

	/**
	 * Vérifier si une subscription active existe
	 */
	async function checkSubscriptionStatus() {
		if (!isSupported) return;

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			hasActiveSubscription = subscription !== null;
		} catch (err) {
			console.error('Erreur lors de la vérification de la subscription:', err);
			hasActiveSubscription = false;
		}
	}

	onMount(async () => {
		// Vérifier le support
		isSupported =
			typeof window !== 'undefined' &&
			'serviceWorker' in navigator &&
			'PushManager' in window &&
			'Notification' in window;

		if (isSupported) {
			permission = Notification.permission;
			// Vérifier si une subscription existe
			await checkSubscriptionStatus();
		}
	});

	/**
	 * Étape 3 : Demander la permission (après action utilisateur)
	 */
	async function askNotificationPermission() {
		if (!('Notification' in window)) {
			error = 'Notifications non supportées';
			return;
		}

		const perm = await Notification.requestPermission();

		if (perm === 'granted') {
			if (import.meta.env?.DEV) {
				console.log('✅ Notifications autorisées');
			}
			permission = 'granted';
		} else if (perm === 'denied') {
			error = 'Permission refusée. Activez-la dans les paramètres du navigateur.';
			permission = 'denied';
		} else {
			error = 'Permission non accordée';
			permission = 'default';
		}
	}

	/**
	 * Étape 4 : S'abonner aux push et enregistrer en base
	 */
	async function handleSubscribe() {
		if (!isSupported) {
			error = 'Notifications push non supportées';
			return;
		}

		isSubscribing = true;
		error = '';
		success = '';

		try {
			// 1. Demander la permission si nécessaire
			if (Notification.permission === 'default') {
				await askNotificationPermission();
				if (Notification.permission !== 'granted') {
					return;
				}
			}

			// 2. Vérifier la clé VAPID
			if (!PUBLIC_VAPID_PUBLIC_KEY) {
				throw new Error(
					'Clé VAPID manquante. Vérifiez PUBLIC_VAPID_PUBLIC_KEY dans .env.local et redémarrez le serveur'
				);
			}

			// 3. S'abonner aux push
			const isDev = import.meta.env?.DEV;
			if (isDev) {
				console.log('📝 Création de la subscription...');
				console.log('🔑 Clé VAPID:', PUBLIC_VAPID_PUBLIC_KEY ? `Présente (${PUBLIC_VAPID_PUBLIC_KEY.length} chars)` : 'MANQUANTE');
			}
			
			// Vérifier que le service worker est bien actif
			const registration = await navigator.serviceWorker.ready;
			if (isDev) {
				console.log('✅ Service Worker ready');
				console.log('📱 Permission:', Notification.permission);
			}
			
			const subscription = await subscribeToPush();
			if (isDev) {
				console.log('✅ Subscription créée, endpoint:', subscription.endpoint.substring(0, 50) + '...');
			}

			// 4. Convertir en JSON
			const subscriptionData = subscriptionToJSON(subscription);

			// 5. Enregistrer sur le serveur
			console.log('💾 Enregistrement sur le serveur...');
			const response = await fetch('/api/push/subscribe', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...subscriptionData,
					userAgent: navigator.userAgent,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					message: 'Erreur serveur',
				}));
				throw new Error(errorData.message || 'Erreur lors de l\'enregistrement');
			}

			const result = await response.json();
			if (isDev) {
				console.log('✅ Enregistrement réussi:', result);
			}

			// Mettre à jour l'état
			await checkSubscriptionStatus();
			success = 'Notifications push activées avec succès !';
			permission = Notification.permission;
		} catch (err) {
			console.error('❌ Erreur:', err);
			error = err instanceof Error ? err.message : 'Erreur inconnue';
		} finally {
			isSubscribing = false;
		}
	}

	async function handleUnsubscribe() {
		if (!isSupported) return;

		isUnsubscribing = true;
		error = '';
		success = '';

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				// Supprimer du serveur
				const response = await fetch('/api/push/unsubscribe', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						endpoint: subscription.endpoint,
					}),
				});

				if (!response.ok) {
					throw new Error('Erreur lors de la suppression sur le serveur');
				}

				// Supprimer localement (désabonner du service worker)
				await subscription.unsubscribe();
				if (import.meta.env?.DEV) {
					console.log('✅ Subscription désabonnée du service worker');
				}
			}

			// Mettre à jour l'état
			await checkSubscriptionStatus();
			success = 'Notifications push désactivées';
			permission = Notification.permission;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur lors de la désactivation';
			console.error('Erreur:', err);
		} finally {
			isUnsubscribing = false;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Bell class="h-5 w-5" />
			Notifications push
		</Card.Title>
		<Card.Description>
			Recevez des notifications instantanées lorsque vous recevez une nouvelle commande
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if !isSupported}
			<div class="flex items-center gap-2 text-muted-foreground">
				<AlertCircle class="h-4 w-4" />
				<span>Les notifications push ne sont pas supportées par votre navigateur</span>
			</div>
		{:else if permission === 'granted' && hasActiveSubscription}
			<div class="space-y-4">
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<CheckCircle2 class="h-4 w-4" />
					<span>Notifications push activées</span>
				</div>
				<Button
					variant="outline"
					on:click={handleUnsubscribe}
					disabled={isUnsubscribing}
					class="w-full sm:w-auto"
				>
					{#if isUnsubscribing}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<BellOff class="mr-2 h-4 w-4" />
					{/if}
					Désactiver les notifications
				</Button>
			</div>
		{:else if permission === 'granted' && !hasActiveSubscription}
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Vous avez autorisé les notifications, mais aucune subscription active n'a été trouvée.
				</p>
				<Button on:click={handleSubscribe} disabled={isSubscribing} class="w-full sm:w-auto">
					{#if isSubscribing}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Activation...
					{:else}
						<Bell class="mr-2 h-4 w-4" />
						Activer les notifications
					{/if}
				</Button>
			</div>
		{:else if permission === 'denied'}
			<div class="space-y-4">
				<div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
					<AlertCircle class="h-4 w-4" />
					<span>Les notifications sont bloquées dans les paramètres de votre navigateur</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Pour activer les notifications, veuillez autoriser les notifications dans les paramètres
					de votre navigateur, puis rafraîchissez cette page.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Activez les notifications push pour être alerté immédiatement lorsque vous recevez une
					nouvelle commande.
				</p>
				<Button on:click={handleSubscribe} disabled={isSubscribing} class="w-full sm:w-auto">
					{#if isSubscribing}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Activation...
					{:else}
						<Bell class="mr-2 h-4 w-4" />
						Activer les notifications
					{/if}
				</Button>
			</div>
		{/if}

		{#if error}
			<div class="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				<AlertCircle class="h-4 w-4" />
				<span>{error}</span>
			</div>
		{/if}

		{#if success}
			<div class="mt-4 flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
				<CheckCircle2 class="h-4 w-4" />
				<span>{success}</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
