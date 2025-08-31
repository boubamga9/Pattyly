<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	export let selectedDate: Date | undefined = undefined;
	export let minDaysNotice: number = 0;
	export let availabilities: { day: number; is_open: boolean }[] = [];
	export let unavailabilities: { start_date: string; end_date: string }[] = [];

	const dispatch = createEventDispatcher<{
		dateSelected: Date;
	}>();

	// État du calendrier
	let currentMonth = new Date();
	let currentYear = new Date().getFullYear();

	// Variable locale pour la réactivité
	let localSelectedDate = selectedDate;

	// Synchroniser avec la prop
	$: localSelectedDate = selectedDate;

	// Calculer la date minimum
	$: minDate = (() => {
		const date = new Date();
		if (minDaysNotice > 0) {
			date.setDate(date.getDate() + minDaysNotice);
		}
		return date;
	})();

	// Noms des jours
	const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
	const monthNames = [
		'Janvier',
		'Février',
		'Mars',
		'Avril',
		'Mai',
		'Juin',
		'Juillet',
		'Août',
		'Septembre',
		'Octobre',
		'Novembre',
		'Décembre',
	];

	// Obtenir les jours du mois
	function getDaysInMonth(year: number, month: number) {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDay = firstDay.getDay();

		const days = [];

		// Ajouter les jours vides du début
		for (let i = 0; i < startingDay; i++) {
			days.push(null);
		}

		// Ajouter tous les jours du mois
		for (let day = 1; day <= daysInMonth; day++) {
			days.push(new Date(year, month, day));
		}

		return days;
	}

	// Vérifier si une date est disponible
	function isDateAvailable(date: Date): boolean {
		// Vérifier la date minimum
		if (date < minDate) {
			return false;
		}

		// Vérifier le jour de la semaine
		const dayOfWeek = date.getDay();
		const availability = availabilities.find((a) => a.day === dayOfWeek);
		if (!availability || !availability.is_open) {
			return false;
		}

		// Vérifier les indisponibilités
		for (const unavailability of unavailabilities) {
			const start = new Date(unavailability.start_date);
			const end = new Date(unavailability.end_date);

			// Normaliser les dates pour la comparaison (supprimer les heures)
			start.setHours(0, 0, 0, 0);
			end.setHours(0, 0, 0, 0);
			const dateNormalized = new Date(date);
			dateNormalized.setHours(0, 0, 0, 0);

			// Inclure start_date et end_date dans les jours indisponibles
			if (dateNormalized >= start && dateNormalized <= end) {
				return false;
			}
		}

		return true;
	}

	// Vérifier si une date est sélectionnée (réactive)
	$: isDateSelected = (date: Date) => {
		if (!localSelectedDate) return false;
		return date.toDateString() === localSelectedDate.toDateString();
	};

	// Sélectionner une date
	function selectDate(date: Date) {
		if (isDateAvailable(date)) {
			localSelectedDate = date;
			selectedDate = date;
			dispatch('dateSelected', date);
		}
	}

	// Navigation
	function previousMonth() {
		currentMonth = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth() - 1,
			1,
		);
	}

	function nextMonth() {
		currentMonth = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth() + 1,
			1,
		);
	}

	// Obtenir les jours du mois actuel
	$: days = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
</script>

<div class="w-fit rounded-lg border bg-background p-4">
	<!-- En-tête du calendrier -->
	<div class="mb-4 flex items-center justify-between">
		<Button variant="ghost" size="sm" on:click={previousMonth}>
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<h3 class="text-sm font-medium">
			{monthNames[currentMonth.getMonth()]}
			{currentMonth.getFullYear()}
		</h3>
		<Button variant="ghost" size="sm" on:click={nextMonth}>
			<ChevronRight class="h-4 w-4" />
		</Button>
	</div>

	<!-- Noms des jours -->
	<div class="mb-2 grid grid-cols-7 gap-1">
		{#each dayNames as dayName}
			<div class="p-2 text-center text-xs font-medium text-muted-foreground">
				{dayName}
			</div>
		{/each}
	</div>

	<!-- Jours du mois -->
	<div class="grid grid-cols-7 gap-1">
		{#each days as day}
			{#if day}
				{@const isAvailable = isDateAvailable(day)}
				{@const isSelected = isDateSelected(day)}
				<Button
					variant={isSelected ? 'default' : 'ghost'}
					size="sm"
					class="h-8 w-8 p-0 text-xs {isSelected
						? 'bg-primary text-primary-foreground hover:bg-primary/90'
						: !isAvailable
							? 'cursor-not-allowed opacity-50'
							: 'hover:bg-accent'}"
					disabled={!isAvailable}
					on:click={() => selectDate(day)}
				>
					{day.getDate()}
				</Button>
			{:else}
				<div class="h-8 w-8"></div>
			{/if}
		{/each}
	</div>
</div>
