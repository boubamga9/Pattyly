<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { Upload, X, Copy } from 'lucide-svelte';
	import { formSchema, type FormSchema } from './schema';
	import { createEventDispatcher } from 'svelte';

	export let data: SuperValidated<Infer<FormSchema>>;
	const dispatch = createEventDispatcher();

	const form = superForm(data, {
		validators: zodClient(formSchema),
	});

	const { form: formData, enhance, submitting } = form;

	let logoFile: File | null = null;
	let logoPreview: string | null = $formData.logo_url || null;

	// Handle file selection
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				// Handle error through form
				return;
			}

			// Validate file size (1MB)
			if (file.size > 1 * 1024 * 1024) {
				// Handle error through form
				return;
			}

			logoFile = file;
			$formData.logo = file;

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				logoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	// Remove logo
	function removeLogo() {
		logoFile = null;
		logoPreview = null;
		$formData.logo = undefined;
	}

	// Copy shop URL to clipboard
	async function copyShopUrl() {
		const fullUrl = `https://pattyly.com/${$formData.slug}`;
		try {
			await navigator.clipboard.writeText(fullUrl);
			// You can add a success message here if needed
		} catch (err) {
			console.error('Error copying URL:', err);
		}
	}
</script>

<form
	method="POST"
	action="?/updateShop"
	use:enhance
	enctype="multipart/form-data"
	class="space-y-6"
>
	<Form.Errors {form} />
	<div>
		<Label for="logo">Logo de la boutique</Label>

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
				<div
					class="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary"
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
		/>
		<input type="hidden" name="logo_url" value={logoPreview || ''} />
	</div>

	<Form.Field {form} name="name">
		<Form.Control let:attrs>
			<Form.Label>Nom de la boutique</Form.Label>
			<Input
				{...attrs}
				type="text"
				placeholder="Ma Pâtisserie"
				required
				bind:value={$formData.name}
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="slug">
		<Form.Control let:attrs>
			<Form.Label>URL de la boutique</Form.Label>
			<div class="flex items-center space-x-2">
				<span class="text-sm text-muted-foreground">pattyly.com/</span>
				<Input
					{...attrs}
					type="text"
					placeholder="ma-patisserie"
					required
					bind:value={$formData.slug}
					class="flex-1"
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					on:click={copyShopUrl}
					title="Copier l'URL complète"
					disabled={!$formData.slug}
				>
					<Copy class="h-4 w-4" />
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
				placeholder="Décrivez votre boutique, vos spécialités..."
				rows={4}
				bind:value={$formData.bio}
			/>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Separator />

	<!-- Social Media -->
	<div class="space-y-4">
		<h4 class="text-lg font-medium text-foreground">Réseaux sociaux</h4>

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

	<Form.Button type="submit" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Mise à jour...
		{:else}
			Mettre à jour la boutique
		{/if}
	</Form.Button>
</form>
