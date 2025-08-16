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
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { Upload, X } from 'lucide-svelte';
	import { formSchema, type FormSchema } from './schema';
	import { createEventDispatcher } from 'svelte';

	export let data: SuperValidated<Infer<FormSchema>>;
	const dispatch = createEventDispatcher();

	const form = superForm(data, {
		validators: zodClient(formSchema),
	});

	const { form: formData, enhance, submitting } = form;

	let logoFile: File | null = null;
	let logoPreview: string | null = null;

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
</script>

<form
	method="POST"
	action="?/createShop"
	use:enhance
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

	<Form.Button type="submit" class="w-full" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Création de la boutique...
		{:else}
			Créer ma boutique
		{/if}
	</Form.Button>
</form>
