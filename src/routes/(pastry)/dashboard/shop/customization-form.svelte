<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { customizationSchema } from './customization-schema';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import {
		Palette,
		Upload,
		X,
		LoaderCircle,
		Check,
	} from 'lucide-svelte';
	import { page } from '$app/stores';

	export let form: SuperValidated<Infer<typeof customizationSchema>>;

	const formStore = superForm(form, {
		validators: zodClient(customizationSchema),
		resetForm: false,
		taintedMessage: null,
	});

	const { form: formData, enhance, errors, submitting } = formStore;

	// Variables pour l'image de fond
	let _backgroundFile: File | null = null;
	let backgroundInputElement: HTMLInputElement;
	let submitted = false;
	let backgroundPreview: string | null = null;

	// ✅ RÉACTIF : backgroundPreview affiche l'URL Cloudinary depuis formData (sauf si un fichier local est sélectionné)
	// Si _backgroundFile est null, utiliser l'URL Cloudinary
	$: if (!_backgroundFile) {
		backgroundPreview = $formData.background_image_url || null;
	}

	// Handle background image selection (Cloudinary gère la compression automatiquement)
	function handleBackgroundFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			alert('Veuillez sélectionner un fichier image valide');
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			alert('L\'image ne doit pas dépasser 5MB');
			return;
		}

		// Utiliser le fichier original (Cloudinary compresse automatiquement)
		_backgroundFile = file;
		formData.update((data) => {
			data.background_image = file;
			return data;
		});

		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			backgroundPreview = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function removeBackgroundImage() {
		try {
			// Supprimer côté client immédiatement pour l'UX
			_backgroundFile = null;
			backgroundPreview = null;
			formData.update((data) => {
				data.background_image = undefined;
				return data;
			});

			// Supprimer côté serveur si une image existe
			const currentImageUrl = $formData.background_image_url;
			if (currentImageUrl) {
				const requestFormData = new FormData();
				// ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUser + requête shop
				requestFormData.append('shopId', $page.data.shop.id);
				requestFormData.append('shopSlug', $page.data.shop.slug);

				const response = await fetch('?/removeBackgroundImage', {
					method: 'POST',
					body: requestFormData,
				});

				if (response.ok) {
					// Mettre à jour l'état après suppression
					formData.update((data) => {
						data.background_image_url = '';
						return data;
					});
					backgroundPreview = null; // La réactivité mettra à jour automatiquement
				} else {
					console.error(
						'🎨 [Customization Form] Failed to remove background image',
					);
					// En cas d'erreur, la réactivité remettra l'aperçu depuis formData
				}
			}
		} catch (error) {
			console.error(
				'🎨 [Customization Form] Error removing background image:',
				error,
			);
			// En cas d'erreur, la réactivité remettra l'aperçu depuis formData
		}
	}
</script>

