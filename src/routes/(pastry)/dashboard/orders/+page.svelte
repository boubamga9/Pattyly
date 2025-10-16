<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Calendar,
		User,
		Mail,
		Clock,
		CheckCircle,
		AlertCircle,
		XCircle,
		Package,
		CheckSquare,
	} from 'lucide-svelte';

	// Types
	interface Order {
		id: string;
		customer_name: string;
		customer_email: string;
		pickup_date: string;
		pickup_time: string | null;
		status: string;
		total_amount: number | null;
		product_name: string | null;
		additional_information: string | null;
		chef_message: string | null;
		created_at: string;
		products?: { name: string; image_url: string | null } | null;
		chef_pickup_date: string | null;
		chef_pickup_time: string | null;
	}

	// Données de la page
	$: ({ orders, statusCounts } = $page.data);

	// État du filtre
	let selectedStatus: string | null = null;
	let filteredOrders: Order[] = orders || [];

	// Filtrer les commandes quand le statut change
	$: filteredOrders =
		selectedStatus === null || selectedStatus === 'all'
			? orders || []
			: (orders || []).filter(
					(order: Order) => order.status === selectedStatus,
				);

	// Fonction pour formater le prix
	function formatPrice(price: number | null): string {
		if (!price) return 'Non défini';
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour formater la date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	// Fonction pour obtenir l'icône du statut
	function getStatusIcon(status: string) {
		switch (status) {
			case 'to_verify':
				return AlertCircle;
			case 'pending':
				return Clock;
			case 'quoted':
				return AlertCircle;
			case 'confirmed':
				return CheckCircle;
			case 'ready':
				return Package;
			case 'completed':
				return CheckSquare;
			case 'refused':
				return XCircle;
			default:
				return Clock;
		}
	}

	// Fonction pour obtenir la couleur du statut
	function getStatusColor(status: string): string {
		switch (status) {
			case 'to_verify':
				return 'bg-orange-100 text-orange-800 border-orange-200';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'quoted':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'confirmed':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'ready':
				return 'bg-purple-100 text-purple-800 border-purple-200';
			case 'completed':
				return 'bg-gray-100 text-gray-800 border-gray-200';
			case 'refused':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	// Fonction pour obtenir le texte du statut
	function getStatusText(status: string): string {
		switch (status) {
			case 'to_verify':
				return 'Paiement à confirmer';
			case 'pending':
				return 'Devis à faire';
			case 'quoted':
				return 'Devis envoyé';
			case 'confirmed':
				return 'En cours';
			case 'ready':
				return 'Prête';
			case 'completed':
				return 'Terminée';
			case 'refused':
				return 'Refusée';
			default:
				return status;
		}
	}

	// Fonction pour rediriger vers le détail d'une commande
	function viewOrder(orderId: string) {
		goto(`/dashboard/orders/${orderId}`);
	}

	// Fonction pour obtenir le nom du produit ou "Commande personnalisée"
	function getProductName(order: Order): string {
		if (order.product_name) {
			return order.product_name;
		}
		if (order.products?.name) {
			return order.products.name;
		}
		return 'Commande personnalisée';
	}

	// Fonction pour grouper les commandes filtrées par date de livraison
	function groupOrdersByDate(orders: Order[]) {
		const groups: Record<string, Order[]> = {};
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		orders.forEach((order) => {
			const pickupDate = new Date(order.pickup_date);
			pickupDate.setHours(0, 0, 0, 0);

			const dateKey = getDateKey(pickupDate, today);

			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(order);
		});

		// Trier les commandes dans chaque groupe par heure de récupération
		Object.keys(groups).forEach((key) => {
			groups[key].sort((a, b) => {
				// Si aucune heure n'est définie, mettre à la fin
				if (!a.pickup_time && !b.pickup_time) return 0;
				if (!a.pickup_time) return 1;
				if (!b.pickup_time) return -1;

				// Comparer les heures (format HH:MM)
				return a.pickup_time.localeCompare(b.pickup_time);
			});
		});

		// Trier les groupes par ordre chronologique
		const sortedGroups: Record<string, Order[]> = {};
		const dateOrder = [
			"Aujourd'hui",
			'Demain',
			'Dans 2 jours',
			'Dans 3 jours',
			'Dans 4 jours',
			'Dans 5 jours',
			'Dans 6 jours',
			'Dans 1 semaine',
		];

		// Ajouter d'abord les groupes fixes dans l'ordre
		dateOrder.forEach((key) => {
			if (groups[key]) {
				sortedGroups[key] = groups[key];
			}
		});

		// Ajouter les autres groupes (dates au-delà d'une semaine) dans l'ordre
		Object.keys(groups)
			.filter((key) => !dateOrder.includes(key))
			.sort((a, b) => {
				// Trier les dates par ordre chronologique
				const aMatch = a.match(/Dans (\d+) semaine/);
				const bMatch = b.match(/Dans (\d+) semaine/);

				if (aMatch && bMatch) {
					return parseInt(aMatch[1]) - parseInt(bMatch[1]);
				}

				return 0;
			})
			.forEach((key) => {
				sortedGroups[key] = groups[key];
			});

		return sortedGroups;
	}

	// Fonction pour obtenir la clé de date
	function getDateKey(pickupDate: Date, today: Date): string {
		const diffTime = pickupDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return "Aujourd'hui";
		} else if (diffDays === 1) {
			return 'Demain';
		} else if (diffDays === 2) {
			return 'Dans 2 jours';
		} else if (diffDays === 3) {
			return 'Dans 3 jours';
		} else if (diffDays === 4) {
			return 'Dans 4 jours';
		} else if (diffDays === 5) {
			return 'Dans 5 jours';
		} else if (diffDays === 6) {
			return 'Dans 6 jours';
		} else if (diffDays === 7) {
			return 'Dans 1 semaine';
		} else {
			// Au-delà d'une semaine, afficher la date complète
			return pickupDate.toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			});
		}
	}
