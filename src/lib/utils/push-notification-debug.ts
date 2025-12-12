/**
 * Script de diagnostic pour les notifications push
 * À exécuter dans la console du navigateur
 */

export async function debugPushNotifications() {
	console.log('🔍 === DIAGNOSTIC NOTIFICATIONS PUSH ===\n');

	// 1. Vérifier le support
	console.log('1️⃣ Support navigateur:');
	const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
	console.log('   - Service Worker:', 'serviceWorker' in navigator ? '✅' : '❌');
	console.log('   - PushManager:', 'PushManager' in window ? '✅' : '❌');
	console.log('   - Notification:', 'Notification' in window ? '✅' : '❌');
	console.log('   → Support global:', isSupported ? '✅' : '❌');
	console.log('');

	// 2. Vérifier la permission
	console.log('2️⃣ Permission:');
	const permission = Notification.permission;
	console.log('   - État:', permission);
	console.log('   →', permission === 'granted' ? '✅ Accordée' : permission === 'denied' ? '❌ Refusée' : '⚠️ Non définie');
	console.log('');

	// 3. Vérifier le service worker
	console.log('3️⃣ Service Worker:');
	try {
		const registration = await navigator.serviceWorker.ready;
		console.log('   - État: ✅ Actif');
		console.log('   - URL:', registration.active?.scriptURL || 'N/A');
		console.log('   - Scope:', registration.scope);
	} catch (err) {
		console.log('   - État: ❌ Non actif');
		console.log('   - Erreur:', err);
	}
	console.log('');

	// 4. Vérifier les subscriptions existantes
	console.log('4️⃣ Subscriptions existantes:');
	try {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		if (subscription) {
			console.log('   - État: ✅ Subscription trouvée');
			console.log('   - Endpoint:', subscription.endpoint.substring(0, 50) + '...');
			const keys = subscription.getKey('p256dh');
			console.log('   - Clé p256dh:', keys ? '✅ Présente' : '❌ Manquante');
		} else {
			console.log('   - État: ⚠️ Aucune subscription');
		}
	} catch (err) {
		console.log('   - État: ❌ Erreur');
		console.log('   - Erreur:', err);
	}
	console.log('');

	// 5. Vérifier la clé VAPID (si accessible)
	console.log('5️⃣ Configuration VAPID:');
	try {
		// Essayer d'accéder à la clé depuis l'environnement
		const env = await import('$env/dynamic/public');
		const vapidKey = (env as any).env?.PUBLIC_VAPID_PUBLIC_KEY;
		if (vapidKey) {
			console.log('   - Clé publique: ✅ Présente');
			console.log('   - Longueur:', vapidKey.length, 'caractères');
			console.log('   - Début:', vapidKey.substring(0, 20) + '...');
		} else {
			console.log('   - Clé publique: ❌ MANQUANTE');
			console.log('   → Vérifiez que PUBLIC_VAPID_PUBLIC_KEY est définie dans .env.local');
		}
	} catch (err) {
		console.log('   - Impossible de vérifier (normal si exécuté dans la console)');
	}
	console.log('');

	// 6. Test de création de subscription
	console.log('6️⃣ Test de création de subscription:');
	console.log('   (Cette étape nécessite une clé VAPID valide)');
	console.log('   → Utilisez le bouton "Activer les notifications" dans les paramètres');
	console.log('');

	console.log('✅ === FIN DU DIAGNOSTIC ===');
	console.log('\n💡 Pour tester manuellement, exécutez dans la console:');
	console.log('   await navigator.serviceWorker.ready.then(async (reg) => {');
	console.log('     const sub = await reg.pushManager.subscribe({');
	console.log('       userVisibleOnly: true,');
	console.log('       applicationServerKey: urlBase64ToUint8Array("VOTRE_CLE_VAPID")');
	console.log('     });');
	console.log('     console.log("Subscription:", sub);');
	console.log('   });');
}

// Fonction helper pour convertir la clé VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray;
}
