<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Plus, Edit, Trash2, Save, X, Check } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	// Données de la page
	$: ({ faqs } = $page.data);

	// État local
	let showCreateForm = false;
	let editingFaq: string | null = null;
	let newQuestion = '';
	let newAnswer = '';
	let editQuestion = '';
	let editAnswer = '';

	// État pour la confirmation de suppression
	let confirmingDeleteId: string | null = null;

	const dispatch = createEventDispatcher();

	// Fonctions
	function startCreate() {
		showCreateForm = true;
		newQuestion = '';
		newAnswer = '';
	}

	function cancelCreate() {
		showCreateForm = false;
		newQuestion = '';
		newAnswer = '';
	}

	function startEdit(faq: any) {
		editingFaq = faq.id;
		editQuestion = faq.question;
		editAnswer = faq.answer;
	}

	function cancelEdit() {
		editingFaq = null;
		editQuestion = '';
		editAnswer = '';
	}

	function startDeleteConfirmation(id: string) {
		confirmingDeleteId = id;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteId = null;
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
				<form method="POST" action="?/create" use:enhance>
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="question">Question *</Label>
							<Input
								id="question"
								name="question"
								bind:value={newQuestion}
								placeholder="Votre question..."
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="answer">Réponse *</Label>
							<Textarea
								id="answer"
								name="answer"
								bind:value={newAnswer}
								placeholder="Votre réponse..."
								rows={4}
								required
							/>
						</div>
						<div class="flex gap-2">
							<Button type="submit" disabled={!newQuestion || !newAnswer}>
								<Save class="mr-2 h-4 w-4" />
								Créer
							</Button>
							<Button type="button" variant="outline" on:click={cancelCreate}>
								<X class="mr-2 h-4 w-4" />
								Annuler
							</Button>
						</div>
					</div>
				</form>
			</CardContent>
		</Card>
	{/if}

	<!-- Liste des FAQ -->
	<div class="space-y-4">
		{#if faqs.length === 0}
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
			{#each faqs as faq}
				<Card>
					<CardContent class="p-6">
						{#if editingFaq === faq.id}
							<!-- Mode édition -->
							<form method="POST" action="?/update" use:enhance>
								<input type="hidden" name="id" value={faq.id} />
								<div class="space-y-4">
									<div class="space-y-2">
										<Label for="edit-question-{faq.id}">Question *</Label>
										<Input
											id="edit-question-{faq.id}"
											name="question"
											bind:value={editQuestion}
											placeholder="Votre question..."
											required
										/>
									</div>
									<div class="space-y-2">
										<Label for="edit-answer-{faq.id}">Réponse *</Label>
										<Textarea
											id="edit-answer-{faq.id}"
											name="answer"
											bind:value={editAnswer}
											placeholder="Votre réponse..."
											rows={4}
											required
										/>
									</div>
									<div class="flex gap-2">
										<Button
											type="submit"
											disabled={!editQuestion || !editAnswer}
										>
											<Save class="mr-2 h-4 w-4" />
											Sauvegarder
										</Button>
										<Button
											type="button"
											variant="outline"
											on:click={cancelEdit}
										>
											<X class="mr-2 h-4 w-4" />
											Annuler
										</Button>
									</div>
								</div>
							</form>
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
											<form
												method="POST"
												action="?/delete"
												use:enhance={() => {
													return async ({ result }) => {
														if (result.type === 'success') {
															confirmingDeleteId = null;
															window.location.reload();
														}
													};
												}}
											>
												<input type="hidden" name="id" value={faq.id} />
												<Button
													type="submit"
													variant="ghost"
													size="sm"
													class="bg-red-600 text-white hover:bg-red-700 hover:text-white"
													title="Confirmer la suppression"
												>
													<Check class="h-4 w-4" />
												</Button>
											</form>
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