</script>

<svelte:head>
	<title>Mes Commandes - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête -->
	<div
		class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
	>
		<div>
			<h1 class="text-3xl font-bold">Mes Commandes</h1>
			<p class="text-muted-foreground">Gérez toutes vos commandes</p>
		</div>
	</div>

	<!-- Section de filtres -->
	<div class="space-y-4">
		<div class="overflow-x-auto">
			<div class="flex min-w-max gap-2 py-2 pb-4">
				<!-- Filtre "Tout" -->
				<Button
					variant={selectedStatus === null ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = null)}
					class="whitespace-nowrap"
				>
					Tout ({statusCounts.all})
				</Button>

				<!-- Filtres par statut -->
				<Button
					variant={selectedStatus === 'pending' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'pending')}
					class="whitespace-nowrap"
				>
					Devis à faire* ({statusCounts.pending})
				</Button>

				<Button
					variant={selectedStatus === 'quoted' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'quoted')}
					class="whitespace-nowrap"
				>
					Devis envoyés* ({statusCounts.quoted})
				</Button>

				<Button
					variant={selectedStatus === 'to_verify' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'to_verify')}
					class="whitespace-nowrap"
				>
					Paiement à confirmer ({statusCounts.to_verify || 0})
				</Button>

				<Button
					variant={selectedStatus === 'confirmed' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'confirmed')}
					class="whitespace-nowrap"
				>
					En cours ({statusCounts.confirmed})
				</Button>

				<Button
					variant={selectedStatus === 'ready' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'ready')}
					class="whitespace-nowrap"
				>
					Prêtes ({statusCounts.ready})
				</Button>

				<Button
					variant={selectedStatus === 'completed' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'completed')}
					class="whitespace-nowrap"
				>
					Terminées ({statusCounts.completed})
				</Button>

				<Button
					variant={selectedStatus === 'refused' ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedStatus = 'refused')}
					class="whitespace-nowrap"
				>
					Refusées* ({statusCounts.refused})
				</Button>
			</div>
		</div>

		<!-- Légende pour les étoiles -->
		<div class="text-xs text-muted-foreground">
			<span class="font-medium">*</span> Ces statuts concernent uniquement les
			<button
				on:click={() => goto('/dashboard/custom-form')}
				class="font-medium text-gray-600 underline transition-colors hover:text-gray-800"
				title="Configurer le formulaire de commandes personnalisées"
			>
				commandes personnalisées
			</button>
		</div>
	</div>

	<!-- Liste des commandes groupées par date -->
	<div class="space-y-8">
		{#if filteredOrders && filteredOrders.length > 0}
			{#each Object.entries(groupOrdersByDate(filteredOrders)) as [dateGroup, ordersInGroup]}
				<div class="space-y-4">
					<!-- En-tête du groupe de date -->
					<div class="flex items-center gap-2">
						<h2 class="text-lg font-semibold">{dateGroup}</h2>
						<Badge variant="outline"
							>{ordersInGroup.length} commande{ordersInGroup.length > 1
								? 's'
								: ''}</Badge
						>
					</div>

					<!-- Commandes du groupe -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each ordersInGroup as order}
							<Card class="transition-shadow hover:shadow-md">
								<div
									class="cursor-pointer"
									on:click={() => viewOrder(order.id)}
									on:keydown={(e) => e.key === 'Enter' && viewOrder(order.id)}
									role="button"
									tabindex="0"
								>
									<CardHeader>
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<CardTitle class="text-lg"
													>{getProductName(order)}</CardTitle
												>
												<CardDescription class="mt-1">
													<div class="flex items-center gap-2 text-sm">
														<User class="h-3 w-3" />
														{order.customer_name}
													</div>
												</CardDescription>
											</div>

											<div class="flex flex-col items-end gap-2">
												<div
													class={`${getStatusColor(order.status)} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
												>
													<svelte:component
														this={getStatusIcon(order.status)}
														class="mr-1 h-3 w-3"
													/>
													<span class="text-current"
														>{getStatusText(order.status)}</span
													>
												</div>
												{#if order.total_amount}
													<span class="text-sm font-medium text-green-600">
														{formatPrice(order.total_amount)}
													</span>
												{/if}
											</div>
										</div>
									</CardHeader>

									<CardContent>
										<div class="space-y-2">
											<!-- Date de récupération -->
											<div
												class="flex items-center gap-2 text-sm text-muted-foreground"
											>
												<Calendar class="h-3 w-3" />
												<span
													>Récupération : <span
														class="font-medium text-foreground"
														>{formatDate(order.pickup_date)}</span
													>
													{#if order.pickup_time}
														<span class="ml-1 text-gray-900"
															>{order.pickup_time.substring(0, 5)}</span
														>
													{/if}
												</span>
											</div>

											<!-- Email du client -->
											<div
												class="flex items-center gap-2 text-sm text-muted-foreground"
											>
												<Mail class="h-3 w-3" />
												<span>{order.customer_email}</span>
											</div>

											<!-- Date de création -->
											<div
												class="flex items-center gap-2 text-sm text-muted-foreground"
											>
												<Clock class="h-3 w-3" />
												<span>Créée le {formatDate(order.created_at)}</span>
											</div>
										</div>
									</CardContent>
								</div>
							</Card>
						{/each}
					</div>
				</div>
			{/each}
		{:else}
			<!-- Aucune commande -->
			<div class="py-12 text-center">
				<Package class="mx-auto h-12 w-12 text-muted-foreground" />
				<h3 class="mt-4 text-lg font-semibold">Aucune commande</h3>
				<p class="mt-2 text-muted-foreground">
					{#if selectedStatus}
						Aucune commande avec le statut "{getStatusText(selectedStatus)}"
					{:else}
						Vous n'avez pas encore reçu de commandes
					{/if}
				</p>
			</div>
		{/if}
	</div>
</div>
