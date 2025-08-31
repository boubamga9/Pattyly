<script lang="ts">
	import { onNavigate } from '$app/navigation';
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

	import { Logo } from '$lib/components/brand';
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Separator } from '$lib/components/ui/separator';

	import NavLink from './components/nav-link.svelte';

	export let data;

	let menuOpen = false;
	onNavigate((_) => {
		menuOpen = false;
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-muted/40">
	<aside
		class="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex"
	>
		<nav class="flex flex-col items-center gap-4 px-2 sm:py-5">
			<a
				href="/"
				class="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 md:h-8 md:w-8"
			>
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
				<Tooltip.Content side="right">Formulaire personnalisé</Tooltip.Content>
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
				<Tooltip.Content side="right">Settings</Tooltip.Content>
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
										href="/dashboard"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Dashboard
									</Button>
								</li>
								<li>
									<Button
										href="/dashboard/orders"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Commandes
									</Button>
								</li>
								<li>
									<Button
										href="/dashboard/products"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Gâteaux
									</Button>
								</li>
								<li>
									<Button
										href="/dashboard/custom-form"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Formulaire personnalisé
									</Button>
								</li>
								<li>
									<Button
										href="/dashboard/availability"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Disponibilités
									</Button>
								</li>
								<li>
									<Button
										href="/dashboard/shop"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Boutique
									</Button>
								</li>
								<li>
									<Button
										href="/dashboard/faq"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										FAQ
									</Button>
								</li>
							</ul>
							<Separator />
							<ul>
								<li>
									<Button
										href="/dashboard/settings"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Settings
									</Button>
								</li>
								<li>
									<Button
										href="/log-out"
										variant="ghost"
										class="w-full py-6 text-base"
									>
										Log out
									</Button>
								</li>
							</ul>
						</nav>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</header>
		<main class="flex flex-col items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
			<!-- Alerte d'abonnement inactif -->
			{#if data.hasInactiveSubscription}
				<div class="w-full">
					<div
						class="mb-6 rounded-lg border-[#FF6F61] bg-[#FFF1F0] p-4 text-[#8B1A1A]"
					>
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0">
								<svg
									class="h-5 w-5 text-[#FF6F61]"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fill-rule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="text-sm font-medium text-[#8B1A1A]">
									Boutique temporairement désactivée
								</h3>
								<div class="mt-2 text-sm text-[#8B1A1A]">
									<p class="mb-3">
										Votre boutique n'est plus visible par les clients. Pour la
										réactiver et continuer à recevoir des commandes, vous devez
										souscrire à un plan d'abonnement.
									</p>
									<a
										href="/subscription"
										class="inline-flex items-center rounded-md bg-[#FF6F61] px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#e85a4f] focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
									>
										<svg
											class="mr-2 h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
										Réactiver ma boutique
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<slot />
		</main>
	</div>
</div>
