<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Copy, ExternalLink, Check, ArrowLeft } from 'lucide-svelte';
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
	let confirmationForm: HTMLFormElement | null = null;
	let selectedPaymentProvider: { provider_type: string; payment_identifier: string } | null = null;

	// Initialiser avec le premier provider disponible (Stripe en priorité)
	$: if (data.paymentLinks && data.paymentLinks.length > 0 && !selectedPaymentProvider) {
		const stripeLink = data.paymentLinks.find((pl: any) => pl.provider_type === 'stripe');
		selectedPaymentProvider = stripeLink || data.paymentLinks[0];
	}

	// Séparer Stripe des autres méthodes de paiement
	$: stripeProvider = data.paymentLinks?.find((p: any) => p.provider_type === 'stripe');
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

	async function handlePaymentClick(provider: { provider_type: string; payment_identifier: string }) {
		// Stripe nécessite une session checkout spéciale
		if (provider.provider_type === 'stripe') {
			await handleStripeClick(provider);
			return;
		}

		const paymentLink = getPaymentLink(provider);
		if (paymentLink) {
			// Stocker le provider dans le formulaire avant de soumettre
			if (confirmationForm) {
				const providerInput = confirmationForm.querySelector('input[name="paymentProvider"]');
				if (providerInput && providerInput instanceof HTMLInputElement) {
					providerInput.value = provider.provider_type;
				}
			}
			window.open(paymentLink, '_blank');
			// Soumettre directement le formulaire de confirmation
			confirmationForm?.requestSubmit();
		}
	}

	// Fonction pour gérer le fallback PayPal
	function handlePaypalFallback() {
		if (data.paypalMe && confirmationForm) {
			// Stocker PayPal comme provider par défaut dans le formulaire
			const providerInput = confirmationForm.querySelector('input[name="paymentProvider"]');
			if (providerInput && providerInput instanceof HTMLInputElement) {
				providerInput.value = 'paypal';
			}
			window.open(`https://paypal.me/${data.paypalMe}/${depositAmount}`, '_blank');
			confirmationForm.requestSubmit();
		}
	}

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
		goto(`/${data.shop.slug}/product/${data.product.id}`);
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

<div
	class="min-h-screen"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header avec logo, nom et bouton retour sur la même ligne -->
	<header class="relative border-b bg-white px-4 py-4 sm:px-6 sm:py-5">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
			<!-- Logo et nom de la boutique -->
			<div class="flex items-center gap-3">
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
			</div>

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
						{@const paymentLink = getPaymentLink(provider)}
						{@const providerName = getProviderName(provider.provider_type)}
						{@const isStripe = true}
						{@const backgroundColor = '#ff6f61'}
						{@const textColor = '#ffffff'}
						
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
								style="font-weight: 500; background-color: {backgroundColor}; color: {textColor};"
								on:mouseenter={(e) => {
									e.currentTarget.style.backgroundColor = '#e55a4f';
								}}
								on:mouseleave={(e) => {
									e.currentTarget.style.backgroundColor = '#ff6f61';
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

					<!-- Paiement PayPal/Revolut avec étapes visuelles -->
					{#if hasOtherProviders}
						<div class="rounded-xl border bg-white p-6 shadow-sm">
							<p
								class="mb-4 text-sm font-medium text-neutral-700"
							style="font-weight: 500;"
						>
								Paiement avec PayPal ou Revolut :
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
											Copiez la référence
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
					</div>

								<!-- Étape 2 : Cliquer sur le bouton et coller -->
								<div class="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-4">
									<div class="mb-3 flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
											style="background-color: {customStyles.buttonStyle ? customStyles.buttonStyle.match(/background-color:\s*([^;]+)/)?.[1] || '#ff6f61' : '#ff6f61'};"
										>
											2
										</div>
										<span class="text-sm font-semibold text-neutral-900" style="font-weight: 600;">
											Cliquez et collez la référence
										</span>
									</div>
									<div class="space-y-2">
										{#each otherProviders as provider}
								{@const paymentLink = getPaymentLink(provider)}
								{@const providerName = getProviderName(provider.provider_type)}
								{@const isPaypal = provider.provider_type === 'paypal'}
								{@const isRevolut = provider.provider_type === 'revolut'}
											{@const backgroundColor = isPaypal ? '#ffd140' : isRevolut ? '#000000' : '#6b7280'}
											{@const textColor = isPaypal ? '#000000' : '#ffffff'}
								
								<button
									type="button"
									on:click={() => handlePaymentClick(provider)}
												class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
												style="font-weight: 500; background-color: {backgroundColor}; color: {textColor};"
									on:mouseenter={(e) => {
													if (isPaypal) e.currentTarget.style.backgroundColor = '#e6bc00';
										else if (isRevolut) e.currentTarget.style.backgroundColor = '#1a1a1a';
									}}
									on:mouseleave={(e) => {
													if (isPaypal) e.currentTarget.style.backgroundColor = '#ffd140';
										else if (isRevolut) e.currentTarget.style.backgroundColor = '#000000';
												}}
											>
												{#if isPaypal}
										<!-- Logo PayPal officiel avec couleurs originales -->
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 512 512"
											class="h-5 w-5"
										>
											<path
												fill="#002c8a"
												d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z"
											/>
											<path
												fill="#009be1"
												d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z"
											/>
											<path
												fill="#001f6b"
												d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z"
											/>
										</svg>
									{:else if isRevolut}
										<!-- Logo Revolut officiel en blanc -->
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 800 800"
											class="h-5 w-5"
										>
											<g fill="#FFFFFF">
												<rect x="209.051" y="262.097" width="101.445" height="410.21"/>
												<path d="M628.623,285.554c0-87.043-70.882-157.86-158.011-157.86H209.051v87.603h249.125c39.43,0,72.093,30.978,72.814,69.051
													c0.361,19.064-6.794,37.056-20.146,50.66c-13.357,13.61-31.204,21.109-50.251,21.109h-97.046c-3.446,0-6.25,2.8-6.25,6.245v77.859
													c0,1.324,0.409,2.59,1.179,3.656l164.655,228.43h120.53L478.623,443.253C561.736,439.08,628.623,369.248,628.623,285.554z"/>
											</g>
										</svg>
									{/if}
									Payer avec {providerName}
								</button>
							{/each}
									</div>
								</div>
							</div>
						</div>
					{:else}
						<!-- Fallback si aucun payment link n'est disponible -->
						<button
							type="button"
							on:click={(e) => {
								e.preventDefault();
								handlePaypalFallback();
							}}
							class="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
							style="background-color: #ffd140; color: #000000; font-weight: 500;"
							on:mouseenter={(e) => e.currentTarget.style.backgroundColor = '#e6bc00'}
							on:mouseleave={(e) => e.currentTarget.style.backgroundColor = '#ffd140'}
						>
							Payer l'acompte
						</button>
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