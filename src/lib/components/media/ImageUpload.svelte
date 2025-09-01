<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Upload, X, LoaderCircle } from 'lucide-svelte';
	import {
		ImageService,
		type ProcessedImage,
	} from '$lib/utils/images/image-service';

	export let type: 'product' | 'logo' = 'product';
	export let currentImageUrl: string | null = null;
	export let disabled = false;
	export let className = '';

	const dispatch = createEventDispatcher<{
		imageSelected: ProcessedImage;
		imageRemoved: void;
	}>();

	let imageFile: File | null = null;
	let imagePreview: string | null = currentImageUrl;
	let isProcessing = false;
	let errorMessage = '';

	// Gestionnaire de sélection de fichier
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Valider le fichier
		const validation = ImageService.validateImage(file, type);
		if (!validation.valid) {
			errorMessage = validation.error || 'Fichier invalide';
			return;
		}

		try {
			isProcessing = true;
			errorMessage = '';

			// Traiter l'image
			const processedImage = await ImageService.processImage(file, type);

			// Mettre à jour l'état
			imageFile = processedImage.file;
			imagePreview = processedImage.url;

			// Émettre l'événement
			dispatch('imageSelected', processedImage);
		} catch (error) {
			errorMessage = "Erreur lors du traitement de l'image";
		} finally {
			isProcessing = false;
		}

		// Réinitialiser l'input
		target.value = '';
	}

	// Supprimer l'image
	function removeImage() {
		// Nettoyer l'ancienne URL de prévisualisation
		if (imagePreview && imagePreview !== currentImageUrl) {
			ImageService.cleanupPreviewUrl(imagePreview);
		}

		imageFile = null;
		imagePreview = currentImageUrl;
		errorMessage = '';

		dispatch('imageRemoved');
	}

	// Nettoyer les ressources au démontage
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (imagePreview && imagePreview !== currentImageUrl) {
			ImageService.cleanupPreviewUrl(imagePreview);
		}
	});

	// Mettre à jour la prévisualisation si l'URL change
	$: if (currentImageUrl !== imagePreview && !imageFile) {
		imagePreview = currentImageUrl;
	}
</script>

<div class="space-y-4 {className}">
	<!-- Aperçu de l'image -->
	{#if imagePreview}
		<div class="flex justify-center">
			<div class="relative">
				<img
					src={imagePreview}
					alt="Aperçu de l'image"
					class="rounded-lg border-2 border-border object-cover {type === 'logo'
						? 'h-32 w-32'
						: 'h-48 w-48'}"
				/>
				<button
					type="button"
					on:click={removeImage}
					{disabled}
					class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>
	{:else}
		<!-- Zone d'upload -->
		<div class="flex justify-center">
			<div
				class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary {type ===
				'logo'
					? 'h-32 w-32'
					: 'h-48 w-48'}"
				on:click={() =>
					document.getElementById(`image-upload-${type}`)?.click()}
			>
				{#if isProcessing}
					<LoaderCircle
						class="mb-2 h-8 w-8 animate-spin text-muted-foreground"
					/>
					<p class="text-center text-xs text-muted-foreground">
						Traitement en cours...
					</p>
				{:else}
					<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
					<p class="text-center text-xs text-muted-foreground">
						Cliquez pour sélectionner une image
					</p>
					<p class="text-center text-xs text-muted-foreground">
						{type === 'logo' ? '400×400px max' : '800×800px max'}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Message d'erreur -->
	{#if errorMessage}
		<p class="text-center text-sm text-destructive">{errorMessage}</p>
	{/if}

	<!-- Input file caché -->
	<input
		id="image-upload-{type}"
		name="image"
		type="file"
		accept="image/*"
		on:change={handleFileSelect}
		class="hidden"
		disabled={disabled || isProcessing}
	/>

	<!-- Bouton de sélection (si pas d'image) -->
	{#if !imagePreview}
		<div class="flex justify-center">
			<Button
				type="button"
				variant="outline"
				on:click={() =>
					document.getElementById(`image-upload-${type}`)?.click()}
				disabled={disabled || isProcessing}
			>
				<Upload class="mr-2 h-4 w-4" />
				Sélectionner une image
			</Button>
		</div>
	{/if}
</div>
