<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Plus, Edit, Trash2, X, Check } from 'lucide-svelte';
	// import { createEventDispatcher } from 'svelte';
	import FaqForm from './faq-form.svelte';
	import { writable } from 'svelte/store';

	// Données de la page
	$: ({ faqs, form } = $page.data);

	// Store local pour les FAQ (permet la mise à jour de l'interface)
	const localFaqs = writable(faqs || []);

	// Synchroniser le store local avec les données de la page
	$: if (faqs) {
		localFaqs.set(faqs);
	}

	// État local
	let showCreateForm = false;
	let editingFaq: string | null = null;

	// État pour la confirmation de suppression
	let confirmingDeleteId: string | null = null;

	// const dispatch = createEventDispatcher();

	// Fonctions
	function startCreate() {
		showCreateForm = true;
	}

	function cancelCreate() {
		showCreateForm = false;
	}

	function startEdit(faq: { id: string; question: string; answer: string }) {
		editingFaq = faq.id;
	}

	function cancelEdit() {
		editingFaq = null;
	}

	function startDeleteConfirmation(id: string) {
		confirmingDeleteId = id;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteId = null;
	}

	// Fonction de suppression avec enhance
	async function handleDelete(faqId: string) {
		const formData = new FormData();
		formData.append('id', faqId);

		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData,
			});

			if (response.ok) {
				// Supprimer la FAQ de la liste locale
				localFaqs.update((faqs) => faqs.filter((faq) => faq.id !== faqId));
				// Fermer la confirmation
				confirmingDeleteId = null;
			} else {
				console.error('Erreur lors de la suppression');
			}
		} catch (error) {
			console.error('Erreur lors de la suppression:', error);
		}
	}
</script>

<svelte:head>
	<title>FAQ - Dashboard</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête -->
	<div
		class="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0"
	>
		<div>
			<h1 class="text-3xl font-bold">FAQ</h1>
			<p class="text-muted-foreground">
				Gérez les questions fréquemment posées de votre boutique
			</p>
		</div>
		<Button on:click={startCreate} class="flex items-center gap-2">
			<Plus class="h-4 w-4" />
			Ajouter une FAQ
		</Button>
	</div>

	<Separator />

	<!-- Formulaire de création -->
	{#if showCreateForm}
		<Card>
			<CardHeader>
				<CardTitle>Nouvelle FAQ</CardTitle>
				<CardDescription>
					Ajoutez une nouvelle question et sa réponse
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FaqForm data={form} onCancel={cancelCreate} />
			</CardContent>
		</Card>
	{/if}

	<!-- Liste des FAQ -->
	<div class="space-y-4">
		{#if $localFaqs.length === 0}
			<Card>
				<CardContent class="flex flex-col items-center justify-center py-12">
					<div class="text-center">
						<h3 class="mb-2 text-lg font-semibold">Aucune FAQ</h3>
						<p class="mb-4 text-muted-foreground">
							Commencez par ajouter votre première question fréquemment posée
						</p>
						<Button on:click={startCreate}>
							<Plus class="mr-2 h-4 w-4" />
							Ajouter une FAQ
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else}
			{#each $localFaqs as faq}
				<Card>
					<CardContent class="p-6">
						{#if editingFaq === faq.id}
							<!-- Mode édition -->
							<FaqForm
								data={form}
								faqId={faq.id}
								initialData={{ question: faq.question, answer: faq.answer }}
								onCancel={cancelEdit}
							/>
						{:else}
							<!-- Mode affichage -->
							<div class="space-y-4">
								<div
									class="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0"
								>
									<div class="flex-1">
										<h3 class="mb-2 text-lg font-semibold">{faq.question}</h3>
										<p class="whitespace-pre-wrap text-muted-foreground">
											{faq.answer}
										</p>
									</div>
									<div class="flex gap-2 sm:ml-4">
										<Button
											variant="outline"
											size="sm"
											on:click={() => startEdit(faq)}
										>
											<Edit class="h-4 w-4" />
										</Button>

										{#if confirmingDeleteId === faq.id}
											<Button
												type="button"
												variant="ghost"
												size="sm"
												class="bg-red-600 text-white hover:bg-red-700 hover:text-white"
												title="Confirmer la suppression"
												on:click={() => handleDelete(faq.id)}
											>
												<Check class="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												on:click={cancelDeleteConfirmation}
												title="Annuler la suppression"
											>
												<X class="h-4 w-4" />
											</Button>
										{:else}
											<Button
												type="button"
												variant="outline"
												size="sm"
												class="text-red-600 hover:bg-red-50 hover:text-red-700"
												on:click={() => startDeleteConfirmation(faq.id)}
												title="Supprimer la FAQ"
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>
			{/each}
		{/if}
	</div>
</div>
