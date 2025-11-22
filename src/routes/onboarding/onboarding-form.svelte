<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	//import { Button } from '$lib/components/ui/button';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { Upload, X } from 'lucide-svelte';
	import { shopCreationSchema, type FormSchema } from './schema';
	import { createEventDispatcher } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	export let data: SuperValidated<Infer<FormSchema>>;
	const dispatch = createEventDispatcher();

	const form = superForm(data, {
		validators: zodClient(shopCreationSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	let logoPreview: string | null = null;
	let logoInputElement: HTMLInputElement;
	let logoError: string | null = null; // Pour afficher les erreurs de validation côté client

	$: if (message) {
		dispatch('message', message);
	}

	// Handle file selection (Cloudinary gère la compression automatiquement)
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Reset error
		logoError = null;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			logoError = 'Veuillez sélectionner une image valide';
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			logoError = "L'image ne doit pas dépasser 5MB";
			return;
		}

		// Utiliser le fichier original (Cloudinary compresse automatiquement)
		$formData.logo = file;

		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			logoPreview = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	// Remove logo
	function removeLogo() {
		logoPreview = null;
		$formData.logo = undefined;
		logoError = null; // Reset error when removing logo
	}
</script>

<form
	method="POST"
	action="?/createShop"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success' && result.data?.success) {
				// Recharger la page pour que le serveur détecte le changement d'état
				await invalidateAll();
			}
		};
	}}
	enctype="multipart/form-data"
	class="space-y-6"
>
	<Form.Errors {form} />

	<div>
		<Label for="logo">Logo</Label>

		{#if logoPreview}
			<!-- Logo preview -->
			<div class="mb-4 flex justify-center">
				<div class="relative">
					<img
						src={logoPreview}
						alt="Aperçu du logo"
						class="h-32 w-32 rounded-lg border-2 border-border object-cover"
					/>
					<button
						type="button"
						on:click={removeLogo}
						class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			</div>
		{:else}
			<!-- File upload area -->
			<div class="mb-4 flex justify-center">
				<button
					type="button"
					class="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary"
					on:click={() => document.getElementById('logo')?.click()}
					on:keydown={(e) =>
						e.key === 'Enter' && document.getElementById('logo')?.click()}
					aria-label="Sélectionner un logo"
				>
					<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
					<p class="text-center text-xs text-muted-foreground">
						Cliquez pour sélectionner votre logo
					</p>
				</button>
			</div>
		{/if}

		<input
			id="logo"
			name="logo"
			type="file"
			accept="image/*"
			on:change={handleFileSelect}
			class="hidden"
			disabled={$submitting}
			bind:this={logoInputElement}
		/>

		<!-- Affichage des erreurs de validation côté client -->
		{#if logoError}
			<div class="mt-2 text-sm text-destructive">
				{logoError}
			</div>
		{/if}
	</div>

	<Form.Field {form} name="name">
		<Form.Control let:attrs>
			<Form.Label>Nom de votre boutique</Form.Label>
			<Input
				{...attrs}
				type="text"
				placeholder="Ex: Pâtisserie du Bonheur"
				required
				bind:value={$formData.name}
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="slug">
		<Form.Control let:attrs>
			<Form.Label>URL de votre boutique</Form.Label>
			<div class="flex items-center space-x-2">
				<span class="text-sm text-muted-foreground">pattyly.com/</span>
				<Input
					{...attrs}
					type="text"
					placeholder="ma-boutique"
					required
					bind:value={$formData.slug}
				/>
			</div>
		</Form.Control>
		<Form.FieldErrors />
		<Form.Description
			>Cette URL sera utilisée pour accéder à votre boutique en ligne</Form.Description
		>
	</Form.Field>

	<Form.Field {form} name="bio">
		<Form.Control let:attrs>
			<Form.Label>Description de votre boutique</Form.Label>
			<Textarea
				{...attrs}
				placeholder="Parlez-nous de votre passion pour la pâtisserie..."
				bind:value={$formData.bio}
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Section Réseaux sociaux -->
	<div class="space-y-4">
		<div class="space-y-2">
			<h3 class="text-lg font-semibold text-foreground">Réseaux sociaux</h3>
			<p class="text-sm text-muted-foreground">
				Connectez vos réseaux sociaux pour augmenter votre visibilité
			</p>
		</div>

		<div class="space-y-4">
			<Form.Field {form} name="instagram">
				<Form.Control let:attrs>
					<Form.Label>Instagram (optionnel)</Form.Label>
					<Input
						{...attrs}
						placeholder="@votre_compte"
						bind:value={$formData.instagram}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="tiktok">
				<Form.Control let:attrs>
					<Form.Label>TikTok (optionnel)</Form.Label>
					<Input
						{...attrs}
						placeholder="@votre_compte"
						bind:value={$formData.tiktok}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="website">
				<Form.Control let:attrs>
					<Form.Label>Site internet (optionnel)</Form.Label>
					<Input
						{...attrs}
						placeholder="https://votre-site.com"
						type="url"
						bind:value={$formData.website}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	</div>

	<Form.Button type="submit" class="w-full" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Création de la boutique...
		{:else}
			Créer ma boutique
		{/if}
	</Form.Button>
</form>
