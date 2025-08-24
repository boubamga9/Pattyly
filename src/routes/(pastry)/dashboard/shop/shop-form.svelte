<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';

	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';

	import { Upload, X, Copy, CheckCircle, LoaderCircle } from 'lucide-svelte';
	import { formSchema, type FormSchema } from './schema';
	import { createEventDispatcher, tick } from 'svelte';
	import {
		compressLogo,
		formatCompressionInfo,
	} from '$lib/utils/image-compression';

	export let data: SuperValidated<Infer<FormSchema>>;
	const _dispatch = createEventDispatcher();

	const form = superForm(data, {
		validators: zodClient(formSchema),
	});

	const { form: formData, enhance, submitting } = form;

	let _logoFile: File | null = null;
	let logoPreview: string | null = $formData.logo_url || null;
	let copySuccess = false;
	let logoInputElement: HTMLInputElement;
	let submitted = false;
	let compressionInfo: string | null = null;
	let isCompressing = false;

	// Handle file selection with compression
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		try {
			isCompressing = true;
			compressionInfo = null;

			// Validate file type
			if (!file.type.startsWith('image/')) {
				console.error('Veuillez sélectionner une image');
				return;
			}

			// Validate file size before compression (max 5MB pour éviter les abus)
			if (file.size > 5 * 1024 * 1024) {
				console.error("L'image ne doit pas dépasser 5MB");
				return;
			}

			// Compresser et redimensionner le logo
			const compressionResult = await compressLogo(file);

			// Utiliser l'image compressée
			_logoFile = compressionResult.file;
			$formData.logo = compressionResult.file;
			compressionInfo = formatCompressionInfo(compressionResult);

			// 🔄 Synchroniser l'input file avec l'image compressée
			// Créer un nouveau FileList avec l'image compressée
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(compressionResult.file);
			logoInputElement.files = dataTransfer.files;

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				logoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(compressionResult.file);
		} catch (error) {
			console.error('Erreur lors de la compression:', error);
		} finally {
			isCompressing = false;
		}
	}

	function removeLogo() {
		_logoFile = null;
		logoPreview = null;
		$formData.logo = undefined;
		compressionInfo = null;
	}

	async function copyShopUrl() {
		const fullUrl = `https://pattyly.com/${$formData.slug}`;
		try {
			await navigator.clipboard.writeText(fullUrl);
			copySuccess = true;
			// Reset after 2 seconds
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Error copying URL:', err);
		}
	}

	async function handleSubmit() {
		submitted = true;
		await tick();
		setTimeout(() => (submitted = false), 2000);
	}
</script>

<form
	method="POST"
	action="?/updateShop"
	use:enhance
	enctype="multipart/form-data"
	class="space-y-8"
	on:submit|preventDefault={handleSubmit}
