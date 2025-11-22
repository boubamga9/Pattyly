<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Upload, X } from 'lucide-svelte';

	export let type: 'product' | 'logo' = 'product';
	export let currentImageUrl: string | null = null;
	export let disabled = false;
	export let className = '';

	const dispatch = createEventDispatcher<{
		imageSelected: File;
		imageRemoved: void;
	}>();

	let imageFile: File | null = null;
	let imagePreview: string | null = currentImageUrl;
	let errorMessage = '';

	// Validation basique
	function validateFile(file: File): { valid: boolean; error?: string } {
		// Vérifier que c'est une image
		if (!file.type.startsWith('image/')) {
			return { valid: false, error: 'Le fichier doit être une image' };
		}

		// Vérifier la taille selon le type
		const maxSize = type === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB pour logo, 10MB pour produit
		if (file.size > maxSize) {
			return {
				valid: false,
				error: `L'image ne doit pas dépasser ${type === 'logo' ? '5MB' : '10MB'}`
			};
		}

		return { valid: true };
	}

	// Gestionnaire de sélection de fichier
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Validation basique
		const validation = validateFile(file);
		if (!validation.valid) {
			errorMessage = validation.error || 'Fichier invalide';
			return;
		}

		errorMessage = '';

		// Créer une URL de prévisualisation
		const previewUrl = URL.createObjectURL(file);

		// Mettre à jour l'état
		imageFile = file;
		imagePreview = previewUrl;

		// Émettre l'événement avec le fichier original (Cloudinary gère la compression)
		dispatch('imageSelected', file);

		// Réinitialiser l'input
		target.value = '';
	}

	// Supprimer l'image
	function removeImage() {
		// Nettoyer l'URL de prévisualisation
		if (imagePreview && imagePreview !== currentImageUrl && imagePreview.startsWith('blob:')) {
			URL.revokeObjectURL(imagePreview);
		}

		imageFile = null;
		imagePreview = currentImageUrl;
		errorMessage = '';

		dispatch('imageRemoved');
	}

	// Nettoyer les ressources au démontage
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		if (imagePreview && imagePreview !== currentImageUrl && imagePreview.startsWith('blob:')) {
			URL.revokeObjectURL(imagePreview);
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
				<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
				<p class="text-center text-xs text-muted-foreground">
					Cliquez pour sélectionner une image
				</p>
				<p class="text-center text-xs text-muted-foreground">
					{type === 'logo' ? 'Max 5MB' : 'Max 10MB'}
				</p>
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
		disabled={disabled}
	/>

	<!-- Bouton de sélection (si pas d'image) -->
	{#if !imagePreview}
		<div class="flex justify-center">
			<Button
				type="button"
				variant="outline"
				on:click={() =>
					document.getElementById(`image-upload-${type}`)?.click()}
				disabled={disabled}
			>
				<Upload class="mr-2 h-4 w-4" />
				Sélectionner une image
			</Button>
		</div>
	{/if}
</div>
