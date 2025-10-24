<script lang="ts" context="module">
	export type FieldType =
		| 'short-text'
		| 'long-text'
		| 'number'
		| 'single-select'
		| 'multi-select';

	export interface CustomizationField {
		id: string;
		label: string;
		type: FieldType;
		required: boolean;
		options: Array<{ label: string; price: number }>;
	}

	export interface CustomizationFormBuilderProps {
		fields: CustomizationField[];
		title?: string;
		description?: string;
		containerClass?: string;
		showDragHandle?: boolean;
		isCustomForm?: boolean;
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Plus, Trash2, GripVertical } from 'lucide-svelte';
	import Sortable from 'sortablejs';

	// Props
	export let fields: CustomizationField[];
	export let title = 'Personnalisation du gâteau';
	export let description =
		'Ajoutez des questions que vos clients devront remplir pour personnaliser leur commande';
	export let containerClass = 'custom-fields-container';
	export let showDragHandle = true;
	export let isCustomForm = false;

	// Events
	const dispatch = createEventDispatcher<{
		fieldsChange: CustomizationField[];
	}>();

	// Types de champs disponibles
	const fieldTypes = [
		{ value: 'short-text', label: 'Réponse courte' },
		{ value: 'long-text', label: 'Réponse longue' },
		{ value: 'number', label: 'Nombre' },
		{ value: 'single-select', label: 'Choix unique' },
		{ value: 'multi-select', label: 'Choix multiples' },
	];

	// Fonctions de gestion des champs
	function addField() {
		const newFields = [
			...fields,
			{
				id: crypto.randomUUID(),
				label: '',
				type: 'short-text' as FieldType,
				required: false,
				options: [],
			},
		];
		dispatch('fieldsChange', newFields);
	}

	function removeField(fieldId: string) {
		const newFields = fields.filter((field) => field.id !== fieldId);
		dispatch('fieldsChange', newFields);
	}

	function updateField(fieldId: string, updates: Partial<CustomizationField>) {
		const newFields = fields.map((field) =>
			field.id === fieldId ? { ...field, ...updates } : field,
		);
		dispatch('fieldsChange', newFields);
	}

	function addOption(fieldId: string) {
		const newFields = fields.map((field) =>
			field.id === fieldId
				? { ...field, options: [...field.options, { label: '', price: 0 }] }
				: field,
		);
		dispatch('fieldsChange', newFields);
	}

	function removeOption(fieldId: string, optionIndex: number) {
		const newFields = fields.map((field) =>
			field.id === fieldId
				? {
						...field,
						options: field.options.filter((_, index) => index !== optionIndex),
					}
				: field,
		);
		dispatch('fieldsChange', newFields);
	}

	function updateOption(
		fieldId: string,
		optionIndex: number,
		updates: { label?: string; price?: number },
	) {
		const newFields = fields.map((field) =>
			field.id === fieldId
				? {
						...field,
						options: field.options.map((option, index) =>
							index === optionIndex ? { ...option, ...updates } : option,
						),
					}
				: field,
		);
		dispatch('fieldsChange', newFields);
	}

	function updateFieldType(fieldId: string, newType: string) {
		const validTypes: FieldType[] = [
			'short-text',
			'long-text',
			'number',
			'single-select',
			'multi-select',
		];
		if (validTypes.includes(newType as FieldType)) {
			const updates: Partial<CustomizationField> = {
				type: newType as FieldType,
			};

			// Si c'est un type de sélection, s'assurer qu'il y a des options
			if (newType === 'single-select' || newType === 'multi-select') {
				updates.options = [
					{ label: '', price: 0 },
					{ label: '', price: 0 },
				];
			}

			updateField(fieldId, updates);
		}
	}

	// Fonction pour initialiser le drag & drop
	function initializeSortable() {
		// Vérifier que document existe (côté client uniquement)
		if (typeof document === 'undefined') return;

		const container = document.querySelector(`.${containerClass}`);
		if (container && container instanceof HTMLElement && fields.length > 1) {
			Sortable.create(container, {
				animation: 150,
				ghostClass: 'sortable-ghost',
				chosenClass: 'sortable-chosen',
				dragClass: 'sortable-drag',
				handle: '.cursor-grab',
				preventOnFilter: false,
				filter: 'input, textarea, select, button, [contenteditable]',
				onEnd: function (evt) {
					const oldIndex = evt.oldIndex;
					const newIndex = evt.newIndex;

					if (
						typeof oldIndex === 'number' &&
						typeof newIndex === 'number' &&
						oldIndex !== newIndex
					) {
						const reorderedFields = [...fields];
						const [movedField] = reorderedFields.splice(oldIndex, 1);
						reorderedFields.splice(newIndex, 0, movedField);

						const updatedFields = reorderedFields.map((field, index) => ({
							...field,
							order: index + 1,
						}));
						dispatch('fieldsChange', updatedFields);
					}
				},
			});
		}
	}

	// Initialiser le drag & drop quand les champs changent
	$: if (fields.length > 1) {
		setTimeout(initializeSortable, 0);
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>{title}</CardTitle>
		<CardDescription>{description}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if fields.length === 0}
			<div class="py-8 text-center">
				<p class="mb-4 text-muted-foreground">
					Aucune question ajoutée pour le moment
				</p>
				<Button type="button" variant="outline" on:click={addField}>
					<Plus class="mr-2 h-4 w-4" />
					Ajouter une question
				</Button>
			</div>
		{:else}
			<div class="{containerClass} space-y-6">
				{#each fields as field, index (field.id)}
					<div class="space-y-4 rounded-lg border bg-gray-50 p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								{#if showDragHandle && fields.length > 1}
									<div class="cursor-grab active:cursor-grabbing">
										<GripVertical class="h-4 w-4 text-gray-400" />
									</div>
								{/if}
								<h4 class="font-medium">Question {index + 1}</h4>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								on:click={() => removeField(field.id)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>

						<!-- Label du champ -->
						<div>
							<label class="mb-2 block text-sm font-medium">
								Question à poser *
							</label>
							<input
								type="text"
								maxlength="100"
								value={field.label}
								on:input={(e) =>
									updateField(field.id, { label: e.currentTarget.value })}
								placeholder="Ex: Quelle couleur de glaçage souhaitez-vous ?"
								class="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 {field.label.trim() ===
								''
									? 'border-red-500 focus:ring-red-500'
									: 'border-gray-300'}"
							/>
							<div class="mt-1 text-xs text-gray-500">
								<span>{field.label.length}/100 caractères</span>
							</div>
							{#if field.label.trim() === ''}
								<p class="mt-1 text-sm text-red-600">
									⚠️ La question est obligatoire
								</p>
							{/if}
						</div>

						<!-- Type de champ -->
						<div>
							<label class="mb-2 block text-sm font-medium">
								Type de réponse attendue *
							</label>
							<select
								value={field.type}
								on:change={(e) =>
									updateFieldType(field.id, e.currentTarget.value)}
								class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{#each fieldTypes as type}
									<option value={type.value}>{type.label}</option>
								{/each}
							</select>
						</div>

						<!-- Champ obligatoire -->
						<div class="flex items-center space-x-2">
							<input
								type="checkbox"
								id={`required-${field.id}`}
								checked={field.required}
								on:change={(e) =>
									updateField(field.id, {
										required: e.currentTarget.checked,
									})}
								class="rounded border-gray-300"
							/>
							<label for={`required-${field.id}`} class="text-sm">
								Réponse obligatoire
							</label>
						</div>

						<!-- Options pour les champs de sélection -->
						{#if field.type === 'single-select' || field.type === 'multi-select'}
							<div class="space-y-3">
								<div class="space-y-2">
									<label class="text-sm font-medium">Choix proposés</label>
								</div>

								<div class="space-y-2">
									{#each field.options as option, optionIndex}
										<div
											class="flex flex-col gap-2 sm:flex-row sm:items-center"
										>
											<div class="flex-1">
												<input
													type="text"
													maxlength="50"
													value={option.label}
													on:input={(e) =>
														updateOption(field.id, optionIndex, {
															label: e.currentTarget.value,
														})}
													placeholder="Ex: Rouge, Blanc, Chocolat..."
													class="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 {option.label.trim() ===
													''
														? 'border-red-500 focus:ring-red-500'
														: 'border-gray-300'}"
												/>
												<div class="mt-1 text-xs text-gray-500">
													<span>{option.label.length}/50 caractères</span>
												</div>
												{#if option.label.trim() === ''}
													<p class="mt-1 text-xs text-red-600">
														⚠️ Le choix est obligatoire
													</p>
												{/if}
											</div>
											<div class="flex items-center gap-2">
												{#if !isCustomForm}
													<div class="flex items-center gap-1">
														<input
															type="number"
															value={option.price}
															on:input={(e) =>
																updateOption(field.id, optionIndex, {
																	price: parseFloat(e.currentTarget.value) || 0,
																})}
															placeholder="Prix"
															min="0"
															step="0.01"
															class="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
														/>
														<span class="text-sm text-muted-foreground">€</span>
													</div>
												{/if}
												<Button
													type="button"
													variant="ghost"
													size="sm"
													on:click={() => removeOption(field.id, optionIndex)}
													class="h-8 w-8 p-0"
												>
													<Trash2 class="h-3 w-3" />
												</Button>
											</div>
										</div>
									{/each}
								</div>

								<!-- Bouton pour ajouter une option (toujours visible) -->
								<Button
									type="button"
									variant="outline"
									size="sm"
									class={field.options.length < 2
										? 'border-red-500 text-red-600 hover:bg-red-50'
										: ''}
									on:click={() => addOption(field.id)}
								>
									<Plus class="mr-1 h-3 w-3" />
									Ajouter un choix
								</Button>

								{#if field.options.length < 2}
									<p class="text-sm text-red-600">
										⚠️ Il faut au moins 2 choix pour ce type de question
									</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}

				<!-- Bouton pour ajouter un nouveau champ -->
				<div class="pt-4">
					<Button type="button" variant="outline" on:click={addField}>
						<Plus class="mr-2 h-4 w-4" />
						Ajouter une question
					</Button>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>
