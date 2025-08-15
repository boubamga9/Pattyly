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
	$: ({ shop, customForm, customFields, availabilities, unavailabilities } =
		$page.data);

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
		customFields.forEach((field) => {
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
				shopId: shop.id,
				selectedDate: selectedDate?.toISOString().split('T')[0],
				customerName,
				customerEmail,
				customerPhone,
				customerInstagram,
				additionalInfo,
				selectedOptions,
				estimatedPrice,
				type: 'custom_order',
			};

			// Créer la commande directement
			const response = await fetch('/api/create-custom-order', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(orderData),
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la création de la commande');
			}

			// Parser la réponse JSON
			const result = await response.json();

			// Rediriger vers la page de succès
			goto(`/${$page.params.slug}/order/${result.orderId}`);
		} catch (error) {
			console.error('Erreur:', error);
			errors.submit = 'Une erreur est survenue. Veuillez réessayer.';
		} finally {
			isSubmitting = false;
		}
	}

	// Fonction pour formater la date
	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		}).format(date);
	}

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return `${price.toFixed(2)}€`;
	}

	// Calcul de l'estimation basée sur les options sélectionnées
	$: estimatedPrice = (() => {
		let total = 0;

		// Ajouter les prix des options sélectionnées uniquement
		Object.entries(selectedOptions).forEach(([fieldId, value]) => {
			if (
				value &&
				(typeof value === 'string' ? value.length > 0 : value.length > 0)
			) {
				const field = customFields.find((f) => f.id === fieldId);
				if (field && field.options) {
					if (Array.isArray(value)) {
						// Multi-select
						value.forEach((optionLabel) => {
							const option = field.options.find(
								(opt) => opt.label === optionLabel,
							);
							if (option && option.price) {
								total += option.price;
							}
						});
					} else {
						// Single-select
						const option = field.options.find((opt) => opt.label === value);
						if (option && option.price) {
							total += option.price;
						}
					}
				}
			}
		});

		return total;
	})();
</script>

