<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { Heart } from 'lucide-svelte';
	import { ClientFooter, DatePicker } from '$lib/components';

	// Données de la page
	$: ({
		shop,
		product,
		customizationForm,
		customizationFields,
		availabilities,
		unavailabilities,
	} = $page.data);

	// État du formulaire
	let selectedDate: Date | undefined;
	let customerName = '';
	let customerEmail = '';
	let customerPhone = '';
	let customerInstagram = '';
	let additionalInfo = '';
	let selectedOptions: Record<string, string | string[]> = {};

	// État de validation
	let errors: Record<string, string> = {};
	let isSubmitting = false;

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Prix total réactif
	$: totalPrice = (() => {
		let total = product.base_price || 0;

		// Ajouter les prix des options sélectionnées
		customizationFields.forEach((field) => {
			if (field.type === 'single-select' && selectedOptions[field.id]) {
				const selectedOption = field.options.find(
					(opt) => opt.label === selectedOptions[field.id],
				);
				if (selectedOption) {
					total += selectedOption.price || 0;
				}
			} else if (
				field.type === 'multi-select' &&
				Array.isArray(selectedOptions[field.id])
			) {
				(selectedOptions[field.id] as string[]).forEach((optionLabel) => {
					const selectedOption = field.options.find(
						(opt) => opt.label === optionLabel,
					);
					if (selectedOption) {
						total += selectedOption.price || 0;
					}
				});
			}
		});

		return total;
	})();

	// Fonction pour gérer la sélection d'options
	function toggleOption(
		fieldId: string,
		optionLabel: string,
		fieldType: string,
	) {
		if (fieldType === 'single-select') {
			selectedOptions[fieldId] =
				selectedOptions[fieldId] === optionLabel ? '' : optionLabel;
		} else if (fieldType === 'multi-select') {
			if (!Array.isArray(selectedOptions[fieldId])) {
				selectedOptions[fieldId] = [];
			}
			const currentOptions = selectedOptions[fieldId] as string[];
			if (currentOptions.includes(optionLabel)) {
				selectedOptions[fieldId] = currentOptions.filter(
					(opt) => opt !== optionLabel,
				);
			} else {
				selectedOptions[fieldId] = [...currentOptions, optionLabel];
			}
		}
		selectedOptions = { ...selectedOptions }; // Trigger reactivity
	}

	// Fonction pour retourner à la boutique
	function goBack() {
		goto(`/${shop.slug}`);
	}

	// Fonction pour valider les champs
	function validateForm(): boolean {
		errors = {};

		// Validation du nom
		if (!customerName.trim()) {
			errors.name = 'Le nom est obligatoire';
		}

		// Validation de l'email
		if (!customerEmail.trim()) {
			errors.email = "L'email est obligatoire";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
			errors.email = "Format d'email invalide";
		}

		// Validation de la date
		if (!selectedDate) {
			errors.date = 'La date de récupération est obligatoire';
		}

		// Validation des champs de personnalisation requis
		customizationFields.forEach((field) => {
			if (field.required) {
				if (field.type === 'single-select' && !selectedOptions[field.id]) {
					errors[field.id] = 'Ce champ est obligatoire';
				} else if (
					field.type === 'multi-select' &&
					(!selectedOptions[field.id] ||
						(Array.isArray(selectedOptions[field.id]) &&
							selectedOptions[field.id].length === 0))
				) {
					errors[field.id] = 'Ce champ est obligatoire';
				}
			}
		});

		return Object.keys(errors).length === 0;
	}

	// Fonction pour obtenir la classe de bordure selon l'erreur
	function getBorderClass(fieldName: string): string {
		return errors[fieldName] ? 'border-red-500' : 'border-input';
	}

	// Fonction pour valider la commande
	async function validateOrder() {
		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			// Préparer les données de la commande
			const orderData = {
				productId: product.id,
				shopId: shop.id,
				selectedDate: selectedDate?.toISOString().split('T')[0],
				customerName,
				customerEmail,
				customerPhone,
				customerInstagram,
				additionalInfo,
				selectedOptions,
				totalPrice,
				cakeName: product.name,
			};

			// Créer la session de paiement Stripe
			const response = await fetch('/api/create-payment-session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(orderData),
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la création de la session de paiement');
			}

			const { sessionUrl } = await response.json();
			window.location.href = sessionUrl;
		} catch (error) {
			console.error('Erreur:', error);
			errors.submit = 'Une erreur est survenue. Veuillez réessayer.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{product.name} - {shop.name} - Pattyly</title>
	<meta
		name="description"
		content={product.description ||
			`Découvrez ${product.name} chez ${shop.name}`}
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header avec logo et informations -->
	<header class="px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Logo -->
		<div class="mb-4 flex justify-center">
			{#if shop.logo_url}
				<img
					src={shop.logo_url}
					alt={shop.name}
					class="h-20 w-20 rounded-full border border-gray-300 object-cover sm:h-24 sm:w-24 md:h-28 md:w-28"
				/>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-muted sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-muted-foreground sm:text-3xl md:text-4xl"
					>
						{shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Nom de la boutique -->
		<h1 class="mb-2 text-xl font-semibold text-foreground">
			{shop.name}
		</h1>

		<!-- Bouton retour -->
		<button
			on:click={goBack}
			class="text-xs italic text-gray-400 underline transition-colors hover:text-gray-600 sm:text-sm"
		>
			← Retour à la boutique
		</button>
	</header>

	<!-- Separator -->
	<Separator class="mx-4" />

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive : 2 colonnes sur desktop, 1 colonne sur mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Colonne gauche : Image (fixe sur desktop) -->
				<div class="h-fit md:sticky md:top-6">
					<div class="flex justify-center">
						{#if product.image_url}
							<img
								src={product.image_url}
								alt={product.name}
								class="aspect-square w-full max-w-[350px] rounded-lg object-cover lg:max-w-[450px] xl:max-w-[500px]"
							/>
						{:else}
							<div
								class="flex aspect-square w-full max-w-[350px] items-center justify-center rounded-lg bg-muted lg:max-w-[450px] xl:max-w-[500px]"
							>
								<Heart class="h-16 w-16 text-muted-foreground" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Colonne droite : Contenu (scrollable) -->
				<div class="space-y-6">
					<!-- Section 1 : Informations produit -->
					<div class="space-y-4">
						<h2
							class="text-lg font-medium text-foreground sm:text-xl md:text-2xl"
						>
							{product.name}
						</h2>
						<p class="text-sm font-medium text-foreground sm:text-base">
							À partir de {formatPrice(product.base_price)}
						</p>
						{#if product.description}
							<p class="text-sm text-foreground sm:text-base">
								{product.description}
							</p>
						{/if}
						<p class="text-xs italic text-gray-400 sm:text-sm">
							Temps de préparation minimum : {product.min_days_notice || 0} jours
						</p>
					</div>

					<Separator />

					<!-- Section 2 : Personnalisation (si disponible) -->
					{#if customizationForm && customizationFields.length > 0}
						<div class="space-y-4">
							<h3 class="text-sm font-medium text-foreground sm:text-base">
								Personnalisation du gâteau
							</h3>
							{#each customizationFields as field}
								<div class="space-y-2">
									<Label class="text-xs text-foreground sm:text-sm">
										{field.label}
										{field.required ? '*' : ''}
									</Label>
									{#if field.type === 'single-select' || field.type === 'multi-select'}
										<div class="flex flex-wrap gap-2">
											{#each field.options as option}
												<Button
													variant={field.type === 'single-select'
														? selectedOptions[field.id] === option.label
															? 'default'
															: 'outline'
														: Array.isArray(selectedOptions[field.id]) &&
															  selectedOptions[field.id].includes(option.label)
															? 'default'
															: 'outline'}
													on:click={() =>
														toggleOption(field.id, option.label, field.type)}
													class="rounded-lg text-xs sm:text-sm {field.type ===
													'single-select'
														? selectedOptions[field.id] === option.label
															? ''
															: 'text-muted-foreground'
														: Array.isArray(selectedOptions[field.id]) &&
															  selectedOptions[field.id].includes(option.label)
															? ''
															: 'text-muted-foreground'}"
												>
													{option.label}
													{option.price > 0
														? `(+${formatPrice(option.price)})`
														: ''}
												</Button>
											{/each}
										</div>
									{:else if field.type === 'long-text'}
										<Textarea
											id={field.id}
											placeholder={field.label}
											bind:value={selectedOptions[field.id]}
											required={field.required}
											class="text-xs sm:text-sm {getBorderClass(field.id)}"
										/>
									{:else}
										<Input
											type={field.type === 'number' ? 'number' : 'text'}
											placeholder={field.label}
											bind:value={selectedOptions[field.id]}
											required={field.required}
											class="text-xs sm:text-sm {getBorderClass(field.id)}"
										/>
									{/if}
									{#if errors[field.id]}
										<p class="text-xs text-red-500">{errors[field.id]}</p>
									{/if}
								</div>
							{/each}
						</div>

						<Separator />
					{/if}

					<!-- Section 3 : Récupération -->
					<div class="space-y-4">
						<h3 class="text-sm font-medium text-foreground sm:text-base">
							Information de récupération
						</h3>
						<div class="space-y-2">
							<Label class="text-xs text-foreground sm:text-sm">
								Date de récupération *
							</Label>
							<DatePicker
								bind:selectedDate
								minDaysNotice={product.min_days_notice || 0}
								{availabilities}
								{unavailabilities}
								on:dateSelected={(event) => (selectedDate = event.detail)}
							/>
							{#if errors.date}
								<p class="text-xs text-red-500">{errors.date}</p>
							{/if}
						</div>
					</div>

					<Separator />

					<!-- Section 4 : Contact -->
					<div class="space-y-4">
						<h3 class="text-sm font-medium text-foreground sm:text-base">
							Information de contact
						</h3>
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="name" class="text-xs text-foreground sm:text-sm">
									Nom complet *
								</Label>
								<Input
									id="name"
									bind:value={customerName}
									required
									class="text-xs sm:text-sm {getBorderClass('name')}"
								/>
								{#if errors.name}
									<p class="text-xs text-red-500">{errors.name}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="email" class="text-xs text-foreground sm:text-sm">
									Email *
								</Label>
								<Input
									id="email"
									type="email"
									bind:value={customerEmail}
									required
									class="text-xs sm:text-sm {getBorderClass('email')}"
								/>
								{#if errors.email}
									<p class="text-xs text-red-500">{errors.email}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="phone" class="text-xs text-foreground sm:text-sm">
									Numéro de téléphone (facultatif)
								</Label>
								<Input
									id="phone"
									type="tel"
									bind:value={customerPhone}
									placeholder="06 12 34 56 78"
									class="text-xs sm:text-sm"
								/>
							</div>
							<div class="space-y-2">
								<Label
									for="instagram"
									class="text-xs text-foreground sm:text-sm"
								>
									Instagram (facultatif)
								</Label>
								<Input
									id="instagram"
									type="text"
									bind:value={customerInstagram}
									placeholder="@votre_compte"
									class="text-xs sm:text-sm"
								/>
							</div>
							<div class="space-y-2">
								<Label for="info" class="text-xs text-foreground sm:text-sm">
									Informations supplémentaires
								</Label>
								<Textarea
									id="info"
									bind:value={additionalInfo}
									placeholder="Informations supplémentaires..."
									rows={3}
									class="text-xs sm:text-sm"
								/>
							</div>
						</div>
					</div>

					<Separator />

					<!-- Section 5 : Récapitulatif -->
					<div class="space-y-4">
						<h3 class="text-lg font-semibold text-foreground">
							Récapitulatif de la commande
						</h3>
						<div class="space-y-3 rounded-lg border p-4">
							<p class="text-sm text-muted-foreground">
								Merci de bien vérifier les informations de commande car en cas
								d'erreur votre commande pourra être retardée.
							</p>
							<div class="space-y-2 text-sm">
								{#if selectedDate}
									<div class="flex justify-between">
										<span class="text-muted-foreground"
											>Date de récupération :</span
										>
										<span class="font-medium"
											>{selectedDate.toLocaleDateString('fr-FR')}</span
										>
									</div>
								{/if}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Gâteau :</span>
									<span class="font-medium"
										>{formatPrice(product.base_price)}</span
									>
								</div>
								{#each customizationFields as field}
									{#if selectedOptions[field.id]}
										{#if Array.isArray(selectedOptions[field.id])}
											{#each selectedOptions[field.id] as option}
												{@const selectedOption = field.options.find(
													(opt) => opt.label === option,
												)}
												{#if selectedOption}
													<div class="flex justify-between">
														<span class="text-muted-foreground"
															>{field.label} :</span
														>
														<span class="font-medium"
															>{option} (+{formatPrice(
																selectedOption.price,
															)})</span
														>
													</div>
												{/if}
											{/each}
										{:else}
											{@const selectedOption = field.options.find(
												(opt) => opt.label === selectedOptions[field.id],
											)}
											{#if selectedOption}
												<div class="flex justify-between">
													<span class="text-muted-foreground"
														>{field.label} :</span
													>
													<span class="font-medium"
														>{selectedOptions[field.id]} (+{formatPrice(
															selectedOption.price,
														)})</span
													>
												</div>
											{/if}
										{/if}
									{/if}
								{/each}
								<Separator class="my-2" />
								<div class="flex justify-between">
									<span class="text-muted-foreground">Total :</span>
									<span class="font-medium">{formatPrice(totalPrice)}</span>
								</div>
								<div class="flex justify-between font-medium text-blue-600">
									<span>À payer aujourd'hui :</span>
									<span>{formatPrice(totalPrice * 0.5)}</span>
								</div>
							</div>
						</div>
						{#if errors.submit}
							<p class="text-center text-sm text-red-500">{errors.submit}</p>
						{/if}
						<Button
							on:click={validateOrder}
							disabled={isSubmitting}
							class="w-full rounded-full bg-black px-6 py-2 text-sm text-white shadow-[0px_10px_18px_-1px_rgba(0,0,0,0.25)] hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:py-3 sm:text-base"
						>
							{isSubmitting
								? 'Redirection vers le paiement...'
								: 'Valider et payer la commande'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter />
</div>