<Card>
	<CardHeader>
		<div class="flex items-center gap-2">
			<Palette class="h-5 w-5" />
			<CardTitle>Personnalisation visuelle</CardTitle>
		</div>
		<CardDescription>
			Personnalisez l'apparence de votre boutique avec vos couleurs
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-6">
		<!-- Message de succès -->
		{#if form.message}
			<div class="rounded-md bg-green-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<p class="text-sm font-medium text-green-800">
							{form.message}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<form
			method="POST"
			action="?/updateCustomizationForm"
			enctype="multipart/form-data"
			use:enhance={{
				onResult: ({ result }) => {
					if (result.type === 'success') {
						submitted = true;
						setTimeout(() => {
							submitted = false;
						}, 2000);
					}
				},
			}}
			class="space-y-6"
		>
			<!-- ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUser + requête shop -->
			<input type="hidden" name="shopId" value={$page.data.shop.id} />
			<input type="hidden" name="shopSlug" value={$page.data.shop.slug} />

			<!-- Section Image de fond -->
			<div class="space-y-6">
				<div class="space-y-3">
					<Label for="background_image" class="text-base font-medium"
						>Image de fond</Label
					>
					<p class="text-sm text-muted-foreground">
						Ajoutez une image de fond pour personnaliser votre boutique
						(optionnel)
					</p>
				</div>

				{#if backgroundPreview}
					<div class="flex justify-center">
						<div class="relative">
							<img
								src={backgroundPreview}
								alt="Aperçu de l'image de fond"
								class="h-32 w-full max-w-md rounded-lg border-2 border-border object-cover shadow-sm"
							/>
							<button
								type="button"
								on:click={removeBackgroundImage}
								class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
							>
								<X class="h-3 w-3" />
							</button>
						</div>
					</div>
				{:else}
					<div class="flex justify-center">
						<button
							type="button"
							class="flex h-32 w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary hover:bg-muted/50"
							on:click={() =>
								document.getElementById('background_image')?.click()}
						>
							<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
							<p class="text-center text-xs text-muted-foreground">
								Cliquez pour sélectionner une image de fond
							</p>
						</button>
					</div>
				{/if}

				<input
					id="background_image"
					name="background_image"
					type="file"
					accept="image/*"
					on:change={handleBackgroundFileSelect}
					class="hidden"
					bind:this={backgroundInputElement}
				/>
				<input
					type="hidden"
					name="background_image_url"
					value={backgroundPreview || ''}
				/>
			</div>

			<!-- Couleurs -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<!-- Couleur des boutons -->
				<div class="space-y-2">
					<Label for="button_color">Couleur des boutons</Label>
					<div class="flex items-center gap-3">
						<div
							class="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-gray-200"
							style="background-color: {$formData.button_color};"
						></div>
						<input
							id="button_color"
							name="button_color"
							type="color"
							bind:value={$formData.button_color}
							class="h-12 w-full cursor-pointer rounded-lg border-2 border-gray-200"
						/>
					</div>
					{#if $errors.button_color}
						<p class="text-sm text-red-600">{$errors.button_color}</p>
					{/if}
				</div>

				<!-- Couleur du texte des boutons -->
				<div class="space-y-2">
					<Label for="button_text_color">Couleur du texte des boutons</Label>
					<div class="flex items-center gap-3">
						<div
							class="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-gray-200"
							style="background-color: {$formData.button_text_color};"
						></div>
						<input
							id="button_text_color"
							name="button_text_color"
							type="color"
							bind:value={$formData.button_text_color}
							class="h-12 w-full cursor-pointer rounded-lg border-2 border-gray-200"
						/>
					</div>
					{#if $errors.button_text_color}
						<p class="text-sm text-red-600">{$errors.button_text_color}</p>
					{/if}
				</div>

				<!-- Couleur du texte principal -->
				<div class="space-y-2">
					<Label for="text_color">Couleur du texte principal</Label>
					<div class="flex items-center gap-3">
						<div
							class="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-gray-200"
							style="background-color: {$formData.text_color};"
						></div>
						<input
							id="text_color"
							name="text_color"
							type="color"
							bind:value={$formData.text_color}
							class="h-12 w-full cursor-pointer rounded-lg border-2 border-gray-200"
						/>
					</div>
					{#if $errors.text_color}
						<p class="text-sm text-red-600">{$errors.text_color}</p>
					{/if}
				</div>

				<!-- Couleur des icônes -->
				<div class="space-y-2">
					<Label for="icon_color">Couleur des icônes</Label>
					<div class="flex items-center gap-3">
						<div
							class="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-gray-200"
							style="background-color: {$formData.icon_color};"
						></div>
						<input
							id="icon_color"
							name="icon_color"
							type="color"
							bind:value={$formData.icon_color}
							class="h-12 w-full cursor-pointer rounded-lg border-2 border-gray-200"
						/>
					</div>
					{#if $errors.icon_color}
						<p class="text-sm text-red-600">{$errors.icon_color}</p>
					{/if}
				</div>

				<!-- Couleur du texte secondaire -->
				<div class="space-y-2">
					<Label for="secondary_text_color">Couleur du texte secondaire</Label>
					<div class="flex items-center gap-3">
						<div
							class="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-gray-200"
							style="background-color: {$formData.secondary_text_color};"
						></div>
						<input
							id="secondary_text_color"
							name="secondary_text_color"
							type="color"
							bind:value={$formData.secondary_text_color}
							class="h-12 w-full cursor-pointer rounded-lg border-2 border-gray-200"
						/>
					</div>
					{#if $errors.secondary_text_color}
						<p class="text-sm text-red-600">{$errors.secondary_text_color}</p>
					{/if}
				</div>

				<!-- Couleur du background -->
				<div class="space-y-2">
					<Label for="background_color">Couleur du fond</Label>
					<div class="flex items-center gap-3">
						<div
							class="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-gray-200"
							style="background-color: {$formData.background_color};"
						></div>
						<input
							id="background_color"
							name="background_color"
							type="color"
							bind:value={$formData.background_color}
							class="h-12 w-full cursor-pointer rounded-lg border-2 border-gray-200"
						/>
					</div>
					{#if $errors.background_color}
						<p class="text-sm text-red-600">{$errors.background_color}</p>
					{/if}
				</div>
			</div>

			<Button
				type="submit"
				disabled={$submitting}
				class={`h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
					submitted
						? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
						: $submitting
							? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
							: 'bg-primary hover:bg-primary/90 disabled:opacity-50'
				}`}
			>
				{#if $submitting}
					<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
					Sauvegarde...
			{:else if submitted}
				<Check class="mr-2 h-5 w-5" />
				Sauvegardé !
				{:else}
					Sauvegarder la personnalisation
				{/if}
			</Button>
		</form>
	</CardContent>
</Card>