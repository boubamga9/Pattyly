<script lang="ts">
	import { onNavigate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Home from '~icons/lucide/home';
	import Settings from '~icons/lucide/settings';
	import ShoppingCart from '~icons/lucide/shopping-cart';
	import Cake from '~icons/lucide/cake';
	import FileText from '~icons/lucide/file-text';
	import Calendar from '~icons/lucide/calendar';
	import Store from '~icons/lucide/store';
	import HelpCircle from '~icons/lucide/help-circle';
	import MenuIcon from '~icons/lucide/menu';
	import XIcon from '~icons/lucide/x';

	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Separator } from '$lib/components/ui/separator';

	import NavLink from './components/nav-link.svelte';
	import OrderLimitAlert from './components/order-limit-alert.svelte';
	import { registerServiceWorkerForPastryChef } from '$lib/utils/service-worker-registration';

	export let data;

	let menuOpen = false;
	onNavigate((_) => {
		menuOpen = false;
	});

	// Enregistrer le service worker uniquement pour les pâtissiers (utilisateurs authentifiés)
	onMount(async () => {
		// Vérifier que l'utilisateur est bien un pâtissier (authentifié)
		if (data.user && data.permissions?.shopId) {
			// Enregistrer le service worker (vérifie automatiquement si déjà enregistré)
			await registerServiceWorkerForPastryChef();
		}
	});

	// Fonction pour gérer la navigation avec goto() pour rester dans la PWA
	function handleNavClick(href: string, event: MouseEvent) {
		// Si c'est un clic avec modificateur (Ctrl, Cmd, etc.), laisser le comportement par défaut
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
			return;
		}
		
		// Empêcher le comportement par défaut et utiliser la navigation SvelteKit
		event.preventDefault();
		goto(href);
	}
</script>

<div class="flex min-h-screen w-full flex-col bg-muted/40">
	<aside
		class="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex"
	>
		<nav class="flex flex-col items-center gap-4 px-2 sm:py-5">
			<a
				href="/{data.shop ? data.shop.slug : ''}"
				class="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 md:h-8 md:w-8"
			>
				{#if data.shop?.logo_url}
					<img
						src={data.shop.logo_url}
						alt={data.shop.name}
						class="h-8 w-8 rounded object-cover"
					/>
				{:else}
					<img
						src="/images/logo_icone.svg"
						alt="Logo Pattyly"
						class="h-8 w-8 rounded object-cover"
					/>
				{/if}
				<span class="sr-only">{data.shop?.name || 'SaaS Kit'}</span>
			</a>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						exact={true}
						{builder}
					>
						<Home class="h-5 w-5" />
						<span class="sr-only">Dashboard</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">Dashboard</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/orders"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<ShoppingCart class="h-5 w-5" />
						<span class="sr-only">Commandes</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">Commandes</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/products"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<Cake class="h-5 w-5" />
						<span class="sr-only">Gâteaux</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">Gâteaux</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/custom-form"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<FileText class="h-5 w-5" />
						<span class="sr-only">Formulaire personnalisé</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">
					Formulaire personnalisé
					{#if !data.permissions.canManageCustomForms}
						<span class="ml-1 text-[#FF6F61]">(Premium)</span>
					{/if}
				</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/availability"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<Calendar class="h-5 w-5" />
						<span class="sr-only">Disponibilités</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">Disponibilités</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/shop"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<Store class="h-5 w-5" />
						<span class="sr-only">Boutique</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">Boutique</Tooltip.Content>
			</Tooltip.Root>
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/faq"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<HelpCircle class="h-5 w-5" />
						<span class="sr-only">FAQ</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">FAQ</Tooltip.Content>
			</Tooltip.Root>
		</nav>
		<nav class="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<NavLink
						href="/dashboard/settings"
						class="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
						activeClass="bg-accent text-accent-foreground"
						{builder}
					>
						<Settings class="h-5 w-5" />
						<span class="sr-only">Settings</span>
					</NavLink>
				</Tooltip.Trigger>
				<Tooltip.Content side="right">Paramètres</Tooltip.Content>
			</Tooltip.Root>
		</nav>
	</aside>
	<div class="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
		<header
			class="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6"
		>
			<div class="flex w-full items-center justify-between sm:hidden">
				<!-- Logo + nom du shop à gauche -->
				<div class="flex items-center gap-2">
					{#if data.shop?.logo_url}
						<img
							src={data.shop.logo_url}
							alt={data.shop.name || 'Logo boutique'}
							class="h-8 w-8 rounded object-cover"
						/>
					{:else}
						<img
							src="/images/logo_icone.svg"
							alt="Logo Pattyly"
							class="h-8 w-8 rounded object-cover"
						/>
					{/if}
					<span class="max-w-[150px] truncate text-sm font-medium">
						{data.shop?.name || 'Pattyly'}
					</span>
				</div>

				<!-- Bouton drawer à droite -->
				<Drawer.Root bind:open={menuOpen}>
					<Drawer.Trigger asChild let:builder>
						<Button builders={[builder]} size="icon" variant="outline">
							<MenuIcon class="h-5 w-5" />
							<span class="sr-only">Menu</span>
						</Button>
					</Drawer.Trigger>
					<Drawer.Content>
						<Drawer.Header class="flex justify-end py-0">
							<Drawer.Close asChild let:builder>
								<Button variant="ghost" size="icon" builders={[builder]}>
									<span class="sr-only">Close</span>
									<XIcon />
								</Button>
							</Drawer.Close>
						</Drawer.Header>
						<nav class="[&_ul]:flex [&_ul]:flex-col [&_ul]:p-2">
							<ul>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard', e)}
									>
										Dashboard
									</Button>
								</li>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/orders', e)}
									>
										Commandes
									</Button>
								</li>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/products', e)}
									>
										Gâteaux
									</Button>
								</li>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/custom-form', e)}
									>
										Formulaire personnalisé
									</Button>
								</li>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/availability', e)}
									>
										Disponibilités
									</Button>
								</li>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/shop', e)}
									>
										Boutique
									</Button>
								</li>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/faq', e)}
									>
										FAQ
									</Button>
								</li>
							</ul>
							<Separator />
							<ul>
								<li>
									<Button
										variant="ghost"
										class="w-full py-6 text-base"
										on:click={(e) => handleNavClick('/dashboard/settings', e)}
									>
										Paramètres
									</Button>
								</li>
							</ul>
						</nav>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</header>
		<main class="flex w-full flex-col items-start p-4 sm:px-6 sm:py-0">
			<OrderLimitAlert orderLimitStats={data.orderLimitStats} />
			<slot />
		</main>
	</div>
</div>
