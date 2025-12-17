<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Copy, ExternalLink, Check, ArrowLeft } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components/brand';
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

	// Initialiser avec le premier provider disponible (PayPal en priorité)
	$: if (data.paymentLinks && data.paymentLinks.length > 0 && !selectedPaymentProvider) {
		const paypalLink = data.paymentLinks.find((pl: any) => pl.provider_type === 'paypal');
		selectedPaymentProvider = paypalLink || data.paymentLinks[0];
	}

	// Fonction pour générer le lien de paiement selon le provider avec le montant pré-rempli
	function getPaymentLink(provider: { provider_type: string; payment_identifier: string }): string {
		if (provider.provider_type === 'paypal') {
			// Format PayPal.me avec montant en EUR
			const cleanIdentifier = provider.payment_identifier.replace(/^@/, '');
			return `https://paypal.me/${cleanIdentifier}/${depositAmount}EUR`;
		} else if (provider.provider_type === 'revolut') {
			// Format Revolut avec montant (multiplié par 100 car amount=14 donne 0,14€)
			const cleanIdentifier = provider.payment_identifier.replace(/^@/, '');
			const amountInCents = Math.round(depositAmount * 100);
			return `https://revolut.me/${cleanIdentifier}?amount=${amountInCents}`;
		}
		return '';
	}

	// Fonction pour obtenir le nom du provider
	function getProviderName(providerType: string): string {
		if (providerType === 'paypal') return 'PayPal';
		if (providerType === 'revolut') return 'Revolut';
		return providerType;
	}

	async function handlePaymentClick(provider: { provider_type: string; payment_identifier: string }) {
		const paymentLink = getPaymentLink(provider);
		if (paymentLink) {
			window.open(paymentLink, '_blank');
			// Soumettre directement le formulaire de confirmation
			confirmationForm?.requestSubmit();
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
	<!-- Header avec logo et informations - Design moderne -->
	<header class="relative px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Réseaux sociaux - Top right -->
		{#if data.shop && (data.shop.instagram || data.shop.tiktok || data.shop.website)}
			<SocialMediaIcons shop={data.shop} iconStyle={customStyles.iconStyle} />
		{/if}
		<!-- Bouton retour - Top left -->
		<button
			on:click={goBack}
			class="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-sm sm:left-6 sm:top-6"
			style={`color: ${data.customizations?.secondary_text_color || '#6b7280'}; font-weight: 500; letter-spacing: -0.01em;`}
		>
			<ArrowLeft class="h-4 w-4" />
			<span class="hidden sm:inline">Retour</span>
		</button>

		<!-- Logo - Design moderne sans bordure -->
		<div class="mb-4 flex justify-center">
			{#if data.shop.logo_url}
				<div
					class="relative h-20 w-20 overflow-hidden rounded-full bg-white p-2.5 shadow-sm transition-transform duration-300 hover:scale-105 sm:h-24 sm:w-24 sm:p-3 md:h-28 md:w-28"
				>
					<img
						src={data.shop.logo_url}
						alt={data.shop.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-neutral-700 sm:text-3xl md:text-4xl"
						style="font-weight: 600;"
					>
						{data.shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Nom de la boutique - Charte typographique -->
		<h1
			class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			{data.shop.name}
		</h1>
	</header>

	<!-- Separator - Design moderne avec couleur bouton et opacité -->
	<div class="px-4">
		<div
			class="mx-auto mb-6 h-px max-w-7xl bg-gradient-to-r from-transparent to-transparent sm:mb-8"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>
	</div>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-2xl p-4 sm:p-8 lg:p-12">
			<!-- Titre - Charte typographique -->
			<div class="mb-8 text-center">
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

			<!-- Récapitulatif de la commande -->
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

			<!-- Separator - Dégradé -->
			<div
				class="h-px bg-gradient-to-r from-transparent to-transparent"
				style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
			></div>

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
					<div
						class="border-t pt-4"
						style={`border-color: ${customStyles.separatorColor};`}
					>
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

			<!-- Separator - Dégradé -->
			<div
				class="h-px bg-gradient-to-r from-transparent to-transparent"
				style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
			></div>

			<!-- Paiement -->
			<div class="rounded-2xl border bg-white p-6 shadow-sm">
				<h2
					class="mb-4 text-lg font-semibold text-neutral-900"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Paiement
				</h2>

				<div class="space-y-4">
					<!-- Référence de commande -->
					<div class="rounded-xl border bg-white p-4 shadow-sm">
						<p
							class="mb-3 text-sm font-medium text-neutral-700"
							style="font-weight: 500;"
						>
							Référence à inclure dans le paiement :
						</p>
						<div class="flex items-center gap-2">
							<code
								class="flex-1 rounded-xl bg-neutral-50 px-4 py-3 text-center font-mono text-base font-semibold text-neutral-900"
								style="font-weight: 600;"
							>
								{data.orderData.order_ref}
							</code>
							<Button
								type="button"
								variant="outline"
								size="sm"
								on:click={copyOrderRef}
								class="h-11 shrink-0 rounded-xl transition-all duration-200"
								style={copySuccess ? customStyles.buttonStyle : ''}
							>
								{#if copySuccess}
									<Check class="h-4 w-4" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</Button>
						</div>
						<p
							class="mt-3 text-xs text-neutral-600"
							style="font-weight: 400;"
						>
							⚠️ N'oubliez pas d'inclure cette référence dans la note du paiement
						</p>
					</div>

					<!-- Méthodes de paiement disponibles -->
					{#if data.paymentLinks && data.paymentLinks.length > 0}
						<div class="space-y-3">
							<p
								class="text-sm font-medium text-neutral-700"
								style="font-weight: 500;"
							>
								Choisissez votre moyen de paiement :
							</p>
							
							{#each data.paymentLinks as provider}
								{@const paymentLink = getPaymentLink(provider)}
								{@const providerName = getProviderName(provider.provider_type)}
								{@const isPaypal = provider.provider_type === 'paypal'}
								{@const isRevolut = provider.provider_type === 'revolut'}
								
								<button
									type="button"
									on:click={() => handlePaymentClick(provider)}
									class="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md"
									style="font-weight: 500; {isPaypal ? 'background-color: #0070ba;' : ''} {isRevolut ? 'background-color: #000000;' : ''} {!isPaypal && !isRevolut ? 'background-color: #6b7280;' : ''}"
									on:mouseenter={(e) => {
										if (isPaypal) e.currentTarget.style.backgroundColor = '#005ea6';
										else if (isRevolut) e.currentTarget.style.backgroundColor = '#1a1a1a';
									}}
									on:mouseleave={(e) => {
										if (isPaypal) e.currentTarget.style.backgroundColor = '#0070ba';
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
									<ExternalLink class="h-4 w-4" />
								</button>
							{/each}
						</div>
					{:else}
						<!-- Fallback si aucun payment link n'est disponible -->
						<a
							href="https://paypal.me/{data.paypalMe}/{depositAmount}"
							target="_blank"
							rel="noopener noreferrer"
							on:click={(e) => {
								e.preventDefault();
								if (data.paypalMe) {
									window.open(`https://paypal.me/${data.paypalMe}/${depositAmount}`, '_blank');
									confirmationForm?.requestSubmit();
								}
							}}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070ba] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#005ea6] hover:shadow-md"
							style="font-weight: 500;"
						>
							Payer l'acompte
							<ExternalLink class="h-4 w-4" />
						</a>
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
					</form>
				</div>
			</div>
		</div>
	</div>
</div>

	<!-- Footer -->
	<ClientFooter customizations={data.customizations} shopSlug={data.shop.slug} hasPolicies={data.hasPolicies} />
</div>