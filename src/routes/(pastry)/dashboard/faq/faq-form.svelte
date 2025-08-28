<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Save, X } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { formSchema, type FormSchema } from './schema';

	export let data: SuperValidated<Infer<FormSchema>>;
	export let faqId: string | undefined = undefined; // Si défini = mode édition, sinon = mode création
	export let onCancel: () => void;
	export let initialData: { question: string; answer: string } | undefined =
		undefined; // Données initiales pour l'édition

	const form = superForm(data, {
		validators: zodClient(formSchema),
	});

	// Mettre à jour le formulaire avec les données initiales si fournies
	$: if (initialData && isEditMode) {
		form.form.set(initialData);
	}

	const { form: formData, enhance, submitting, message } = form;

	$: if ($message) {
		console.log('✅ succès -> fermeture du formulaire');
		onCancel();
	}

	// Détermine le texte du bouton et l'action
	$: isEditMode = !!faqId;
	$: buttonText = isEditMode ? 'Modifier' : 'Ajouter la question';
	$: action = isEditMode ? '?/update' : '?/create';
</script>

<form method="POST" {action} use:enhance>
	{#if isEditMode}
		<input type="hidden" name="id" value={faqId} />
	{/if}

	<Form.Errors {form} />

	<div class="space-y-4">
		<Form.Field {form} name="question">
			<Form.Control let:attrs>
				<Form.Label>Question *</Form.Label>
				<Input
					{...attrs}
					placeholder="Votre question..."
					required
					bind:value={$formData.question}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="answer">
			<Form.Control let:attrs>
				<Form.Label>Réponse *</Form.Label>
				<Textarea
					{...attrs}
					placeholder="Votre réponse..."
					rows={4}
					required
					bind:value={$formData.answer}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="flex gap-2">
			<Button
				type="submit"
				disabled={$submitting || !$formData.question || !$formData.answer}
			>
				<Save class="mr-2 h-4 w-4" />
				{buttonText}
			</Button>
			<Button type="button" variant="outline" on:click={onCancel}>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
		</div>
	</div>
</form>