>
	<Form.Errors {form} />

	<!-- Section Logo -->
	<div class="space-y-6">
		<div class="space-y-3">
			<Label for="logo" class="text-base font-medium">Logo de la boutique</Label
			>
			<p class="text-sm text-muted-foreground">
				Ajoutez un logo pour personnaliser votre boutique
			</p>
		</div>

		{#if logoPreview}
			<div class="flex justify-center">
				<div class="relative">
					<img
						src={logoPreview}
						alt="Aperçu du logo"
						class="h-32 w-32 rounded-lg border-2 border-border object-cover shadow-sm"
					/>
					<button
						type="button"
						on:click={removeLogo}
						class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			</div>
		{:else}
			<div class="flex justify-center">
				<div
					class="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary hover:bg-muted/50"
					on:click={() => document.getElementById('logo')?.click()}
				>
					<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
					<p class="text-center text-xs text-muted-foreground">
						Cliquez pour sélectionner votre logo
					</p>
				</div>
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
		<input type="hidden" name="logo_url" value={logoPreview || ''} />

		{#if compressionInfo}
			<div class="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
				{compressionInfo}
			</div>
		{/if}
	</div>

	<!-- Section Informations de base -->
	<div class="space-y-6">
		<div class="space-y-3">
			<h3 class="text-lg font-semibold text-foreground">
				Informations de base
			</h3>
			<p class="text-sm text-muted-foreground">
				Configurez les informations essentielles de votre boutique
			</p>
		</div>

		<div class="space-y-5">
			<Form.Field {form} name="name">
				<Form.Control let:attrs>
					<Form.Label>Nom de la boutique</Form.Label>
					<Input
						{...attrs}
						type="text"
						placeholder="Ma Pâtisserie"
						required
						bind:value={$formData.name}
						class="h-11"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="slug">
				<Form.Control let:attrs>
					<Form.Label>URL de la boutique</Form.Label>
					<div class="flex items-center space-x-3">
						<span class="text-sm font-medium text-muted-foreground"
							>pattyly.com/</span
						>
						<Input
							{...attrs}
							type="text"
							placeholder="ma-patisserie"
							required
							bind:value={$formData.slug}
							class="h-11 flex-1"
						/>
						<Button
							type="button"
							size="sm"
							on:click={copyShopUrl}
							title="Copier l'URL complète"
							disabled={!$formData.slug}
							class={`h-11 px-4 ${
								copySuccess
									? 'border-green-300 bg-green-100 text-green-700 hover:border-green-400 hover:bg-green-200'
									: 'border border-input bg-background text-black hover:bg-accent hover:text-accent-foreground'
							}`}
						>
							{#if copySuccess}
								<CheckCircle class="mr-2 h-4 w-4" />
								Copiée
							{:else}
								<Copy class="mr-2 h-4 w-4" />
								Copier
							{/if}
						</Button>
					</div>
				</Form.Control>
				<Form.FieldErrors />
				<Form.Description>L'URL de votre boutique publique</Form.Description>
			</Form.Field>

			<Form.Field {form} name="bio">
				<Form.Control let:attrs>
					<Form.Label>Description (optionnel)</Form.Label>
					<Textarea
						{...attrs}
						placeholder="Décrivez votre boutique, vos spécialités, votre histoire..."
						rows={4}
						bind:value={$formData.bio}
						class="resize-none"
					/>
				</Form.Control>
				<Form.FieldErrors />
				<Form.Description>
					Une description attrayante aide les clients à mieux comprendre votre
					boutique
				</Form.Description>
			</Form.Field>
		</div>
	</div>

	<!-- Section Réseaux sociaux -->
	<div class="space-y-6">
		<div class="space-y-3">
			<h3 class="text-lg font-semibold text-foreground">Réseaux sociaux</h3>
			<p class="text-sm text-muted-foreground">
				Connectez vos réseaux sociaux pour augmenter votre visibilité
			</p>
		</div>

		<div class="space-y-5">
			<Form.Field {form} name="instagram">
				<Form.Control let:attrs>
					<Form.Label>Instagram (optionnel)</Form.Label>
					<Input
						{...attrs}
						placeholder="@votre_compte"
						bind:value={$formData.instagram}
						class="h-11"
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
						class="h-11"
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
						class="h-11"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	</div>

	<!-- Bouton de soumission -->
	<div class="pt-4">
		<Button
			type="submit"
			disabled={$submitting || !($formData.name && $formData.slug)}
			class={`h-11 w-full text-sm font-medium transition-all duration-200 ${
				$submitting
					? 'cursor-not-allowed bg-gray-300'
					: submitted
						? 'bg-green-700 hover:bg-green-800'
						: $formData.name && $formData.slug
							? 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md'
							: 'cursor-not-allowed bg-gray-500 opacity-60'
			}`}
		>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
				Mise à jour...
			{:else if submitted}
				<CheckCircle class="mr-2 h-5 w-5" />
				Mis à jour
			{:else if !($formData.name && $formData.slug)}
				Remplissez tous les champs requis
			{:else}
				Mettre à jour la boutique
			{/if}
		</Button>
	</div>
</form>
