<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Copy, Check, ArrowLeft, AlertCircle } from 'lucide-svelte';
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';

	export let data;

	$: customStyles = {
		background: data.customizations?.background_color || '#fafafa',
		backgroundImage: data.customizations?.background_image_url
			? `url(${data.customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${data.customizations?.button_color || '#ff6f61'}; color: ${data.customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${data.customizations?.text_color || '#333333'};`,
		iconStyle: `color: ${data.customizations?.icon_color || '#6b7280'};`,
		secondaryTextStyle: `color: ${data.customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
	};

	// Calculer l'acompte selon le pourcentage du produit
	$: depositPercentage = data.product?.deposit_percentage ?? 50;
	$: depositAmount = (data.orderData.total_amount * depositPercentage) / 100;

	let copySuccess = false;
	let copyWeroSuccess = false;
	let confirmationForm: HTMLFormElement | null = null;
	let selectedPaymentProvider: { provider_type: string; payment_identifier: string } | null = null;
	let isWaitingForOrder = false;
	
	// Écran d'instruction
	let showPaymentInstructions = true;
	let paymentInstructionsAccepted = false;
	let selectedProviderForConfirmation: { provider_type: string; payment_identifier: string } | null = null;
	let showWeroIdentifier = false;

	// Initialiser avec le premier provider disponible (Stripe en priorité)
	$: if (data.paymentLinks && data.paymentLinks.length > 0 && !selectedPaymentProvider) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const stripeLink = data.paymentLinks.find((pl: any) => pl.provider_type === 'stripe');
		selectedPaymentProvider = stripeLink || data.paymentLinks[0];
	}

	// Séparer Stripe des autres méthodes de paiement
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	$: stripeProvider = data.paymentLinks?.find((p: any) => p.provider_type === 'stripe');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	$: otherProviders = data.paymentLinks?.filter((p: any) => p.provider_type !== 'stripe') || [];
	$: hasOtherProviders = otherProviders.length > 0;

	// Fonction pour générer le lien de paiement selon le provider avec le montant pré-rempli
	function getPaymentLink(provider: { provider_type: string; payment_identifier: string }): string | null {
		if (provider.provider_type === 'paypal') {
			// Format PayPal.me avec montant en EUR
			const cleanIdentifier = provider.payment_identifier.replace(/^@/, '');
			return `https://paypal.me/${cleanIdentifier}/${depositAmount}EUR`;
		} else if (provider.provider_type === 'revolut') {
			// Format Revolut avec montant (multiplié par 100 car amount=14 donne 0,14€)
			const cleanIdentifier = provider.payment_identifier.replace(/^@/, '');
			const amountInCents = Math.round(depositAmount * 100);
			return `https://revolut.me/${cleanIdentifier}?amount=${amountInCents}`;
		} else if (provider.provider_type === 'wero') {
			// Wero : pour l'instant, retourner null (sera géré différemment)
			// Format à adapter selon la documentation Wero
			return null;
		} else if (provider.provider_type === 'stripe') {
			// Stripe utilise une session checkout, pas un lien direct
			return null;
		}
		return null;
	}

	// Fonction pour obtenir le nom du provider
	function getProviderName(providerType: string): string {
		if (providerType === 'paypal') return 'PayPal';
		if (providerType === 'revolut') return 'Revolut';
		if (providerType === 'wero') return 'Wero';
		if (providerType === 'stripe') return 'Carte bancaire';
		return providerType;
	}

	// Fonction pour gérer le clic sur Stripe (créer une session checkout)
	async function handleStripeClick(provider: { provider_type: string; payment_identifier: string }) {
		if (provider.provider_type !== 'stripe') return;

		try {
			const formData = new FormData();
			if (data.orderData?.order_ref) {
				formData.append('orderRef', data.orderData.order_ref);
			}

			const response = await fetch('?/createStripeCheckoutSession', {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();
			
			// SvelteKit actions return data in a specific format
			// result.data can be a string that needs to be parsed
			let actionResult: unknown;
			if (typeof result.data === 'string') {
				try {
					actionResult = JSON.parse(result.data);
				} catch {
					actionResult = result.data;
				}
			} else {
				actionResult = result.data;
			}
			
			// Extract checkoutUrl from the response
			// Format can be: [{success: 1, checkoutUrl: 2}, true, "https://..."] or {success: true, checkoutUrl: "https://..."}
			let checkoutUrl: string | null = null;
			if (Array.isArray(actionResult)) {
				// If it's an array, the URL is typically the last string element
				const urlCandidate = actionResult.find((item): item is string => typeof item === 'string' && item.startsWith('http'));
				if (urlCandidate) {
					checkoutUrl = urlCandidate;
				} else if (actionResult[0] && typeof actionResult[0] === 'object' && 'checkoutUrl' in actionResult[0]) {
					checkoutUrl = (actionResult[0] as { checkoutUrl: string }).checkoutUrl;
				}
			} else if (actionResult && typeof actionResult === 'object' && 'checkoutUrl' in actionResult) {
				checkoutUrl = (actionResult as { checkoutUrl: string }).checkoutUrl;
			}
			
			if (checkoutUrl && checkoutUrl.startsWith('http')) {
				window.location.href = checkoutUrl;
			} else {
				console.error('Error creating Stripe checkout session:', result);
				alert('Erreur lors de la création de la session de paiement. Veuillez réessayer.');
			}
		} catch (err) {
			console.error('Error creating Stripe checkout session:', err);
			alert('Erreur lors de la création de la session de paiement. Veuillez réessayer.');
		}
	}

	// Fonction pour accepter les instructions de paiement
	function acceptPaymentInstructions() {
		paymentInstructionsAccepted = true;
		showPaymentInstructions = false;
	}

	// Fonction pour gérer le clic sur le lien de paiement (NE PAS soumettre automatiquement)
	function handlePaymentLinkClick(provider: { provider_type: string; payment_identifier: string }) {
		const paymentLink = getPaymentLink(provider);
		
		if (paymentLink) {
			// Stocker le provider sélectionné pour la confirmation
			selectedProviderForConfirmation = provider;
			
		// Ouvrir le lien dans un nouvel onglet
		window.open(paymentLink, '_blank');
		
		// Sauvegarder dans localStorage pour détecter le retour
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('paymentLinkOpened', 'true');
				localStorage.setItem('paymentProvider', provider.provider_type);
				localStorage.setItem('orderRef', data.orderData.order_ref);
			}
		} else if (provider.provider_type === 'wero') {
			// Pour Wero, sélectionner le provider pour confirmation et afficher l'identifiant
			selectedProviderForConfirmation = provider;
			showWeroIdentifier = true;
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('paymentLinkOpened', 'true');
				localStorage.setItem('paymentProvider', 'wero');
				localStorage.setItem('orderRef', data.orderData.order_ref);
			}
		}
	}

	// Fonction pour confirmer le paiement manuel
	function confirmManualPayment() {
		const providerToUse = selectedProviderForConfirmation || otherProviders[0];
		
		if (!providerToUse) {
			console.error('No payment provider available');
			return;
		}
		
		// Stocker le provider dans le formulaire
		if (confirmationForm) {
			const providerInput = confirmationForm.querySelector('input[name="paymentProvider"]');
			if (providerInput && providerInput instanceof HTMLInputElement) {
				providerInput.value = providerToUse.provider_type;
			}
		}
		
		// Soumettre le formulaire de confirmation
		confirmationForm?.requestSubmit();
		
		// Nettoyer le localStorage
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('paymentLinkOpened');
			localStorage.removeItem('paymentProvider');
			localStorage.removeItem('orderRef');
		}
	}

	async function handlePaymentClick(provider: { provider_type: string; payment_identifier: string }) {
		// Stripe nécessite une session checkout spéciale
		if (provider.provider_type === 'stripe') {
			await handleStripeClick(provider);
			return;
		}

		// Pour les autres providers, utiliser la nouvelle fonction
		handlePaymentLinkClick(provider);
	}

	// Polling pour vérifier si la commande existe après le paiement Stripe
	onMount(() => {
		// Détecter si l'utilisateur revient après avoir ouvert le lien
		if (typeof localStorage !== 'undefined') {
			const wasPaymentLinkOpened = localStorage.getItem('paymentLinkOpened') === 'true';
			const savedProvider = localStorage.getItem('paymentProvider');
			const savedOrderRef = localStorage.getItem('orderRef');
			
			if (wasPaymentLinkOpened && savedOrderRef === data.orderData?.order_ref) {
				// L'utilisateur est revenu après avoir ouvert le lien
				// Trouver le provider sauvegardé
				if (savedProvider) {
					selectedProviderForConfirmation = otherProviders.find(
						p => p.provider_type === savedProvider
					) || otherProviders[0];
				}
			}
		}

		const paymentSuccess = $page.url.searchParams.get('payment') === 'success';
		const orderRef = data.orderData?.order_ref;

		if (paymentSuccess && orderRef) {
			// Afficher l'overlay de chargement
			isWaitingForOrder = true;
			
			// Faire un polling pour vérifier si la commande existe
			let attempts = 0;
			const maxAttempts = 30; // 30 tentatives = 30 secondes max
			const pollInterval = 1000; // 1 seconde entre chaque tentative

			const checkOrder = async () => {
				if (attempts >= maxAttempts) {
					console.error('Timeout: La commande n\'a pas été trouvée après 30 secondes');
					isWaitingForOrder = false;
					return;
				}

				try {
					const response = await fetch(`/api/check-order/${orderRef}`);
					const result = await response.json();

					if (result.exists && result.orderId && result.slug) {
						// Cacher l'overlay avant redirection
						isWaitingForOrder = false;
						// Rediriger vers la page de confirmation
						goto(`/${result.slug}/order/${result.orderId}`);
					} else {
						// Réessayer après un délai
						attempts++;
						setTimeout(checkOrder, pollInterval);
					}
				} catch (err) {
					console.error('Error checking order:', err);
					attempts++;
					setTimeout(checkOrder, pollInterval);
				}
			};

			// Démarrer le polling après un court délai
			setTimeout(checkOrder, pollInterval);
		}
	});

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour formater la date
	function formatDate(dateString: string): string {
		const date = new Date(dateString + 'T12:00:00Z');
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	// Fonction pour copier la référence
	async function copyOrderRef() {
		try {
			await navigator.clipboard.writeText(data.orderData.order_ref);
			copySuccess = true;
			// Reset après 2 secondes
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Fonction pour retourner à la page produit
	function goBack() {
		// Utiliser l'historique du navigateur pour éviter les boucles
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		} else {
			// Sinon, retourner à la boutique
			goto(`/${data.shop.slug}`);
		}
	}

	// Fonction pour afficher les options de personnalisation
	function displayCustomizationOption(
		fieldLabel: string,
		fieldData: unknown,
	): string | string[] {
		if (!fieldData || typeof fieldData !== 'object') return '';
		const data = fieldData as Record<string, unknown>;

		// Pour les multi-select
		if (data.type === 'multi-select' && Array.isArray(data.values)) {
			return (data.values as Array<Record<string, unknown>>).map((item) => {
				const itemLabel = (item.label as string) || 'Option';
				const itemPrice = (item.price as number) || 0;
				return itemPrice === 0
					? itemLabel
					: `${itemLabel} (+${formatPrice(itemPrice)})`;
			});
		}

		// Pour les single-select
		if (data.type === 'single-select' && data.value) {
			const price = (data.price as number) || 0;
			return price === 0
				? (data.value as string)
				: `${data.value} (+${formatPrice(price)})`;
		}

		// Pour les autres types (short-text, number, long-text)
		if (data.value !== undefined && data.value !== '') {
			return String(data.value);
		}

		// Si pas de valeur ou valeur vide, ne pas afficher
		return '';
	}
</script>

<svelte:head>
	<title>Paiement - {data.shop.name}</title>
</svelte:head>

<!-- Overlay de chargement pendant le polling -->
{#if isWaitingForOrder}
	{@const buttonColor = customStyles.buttonStyle ? customStyles.buttonStyle.match(/background-color:\s*([^;]+)/)?.[1] || '#ff6f61' : '#ff6f61'}
	{@const textColor = customStyles.textStyle ? customStyles.textStyle.match(/color:\s*([^;]+)/)?.[1] || '#333333' : '#333333'}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center"
		style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
	>
		<div class="mx-auto max-w-md px-4 text-center">
			<!-- Spinner avec la couleur du bouton -->
			<div class="mb-6 flex justify-center">
				<div 
					class="h-16 w-16 animate-spin rounded-full border-4 border-transparent"
					style="border-top-color: {buttonColor}; border-right-color: {buttonColor};"
				></div>
			</div>
			
			<!-- Titre -->
			<h2 
				class="mb-3 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl"
				style="color: {textColor}; font-weight: 600; letter-spacing: -0.03em;"
			>
				Paiement en cours de traitement...
			</h2>
			
			<!-- Description -->
			<p 
				class="text-sm leading-relaxed sm:text-base"
				style="color: {customStyles.secondaryTextStyle ? customStyles.secondaryTextStyle.match(/color:\s*([^;]+)/)?.[1] || '#666666' : '#666666'}; font-weight: 300; letter-spacing: -0.01em;"
			>
				Veuillez patienter, nous confirmons votre commande. Cette opération peut prendre quelques secondes.
			</p>
		</div>
	</div>
{/if}

<div
	class="min-h-screen"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header avec logo, nom et bouton retour sur la même ligne -->
	<header class="relative border-b bg-white px-4 py-4 sm:px-6 sm:py-5">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
			<!-- Logo et nom de la boutique (cliquable pour retourner à la boutique) -->
			<button
				type="button"
				on:click={() => goto(`/${data.shop.slug}`)}
				class="flex cursor-pointer items-center gap-3 transition-opacity duration-200 hover:opacity-80 focus:outline-none"
			>
			{#if data.shop.logo_url}
				<div
						class="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white p-1.5 shadow-sm sm:h-12 sm:w-12"
				>
					<img
						src={data.shop.logo_url}
						alt={data.shop.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-12 sm:w-12"
				>
					<span
							class="text-lg font-semibold text-neutral-700 sm:text-xl"
						style="font-weight: 600;"
					>
						{data.shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		<h1
					class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
		>
			{data.shop.name}
		</h1>
			</button>

			<!-- Réseaux sociaux -->
			{#if data.shop && (data.shop.instagram || data.shop.tiktok || data.shop.website)}
				<SocialMediaIcons shop={data.shop} iconStyle={customStyles.iconStyle} />
			{/if}
		</div>
	</header>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-7xl pt-6 sm:pt-0 p-4 sm:p-8 lg:p-12">
			<!-- Titre avec bouton retour -->
			<div class="mb-8">
				<div class="mb-4 flex items-start gap-4">
					<!-- Bouton retour -->
					<button
						on:click={goBack}
						class="mt-1 flex shrink-0 items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-sm"
						style={`color: ${data.customizations?.secondary_text_color || '#6b7280'}; font-weight: 500; letter-spacing: -0.01em;`}
					>
						<ArrowLeft class="h-4 w-4" />
						<span class="hidden sm:inline">Retour</span>
					</button>
					<div class="flex-1">
				<h2
					class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Finalisation de votre commande
				</h2>
				<p
					class="text-sm leading-[180%] text-neutral-600 sm:text-base"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Vérifiez les détails et effectuez le paiement de l'acompte
				</p>
					</div>
				</div>
			</div>

			<!-- Layout en deux colonnes sur desktop -->
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_500px] xl:grid-cols-[2.5fr_500px]">
				<!-- Colonne gauche : Informations et récapitulatif -->
			<div class="space-y-6">
				<!-- Informations client -->
				<div class="rounded-2xl border bg-white p-6 shadow-sm">
					<h2
						class="mb-4 text-lg font-semibold text-neutral-900"
						style="font-weight: 600; letter-spacing: -0.02em;"
					>
						Vos informations
					</h2>
				<div class="space-y-3">
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Nom :
						</span>
						<span class="text-sm text-neutral-900 text-right sm:ml-auto" style="font-weight: 400;">
							{data.orderData.customer_name}
						</span>
					</div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Email :
						</span>
						<span class="break-words break-all text-right text-sm text-neutral-900 sm:ml-auto" style="font-weight: 400;">
							{data.orderData.customer_email}
						</span>
					</div>
					{#if data.orderData.customer_phone}
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Téléphone :
							</span>
							<span class="text-sm text-neutral-900 text-right sm:ml-auto" style="font-weight: 400;">
								{data.orderData.customer_phone}
							</span>
						</div>
					{/if}
					{#if data.orderData.customer_instagram}
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Instagram :
							</span>
							<span class="text-sm text-neutral-900 text-right sm:ml-auto" style="font-weight: 400;">
								@{data.orderData.customer_instagram}
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Informations de la commande -->
			<div class="rounded-2xl border bg-white p-6 shadow-sm">
				<h2
					class="mb-4 text-lg font-semibold text-neutral-900"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Récapitulatif de la commande
				</h2>

				<div class="space-y-3">
					<!-- Gâteau -->
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Gâteau :
						</span>
						<span class="text-sm text-neutral-900 text-right sm:ml-auto" style="font-weight: 400;">
							{data.product.name}
						</span>
					</div>

					<!-- Prix de base -->
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Prix de base :
						</span>
						<span class="text-sm text-neutral-900 whitespace-nowrap" style="font-weight: 400;">
							{formatPrice(data.product.base_price)}
						</span>
					</div>

					<!-- Date de récupération -->
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Date de récupération :
						</span>
						<span class="text-sm text-neutral-900 text-right sm:ml-auto whitespace-nowrap" style="font-weight: 400;">
							{formatDate(data.orderData.pickup_date)}
							{#if data.orderData.pickup_time}
								<span class="ml-1">{data.orderData.pickup_time.substring(0, 5)}</span>
							{/if}
						</span>
					</div>

					<!-- Options de personnalisation -->
					{#if data.orderData.customization_data && Object.keys(data.orderData.customization_data).length > 0}
						{#each Object.entries(data.orderData.customization_data) as [fieldLabel, fieldData]}
							{@const displayData = displayCustomizationOption(
								fieldLabel,
								fieldData,
							)}
							{#if Array.isArray(displayData)}
								<!-- Multi-select: Structure avec badges -->
								<div class="rounded-lg bg-neutral-50 p-3">
									<div class="mb-2">
										<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
											{fieldLabel}
										</span>
									</div>
									<div class="flex flex-wrap gap-2">
										{#each displayData as option}
											<span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm">
												<span class="break-words text-neutral-900" style={customStyles.textStyle}>
													{option}
												</span>
											</span>
										{/each}
									</div>
								</div>
							{:else if displayData}
								<!-- Single-select ou texte: Structure avec fond -->
								<div class="rounded-lg bg-neutral-50 p-3">
									<div class="mb-1">
										<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
											{fieldLabel}
										</span>
									</div>
									<div class="flex items-start justify-between gap-2">
										<span class="min-w-0 flex-1 break-words text-sm text-neutral-900" style={customStyles.textStyle}>
											{displayData}
										</span>
									</div>
								</div>
							{/if}
						{/each}
					{/if}

					<!-- Message supplémentaire -->
					{#if data.orderData.additional_information}
						<div class="rounded-lg bg-neutral-50 p-3">
							<div class="mb-1">
								<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
									Message
								</span>
							</div>
							<p class="text-sm italic text-neutral-600" style="font-weight: 300;">
								"{data.orderData.additional_information}"
							</p>
						</div>
					{/if}

					<!-- Séparateur avant le total -->
					<div class="pt-4">
						<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
					</div>
					<div class="pt-4">
						<!-- Montant total -->
						<div class="mb-2 flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Total :
							</span>
							<span class="font-semibold text-neutral-900 whitespace-nowrap" style="font-weight: 600;">
								{formatPrice(data.orderData.total_amount)}
							</span>
						</div>

						<!-- Acompte à payer -->
						<div
							class="flex items-center justify-between gap-2 font-semibold"
							style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 600;`}
						>
							<span>À payer aujourd'hui :</span>
							<span class="whitespace-nowrap">{formatPrice(depositAmount)}</span>
						</div>
						</div>
					</div>
				</div>
			</div>

				<!-- Colonne droite : Paiement (sticky sur desktop) -->
				<div class="lg:sticky lg:top-8 lg:self-start">
			<div class="rounded-2xl border bg-white p-6 shadow-sm">
				<h2
					class="mb-4 text-lg font-semibold text-neutral-900"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Paiement
				</h2>

				<div class="space-y-4">
					<!-- Bouton Carte bancaire (Stripe) - en premier, sans référence -->
					{#if stripeProvider}
						{@const provider = stripeProvider}
						{@const providerName = getProviderName(provider.provider_type)}
						{@const buttonColor = data.customizations?.button_color || '#ff6f61'}
						{@const buttonTextColor = data.customizations?.button_text_color || '#ffffff'}
						
						<div class="space-y-3">
							<p
								class="text-sm font-medium text-neutral-700"
								style="font-weight: 500;"
							>
								Paiement par carte bancaire :
							</p>
							
							<button
								type="button"
								on:click={() => handlePaymentClick(provider)}
								class="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
								style="font-weight: 500; background-color: {buttonColor}; color: {buttonTextColor};"
								on:mouseenter={(e) => {
									e.currentTarget.style.opacity = '0.9';
								}}
								on:mouseleave={(e) => {
									e.currentTarget.style.opacity = '1';
								}}
							>
								{providerName}
								<!-- Logos Visa et Mastercard collés -->
								<div class="flex items-center gap-0">
									<svg width="39" height="25" viewBox="0 -140 780 780" enable-background="new 0 0 780 500" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
										<path d="M40,0h700c22.092,0,40,17.909,40,40v420c0,22.092-17.908,40-40,40H40c-22.091,0-40-17.908-40-40V40   C0,17.909,17.909,0,40,0z" fill="#0E4595"/>
										<path d="m293.2 348.73l33.361-195.76h53.36l-33.385 195.76h-53.336zm246.11-191.54c-10.57-3.966-27.137-8.222-47.822-8.222-52.725 0-89.865 26.55-90.18 64.603-0.299 28.13 26.514 43.822 46.752 53.186 20.771 9.595 27.752 15.714 27.654 24.283-0.131 13.121-16.586 19.116-31.922 19.116-21.357 0-32.703-2.967-50.227-10.276l-6.876-3.11-7.489 43.823c12.463 5.464 35.51 10.198 59.438 10.443 56.09 0 92.5-26.246 92.916-66.882 0.199-22.269-14.016-39.216-44.801-53.188-18.65-9.055-30.072-15.099-29.951-24.268 0-8.137 9.668-16.839 30.557-16.839 17.449-0.27 30.09 3.535 39.938 7.5l4.781 2.26 7.232-42.429m137.31-4.223h-41.232c-12.773 0-22.332 3.487-27.941 16.234l-79.244 179.4h56.031s9.16-24.123 11.232-29.418c6.125 0 60.555 0.084 68.338 0.084 1.596 6.853 6.49 29.334 6.49 29.334h49.514l-43.188-195.64zm-65.418 126.41c4.412-11.279 21.26-54.723 21.26-54.723-0.316 0.522 4.379-11.334 7.074-18.684l3.605 16.879s10.219 46.729 12.354 56.528h-44.293zm-363.3-126.41l-52.24 133.5-5.567-27.13c-9.725-31.273-40.025-65.155-73.898-82.118l47.766 171.2 56.456-0.064 84.004-195.39h-56.521" fill="#fff"/>
										<path d="m146.92 152.96h-86.041l-0.681 4.073c66.938 16.204 111.23 55.363 129.62 102.41l-18.71-89.96c-3.23-12.395-12.597-16.094-24.186-16.527" fill="#F2AE14"/>
									</svg>
									<svg width="35" height="24" viewBox="0 -11 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
										<rect x="0.5" y="0.5" width="69" height="47" rx="5.5" fill="white" stroke="#D9D9D9"/>
										<path fill-rule="evenodd" clip-rule="evenodd" d="M35.3945 34.7619C33.0114 36.8184 29.92 38.0599 26.5421 38.0599C19.0047 38.0599 12.8945 31.8788 12.8945 24.254C12.8945 16.6291 19.0047 10.448 26.5421 10.448C29.92 10.448 33.0114 11.6895 35.3945 13.7461C37.7777 11.6895 40.869 10.448 44.247 10.448C51.7843 10.448 57.8945 16.6291 57.8945 24.254C57.8945 31.8788 51.7843 38.0599 44.247 38.0599C40.869 38.0599 37.7777 36.8184 35.3945 34.7619Z" fill="#ED0006"/>
										<path fill-rule="evenodd" clip-rule="evenodd" d="M35.3945 34.7619C38.3289 32.2296 40.1896 28.4616 40.1896 24.254C40.1896 20.0463 38.3289 16.2783 35.3945 13.7461C37.7777 11.6895 40.869 10.448 44.247 10.448C51.7843 10.448 57.8945 16.6291 57.8945 24.254C57.8945 31.8788 51.7843 38.0599 44.247 38.0599C40.869 38.0599 37.7777 36.8184 35.3945 34.7619Z" fill="#F9A000"/>
										<path fill-rule="evenodd" clip-rule="evenodd" d="M35.3946 13.7461C38.329 16.2784 40.1897 20.0463 40.1897 24.254C40.1897 28.4616 38.329 32.2295 35.3946 34.7618C32.4603 32.2295 30.5996 28.4616 30.5996 24.254C30.5996 20.0463 32.4603 16.2784 35.3946 13.7461Z" fill="#FF5E00"/>
									</svg>
								</div>
							</button>
						</div>
						
						<!-- Séparateur "ou" si d'autres méthodes sont disponibles -->
						{#if hasOtherProviders}
							<div class="flex items-center gap-4 py-2">
								<div class="flex-1 border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
								<span class="text-sm font-medium text-neutral-500" style="font-weight: 500;">ou</span>
								<div class="flex-1 border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
							</div>
						{/if}
					{/if}

					<!-- Alerte simple avant le paiement -->
					{#if hasOtherProviders && showPaymentInstructions && !paymentInstructionsAccepted}
						<div class="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
							<!-- Logos des moyens de paiement centrés -->
							<div class="mb-4 flex items-center justify-center gap-4">
								{#each otherProviders as provider}
									{@const isPaypal = provider.provider_type === 'paypal'}
									{@const isRevolut = provider.provider_type === 'revolut'}
									{@const isWero = provider.provider_type === 'wero'}
									
									<div class="flex h-14 w-14 items-center justify-center rounded-lg bg-white p-2 shadow-sm border border-neutral-200 sm:h-16 sm:w-16">
										{#if isPaypal}
											<img src="/payments_logo/paypal_logo.svg" alt="PayPal" class="h-full w-full object-contain" />
										{:else if isRevolut}
											<img src="/payments_logo/revolut_logo.svg" alt="Revolut" class="h-full w-full object-contain" />
										{:else if isWero}
											<img src="/payments_logo/wero_logo.svg" alt="Wero" class="h-full w-full object-contain" />
										{/if}
									</div>
								{/each}
							</div>
							
							<!-- Texte avec icône d'alerte -->
							<div class="flex items-start gap-3">
								<AlertCircle class="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
								<div class="flex-1">
									<p class="text-sm font-medium text-orange-900" style="font-weight: 600;">
										Important : Après avoir payé, revenez sur cette page et cliquez sur "J'ai payé" pour finaliser votre commande.
									</p>
								</div>
							</div>
							
							<button
								type="button"
								on:click={acceptPaymentInstructions}
								class="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
								style={customStyles.buttonStyle}>
								C'est compris
							</button>
						</div>
					{:else if hasOtherProviders && paymentInstructionsAccepted}
						<!-- Paiement PayPal/Revolut/Wero avec étapes visuelles -->
						<div class="rounded-xl border bg-white p-6 shadow-sm">
							<p class="mb-4 text-sm font-medium text-neutral-700" style="font-weight: 500;">
								Paiement avec {otherProviders.map(p => getProviderName(p.provider_type)).join(', ')} :
							</p>
							
							<!-- Étapes empilées verticalement -->
							<div class="space-y-4">
								<!-- Étape 1 : Copier la référence -->
								<div class="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-4">
									<div class="mb-3 flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
											style="background-color: {customStyles.buttonStyle ? customStyles.buttonStyle.match(/background-color:\s*([^;]+)/)?.[1] || '#ff6f61' : '#ff6f61'};"
										>
											1
										</div>
										<span class="text-sm font-semibold text-neutral-900" style="font-weight: 600;">
											Copiez la référence de commande
										</span>
									</div>
									<div class="flex items-center gap-2">
										<code
											class="flex-1 rounded-lg bg-white px-3 py-2 text-center font-mono text-sm font-semibold text-neutral-900 shadow-sm"
											style="font-weight: 600;"
										>
											{data.orderData.order_ref}
										</code>
										<Button
											type="button"
											variant="outline"
											size="sm"
											on:click={copyOrderRef}
											class="h-9 shrink-0 rounded-lg transition-all duration-200"
											style={copySuccess ? customStyles.buttonStyle : ''}
										>
											{#if copySuccess}
												<Check class="h-4 w-4" />
											{:else}
												<Copy class="h-4 w-4" />
											{/if}
										</Button>
									</div>
									<p class="mt-2 text-xs text-neutral-600">
										Vous devrez coller cette référence lors du paiement
									</p>
								</div>

								<!-- Étape 2 : Ouvrir le lien de paiement -->
								<div class="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-4">
									<div class="mb-3 flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
											style="background-color: {customStyles.buttonStyle ? customStyles.buttonStyle.match(/background-color:\s*([^;]+)/)?.[1] || '#ff6f61' : '#ff6f61'};"
										>
											2
										</div>
										<span class="text-sm font-semibold text-neutral-900" style="font-weight: 600;">
											Ouvrir {otherProviders.length > 1 ? 'le moyen de paiement' : getProviderName(otherProviders[0].provider_type)} et payer
										</span>
									</div>
									<div class="space-y-2">
										{#each otherProviders as provider}
											{@const isPaypal = provider.provider_type === 'paypal'}
											{@const isRevolut = provider.provider_type === 'revolut'}
											{@const isWero = provider.provider_type === 'wero'}
											{@const backgroundColor = isPaypal ? '#ffd140' : isRevolut ? '#000000' : isWero ? '#ffffff' : '#6b7280'}
											{@const textColor = isPaypal ? '#000000' : isWero ? '#000000' : '#ffffff'}
											{@const borderColor = isWero ? '#e5e7eb' : 'transparent'}
											
											<button
												type="button"
												on:click={() => handlePaymentLinkClick(provider)}
												class="flex w-full {isWero && showWeroIdentifier ? 'flex-col' : 'items-center'} justify-center gap-1.5 rounded-lg px-4 {isWero && showWeroIdentifier ? 'py-2.5' : 'h-11'} text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
												style="font-weight: 500; background-color: {backgroundColor}; color: {textColor}; border: 1px solid {borderColor};"
												on:mouseenter={(e) => {
													if (isPaypal) e.currentTarget.style.backgroundColor = '#e6bc00';
													else if (isRevolut) e.currentTarget.style.backgroundColor = '#1a1a1a';
													else if (isWero) e.currentTarget.style.backgroundColor = '#f9fafb';
												}}
												on:mouseleave={(e) => {
													if (isPaypal) e.currentTarget.style.backgroundColor = '#ffd140';
													else if (isRevolut) e.currentTarget.style.backgroundColor = '#000000';
													else if (isWero) e.currentTarget.style.backgroundColor = '#ffffff';
												}}
											>
												{#if isPaypal}
													<img src="/payments_logo/paypal_logo.svg" alt="PayPal" class="h-5 w-auto" />
												{:else if isRevolut}
													<img src="/payments_logo/revolut_logo.svg" alt="Revolut" class="h-4 w-auto" style="filter: brightness(0) invert(1);" />
												{:else if isWero}
													<div class="flex flex-col items-center gap-1.5">
														<img src="/payments_logo/wero_logo.svg" alt="Wero" class="h-5 w-auto" />
														{#if showWeroIdentifier}
															<div class="flex items-center gap-2">
																<span class="text-base font-semibold text-gray-900">{provider.payment_identifier}</span>
																<button
																	type="button"
																	on:click={async (e) => {
																		e.stopPropagation();
																		try {
																			await navigator.clipboard.writeText(provider.payment_identifier);
																			copyWeroSuccess = true;
																			setTimeout(() => { copyWeroSuccess = false; }, 2000);
																		} catch (err) {
																			console.error('Failed to copy:', err);
																		}
																	}}
																	class="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
																	title="Copier"
																>
																	{#if copyWeroSuccess}
																		<Check class="h-4 w-4 text-green-600" />
																	{:else}
																		<Copy class="h-4 w-4" />
																	{/if}
																</button>
															</div>
														{/if}
													</div>
												{/if}
											</button>
										{/each}
									</div>
								</div>

								<!-- Étape 3 : Confirmer le paiement -->
								<div class="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-4">
									<div class="mb-3 flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
											style="background-color: {customStyles.buttonStyle ? customStyles.buttonStyle.match(/background-color:\s*([^;]+)/)?.[1] || '#ff6f61' : '#ff6f61'};"
										>
											3
										</div>
										<span class="text-sm font-semibold text-neutral-900" style="font-weight: 600;">
											Confirmer votre paiement
										</span>
									</div>
									<p class="mb-3 text-xs text-neutral-600">
										Une fois le paiement effectué, cliquez sur le bouton ci-dessous pour finaliser votre commande.
									</p>
									<button
										type="button"
										on:click={confirmManualPayment}
										class="w-full rounded-lg px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
										style={customStyles.buttonStyle}>
										J'ai payé
									</button>
								</div>
							</div>
						</div>
					{/if}

					<!-- Bouton de confirmation (caché mais nécessaire pour le submit automatique) -->
					<form
						method="POST"
						action="?/confirmPayment"
						use:enhance
						bind:this={confirmationForm}
					>
						<!-- ✅ OPTIMISÉ : Passer shopId, productId et orderRef via formData pour éviter requêtes redondantes -->
						<input type="hidden" name="shopId" value={data.orderData.shop_id} />
						<input type="hidden" name="productId" value={data.orderData.product_id} />
						<input type="hidden" name="orderRef" value={data.orderData.order_ref} />
						<input type="hidden" name="paymentProvider" value="" />
					</form>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

	<!-- Footer minimaliste style Airbnb -->
	{#if data.hasPolicies}
		<footer class="mt-12 border-t border-neutral-200 bg-white px-4 py-6">
			<div class="mx-auto max-w-7xl">
				<div class="flex items-center justify-center">
					<a
						href="/{data.shop.slug}/policies"
						class="text-xs text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm"
						style="font-weight: 400;"
					>
						Conditions de vente
					</a>
				</div>
			</div>
		</footer>
	{/if}
</div>