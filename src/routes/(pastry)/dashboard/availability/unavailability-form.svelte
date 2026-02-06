<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X, LoaderCircle, Check } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import {
		addUnavailabilityFormSchema,
		addSlotUnavailabilityFormSchema,
		type AddUnavailabilityForm,
		type AddSlotUnavailabilityForm,
	} from './schema';

	export let data: SuperValidated<Infer<AddUnavailabilityForm>>;
	export let slotUnavailabilityFormData: SuperValidated<Infer<AddSlotUnavailabilityForm>>;
	export let onCancel: () => void;
	export let today: string;

	type UnavailabilityType = 'full_days' | 'slots';
	let unavailabilityType: UnavailabilityType = 'full_days';

	const form = superForm(data, {
		validators: zodClient(addUnavailabilityFormSchema),
	});
	const slotForm = superForm(slotUnavailabilityFormData, {
		validators: zodClient(addSlotUnavailabilityFormSchema),
	});

	const { form: formData, enhance, submitting, message } = form;
	const {
		form: slotFormData,
		enhance: enhanceSlot,
		submitting: submittingSlot,
		message: messageSlot,
	} = slotForm;

	let submitted = false;

	$: if ($message || $messageSlot) {
		submitted = true;
		invalidateAll();
		setTimeout(() => {
			submitted = false;
			onCancel();
		}, 2000);
	}

	function isDateUnavailable(
		date: string,
		unavailabilities: Array<{ start_date: string; end_date: string }>,
	) {
		if (!date || !unavailabilities) return false;
		const checkDate = new Date(date);
		return unavailabilities.some((u) => {
			const start = new Date(u.start_date);
			const end = new Date(u.end_date);
			return checkDate >= start && checkDate <= end;
		});
	}
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-2">
		<span class="text-sm font-medium">Type d'indisponibilité</span>
		<div class="flex gap-4">
			<label class="flex cursor-pointer items-center gap-2">
				<input
					type="radio"
					name="unavailabilityType"
					value="full_days"
					bind:group={unavailabilityType}
					class="h-4 w-4"
				/>
				<span class="text-sm">Jour(s) entier(s)</span>
			</label>
			<label class="flex cursor-pointer items-center gap-2">
				<input
					type="radio"
					name="unavailabilityType"
					value="slots"
					bind:group={unavailabilityType}
					class="h-4 w-4"
				/>
				<span class="text-sm">Créneaux (un jour précis)</span>
			</label>
		</div>
	</div>

	{#if unavailabilityType === 'full_days'}
		<form method="POST" action="?/addUnavailability" use:enhance>
			{#if $page.data.shopId}
				<input type="hidden" name="shopId" value={$page.data.shopId} />
			{/if}
			<Form.Errors {form} />
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Form.Field {form} name="startDate">
						<Form.Control let:attrs>
							<Form.Label>Date de début</Form.Label>
							<Input
								{...attrs}
								type="date"
								min={today}
								required
								bind:value={$formData.startDate}
								class={isDateUnavailable($formData.startDate, []) ? 'border-red-500' : ''}
								title={isDateUnavailable($formData.startDate, []) ? 'Cette date est déjà indisponible' : ''}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="endDate">
						<Form.Control let:attrs>
							<Form.Label>Date de fin</Form.Label>
							<Input
								{...attrs}
								type="date"
								min={$formData.startDate || today}
								required
								bind:value={$formData.endDate}
								class={isDateUnavailable($formData.endDate, []) ? 'border-red-500' : ''}
								title={isDateUnavailable($formData.endDate, []) ? 'Cette date est déjà indisponible' : ''}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
					<Button
						type="submit"
						disabled={$submitting || !$formData.startDate || !$formData.endDate}
						class="h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed sm:w-auto {submitted
							? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
							: $submitting
								? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
								: $formData.startDate && $formData.endDate
									? 'bg-primary hover:bg-primary/90 disabled:opacity-50'
									: 'bg-gray-500 disabled:opacity-50'}"
					>
						{#if $submitting}
							<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
							Ajout...
						{:else if submitted}
							<Check class="mr-2 h-5 w-5" />
							Ajouté !
						{:else}
							<Plus class="mr-2 h-5 w-5" />
							Ajouter une indisponibilité
						{/if}
					</Button>
					<Button type="button" variant="outline" on:click={onCancel} class="h-10 w-full sm:w-auto">
						<X class="mr-2 h-4 w-4" />
						Annuler
					</Button>
				</div>
			</div>
		</form>
	{:else}
		<form method="POST" action="?/addSlotUnavailability" use:enhanceSlot>
			{#if $page.data.shopId}
				<input type="hidden" name="shopId" value={$page.data.shopId} />
			{/if}
			<Form.Errors form={slotForm} />
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Form.Field form={slotForm} name="date">
						<Form.Control let:attrs>
							<Form.Label>Date</Form.Label>
							<Input
								{...attrs}
								type="date"
								min={today}
								required
								bind:value={$slotFormData.date}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={slotForm} name="startTime">
						<Form.Control let:attrs>
							<Form.Label>Heure de début</Form.Label>
							<Input
								{...attrs}
								type="time"
								required
								bind:value={$slotFormData.startTime}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={slotForm} name="endTime">
						<Form.Control let:attrs>
							<Form.Label>Heure de fin</Form.Label>
							<Input
								{...attrs}
								type="time"
								required
								bind:value={$slotFormData.endTime}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<div class="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
					<Button
						type="submit"
						disabled={$submittingSlot || !$slotFormData.date || !$slotFormData.startTime || !$slotFormData.endTime}
						class="h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed sm:w-auto {submitted
							? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
							: $submittingSlot
								? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
								: $slotFormData.date && $slotFormData.startTime && $slotFormData.endTime
									? 'bg-primary hover:bg-primary/90 disabled:opacity-50'
									: 'bg-gray-500 disabled:opacity-50'}"
					>
						{#if $submittingSlot}
							<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
							Ajout...
						{:else if submitted}
							<Check class="mr-2 h-5 w-5" />
							Ajouté !
						{:else}
							<Plus class="mr-2 h-5 w-5" />
							Ajouter une indisponibilité
						{/if}
					</Button>
					<Button type="button" variant="outline" on:click={onCancel} class="h-10 w-full sm:w-auto">
						<X class="mr-2 h-4 w-4" />
						Annuler
					</Button>
				</div>
			</div>
		</form>
	{/if}
</div>