<svelte:head>
	<title>Demande Personnalisée - {shop.name}</title>
	<meta
		name="description"
		content="Faites votre demande personnalisée chez {shop.name}"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col overflow-x-hidden bg-background">
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
				<!-- Colonne gauche : Description -->
				<div class="space-y-4 pr-4">
					<h2 class="text-2xl font-semibold text-foreground">
						{customForm?.title || 'Votre Gâteau Sur Mesure'}
					</h2>
					<div class="space-y-3 text-muted-foreground">
						{#if customForm?.description}
							<p class="whitespace-pre-wrap">{customForm.description}</p>
						{:else}
							<p>
								Vous avez une idée précise en tête ? Un gâteau pour une occasion
								spéciale ? Nous sommes là pour créer ensemble votre dessert
								parfait !
							</p>
							<p>
								Notre pâtissier passionné prendra le temps d'écouter vos envies
								et de vous proposer des suggestions personnalisées pour réaliser
								le gâteau de vos rêves.
							</p>
							<p>
								Que ce soit pour un anniversaire, un mariage, une célébration ou
								simplement pour le plaisir, nous nous adaptons à vos besoins et
								à vos goûts.
							</p>
							<p>
								Remplissez le formulaire ci-contre avec tous les détails de
								votre projet, et nous vous recontacterons rapidement avec un
								devis personnalisé !
							</p>
						{/if}
					</div>
				</div>

				<!-- Colonne de droite : Formulaire -->
				<div class="space-y-8">
					<!-- Section 2: Personnalisation du gâteau -->
					{#if customFields && customFields.length > 0}
						<div class="space-y-4">
							<h3 class="text-lg font-semibold text-foreground">
								Personnalisation du gâteau
							</h3>
							<div class="space-y-4">
								{#each customFields as field}
									<div class="space-y-2">
										<Label for={field.id} class="text-sm font-medium">
											{field.label}
											{#if field.required}
												<span class="text-red-500">*</span>
											{/if}
										</Label>

										{#if field.type === 'short-text'}
											<Input
												id={field.id}
												type="text"
												placeholder="Votre réponse"
												bind:value={selectedOptions[field.id]}
												required={field.required}
												class={getBorderClass(field.id)}
											/>
										{:else if field.type === 'long-text'}
											<Textarea
												id={field.id}
												placeholder="Votre réponse"
												bind:value={selectedOptions[field.id]}
												required={field.required}
												class={getBorderClass(field.id)}
											/>
										{:else if field.type === 'number'}
											<Input
												id={field.id}
												type="number"
												placeholder="Votre réponse"
												bind:value={selectedOptions[field.id]}
												required={field.required}
												class={getBorderClass(field.id)}
											/>
										{:else if field.type === 'single-select' || field.type === 'multi-select'}
											<div class="flex flex-wrap gap-2">
												{#each field.options as option}
													<Button
														type="button"
														variant={(field.type === 'single-select' &&
															selectedOptions[field.id] === option.label) ||
														(field.type === 'multi-select' &&
															Array.isArray(selectedOptions[field.id]) &&
															selectedOptions[field.id].includes(option.label))
															? 'default'
															: 'outline'}
														on:click={() =>
															toggleOption(field.id, option.label, field.type)}
														class="rounded-lg text-sm"
													>
														{option.label}
														{#if option.price && option.price > 0}
															<span class="ml-1 text-xs opacity-75">
																(+{option.price}€)
															</span>
														{/if}
													</Button>
												{/each}
											</div>
										{/if}
										{#if errors[field.id]}
											<p class="text-xs text-red-500">{errors[field.id]}</p>
										{/if}
									</div>
								{/each}
							</div>
						</div>
						<Separator />
					{/if}

					<!-- Section 3: Information de récupération -->
					<div class="space-y-4">
						<h3 class="text-lg font-semibold text-foreground">
							Information de récupération
						</h3>
						<div class="space-y-2">
							<Label for="pickup-date" class="text-sm font-medium">
								Date de récupération
							</Label>
							<DatePicker
								bind:selectedDate
								{availabilities}
								{unavailabilities}
								minDaysNotice={3}
							/>
							{#if errors.date}
								<p class="text-xs text-red-500">{errors.date}</p>
							{/if}
						</div>
					</div>
					<Separator />

					<!-- Section 4: Information de contact -->
					<div class="space-y-4">
						<h3 class="text-lg font-semibold text-foreground">
							Information de contact
						</h3>
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="customer-name" class="text-sm font-medium">
									Nom complet
								</Label>
								<Input
									id="customer-name"
									type="text"
									placeholder="Votre nom complet"
									bind:value={customerName}
									required
									class={getBorderClass('name')}
								/>
								{#if errors.name}
									<p class="text-xs text-red-500">{errors.name}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="customer-email" class="text-sm font-medium">
									Email
								</Label>
								<Input
									id="customer-email"
									type="email"
									placeholder="votre@email.com"
									bind:value={customerEmail}
									required
									class={getBorderClass('email')}
								/>
								{#if errors.email}
									<p class="text-xs text-red-500">{errors.email}</p>
								{/if}
							</div>
							<div class="space-y-2">
								<Label for="customer-phone" class="text-sm font-medium">
									Numéro de téléphone (facultatif)
								</Label>
								<Input
									id="customer-phone"
									type="tel"
									placeholder="06 12 34 56 78"
									bind:value={customerPhone}
								/>
							</div>
							<div class="space-y-2">
								<Label for="customer-instagram" class="text-sm font-medium">
									Instagram (facultatif)
								</Label>
								<Input
									id="customer-instagram"
									type="text"
									placeholder="@votre_compte"
									bind:value={customerInstagram}
								/>
							</div>
							<div class="space-y-2">
								<Label for="additional-info" class="text-sm font-medium">
									Informations supplémentaires (optionnel)
								</Label>
								<Textarea
									id="additional-info"
									placeholder="Tous les détails supplémentaires que vous souhaitez nous communiquer..."
									bind:value={additionalInfo}
									rows={4}
								/>
							</div>
						</div>
					</div>
					<Separator />

					<!-- Section 5: Récapitulatif de la commande -->
					<div class="space-y-4">
						<h3 class="text-lg font-semibold text-foreground">
							Récapitulatif de la demande
						</h3>
						<div class="space-y-3 rounded-lg border p-4">
							<p class="text-sm text-muted-foreground">
								Merci de bien vérifier les informations de votre demande car en
								cas d'erreur votre commande pourra être retardée.
							</p>
							<div class="space-y-2 text-sm">
								{#if selectedDate}
									<div class="flex justify-between">
										<span class="text-muted-foreground"
											>Date de récupération :</span
										>
										<span class="font-medium">{formatDate(selectedDate)}</span>
									</div>
								{/if}
								{#if customerName}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Nom :</span>
										<span class="font-medium">{customerName}</span>
									</div>
								{/if}
								{#if customerEmail}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Email :</span>
										<span class="font-medium">{customerEmail}</span>
									</div>
								{/if}
								{#if Object.keys(selectedOptions).length > 0}
									<div class="pt-2">
										<span class="text-muted-foreground"
											>Options sélectionnées :</span
										>
										<ul class="mt-1 space-y-1">
											{#each Object.entries(selectedOptions) as [fieldId, value]}
												{#if value && (typeof value === 'string' ? value.length > 0 : value.length > 0)}
													{@const field = customFields.find(
														(f) => f.id === fieldId,
													)}
													{#if field}
														<li class="text-sm">
															<span class="font-medium">{field.label} :</span>
															{#if Array.isArray(value)}
																{#each value as optionLabel}
																	{@const option = field.options?.find(
																		(opt) => opt.label === optionLabel,
																	)}
																	<span>{optionLabel}</span>
																	{#if optionLabel !== value[value.length - 1]},
																	{/if}
																{/each}
															{:else}
																{@const option = field.options?.find(
																	(opt) => opt.label === value,
																)}
																<span>{value}</span>
															{/if}
														</li>
													{/if}
												{/if}
											{/each}
										</ul>
									</div>
								{/if}
								<Separator class="my-2" />
								<p class="text-xs italic text-muted-foreground">
									* Le prix final sera confirmé par le pâtissier après étude de
									votre demande
								</p>
							</div>
						</div>
						{#if errors.submit}
							<p class="text-center text-sm text-red-500">{errors.submit}</p>
						{/if}
						<Button
							on:click={validateOrder}
							disabled={isSubmitting}
							class="w-full bg-black text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSubmitting
								? 'Envoi en cours...'
								: 'Envoyer ma demande personnalisée'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter />
</div>
