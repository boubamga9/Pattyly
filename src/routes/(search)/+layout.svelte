<script lang="ts">
	// Le layout search réutilise le header et footer du marketing
	// On importe les mêmes composants et logique
	import { onMount, onDestroy } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { cn } from '$lib/utils';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import XIcon from 'virtual:icons/lucide/x';
	import ChevronDown from 'virtual:icons/lucide/chevron-down';
	import Home from 'virtual:icons/lucide/home';
	import DollarSign from 'virtual:icons/lucide/dollar-sign';
	import HelpCircle from 'virtual:icons/lucide/help-circle';
	import Settings from 'virtual:icons/lucide/settings';
	import ShoppingBag from 'virtual:icons/lucide/shopping-bag';
	import ClipboardList from 'virtual:icons/lucide/clipboard-list';
	import Receipt from 'virtual:icons/lucide/receipt';
	import Search from 'virtual:icons/lucide/search';
	import MapPin from 'virtual:icons/lucide/map-pin';
	import Info from 'virtual:icons/lucide/info';
	import Mail from 'virtual:icons/lucide/mail';
	import { Cake } from 'lucide-svelte';
	import {
		initSmoothScroll,
		destroySmoothScroll,
	} from '$lib/utils/smooth-scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import '../../app.css';

	const menuItems = {
		'/annuaire': 'Tous les pâtissiers',
		'/tous-les-gateaux': 'Tous les gâteaux',
	};

	let menuOpen = false;
	let header: HTMLElement;
	let logo: HTMLElement;

	export let data;

	onMount(() => {
		initSmoothScroll();
		gsap.registerPlugin(ScrollTrigger);

		// Animation du header au scroll
		if (header && logo) {
			ScrollTrigger.create({
				trigger: document.body,
				start: 'top -100',
				onEnter: () => {
					gsap.to(header, {
						duration: 0.3,
						paddingTop: '0.75rem',
						paddingBottom: '0.75rem',
						backgroundColor: 'rgba(255, 255, 255, 0.95)',
						backdropFilter: 'blur(10px)',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
					});
					gsap.to(logo, {
						duration: 0.3,
						height: '50px',
						width: '85px',
					});
				},
				onLeaveBack: () => {
					gsap.to(header, {
						duration: 0.3,
						paddingTop: '1rem',
						paddingBottom: '1rem',
						backgroundColor: 'transparent',
						backdropFilter: 'blur(0px)',
						boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
					});
					gsap.to(logo, {
						duration: 0.3,
						height: '70px',
						width: '120px',
					});
				},
			});
		}
	});

	onDestroy(() => {
		destroySmoothScroll();
		ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
	});

	onNavigate(() => {
		menuOpen = false;
	});
</script>

<!-- Navbar integrated in Hero section with transparent background -->
<header
	bind:this={header}
	class="marketing-section fixed top-0 z-50 w-full py-4 transition-all duration-300"
	style="background-color: transparent;"
>
	<div class="container flex items-center justify-between">
		<!-- Logo à gauche -->
		<div class="flex justify-start">
			<Button
				variant="ghost"
				class="flex w-fit flex-nowrap items-center gap-3 text-xl transition-colors duration-200 hover:bg-white/20"
				href="/"
			>
				<img
					bind:this={logo}
					src="/images/logo_text.svg"
					alt="Logo Pattyly"
					class="h-[70px] w-[120px] object-contain transition-transform duration-200 hover:scale-105"
				/>
			</Button>
		</div>

		<!-- Navigation centrée (cachée sur mobile) -->
		<nav class="absolute left-1/2 hidden -translate-x-1/2 transform lg:block">
			<ul class="flex items-center gap-8 text-lg font-bold">
				<!-- Menu Produits avec dropdown (en premier) -->
				<li class="group relative">
					<Button
						variant="ghost"
						class="flex items-center gap-1 text-base text-foreground transition-colors duration-200 hover:bg-white/20 hover:text-white"
						style="color: #333; font-size: 18px;"
					>
						Produits
						<ChevronDown
							class="h-4 w-4 transition-transform duration-200 group-hover:rotate-180"
						/>
					</Button>
					<!-- Dropdown au hover -->
					<div
						class="invisible absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100"
					>
						<div
							class="w-[600px] rounded-2xl border border-neutral-200 bg-white p-0 shadow-xl"
						>
							<div class="grid grid-cols-2 divide-x divide-neutral-200">
								<!-- Colonne gauche : Logiciel de gestion -->
								<div class="p-6">
									<p class="mb-4 text-sm font-semibold text-neutral-900">
										Logiciel de gestion
									</p>
									<div class="space-y-1">
										<a
											href="/"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Home class="h-4 w-4 text-neutral-500" />
											<span>Accueil</span>
										</a>
										<a
											href="/pricing"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<DollarSign class="h-4 w-4 text-neutral-500" />
											<span>Tarifs</span>
										</a>
										<a
											href="/faq"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<HelpCircle class="h-4 w-4 text-neutral-500" />
											<span>FAQ</span>
										</a>
									</div>
									<div class="my-8 border-t border-neutral-200"></div>
									<div class="space-y-1">
										<p
											class="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
										>
											Solutions
										</p>
										<a
											href="/boutique-en-ligne-patissier"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<ShoppingBag class="h-4 w-4 text-neutral-500" />
											<span>Boutique en ligne</span>
										</a>
										<a
											href="/logiciel-gestion-patisserie"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Settings class="h-4 w-4 text-neutral-500" />
											<span>Logiciel de gestion</span>
										</a>
										<a
											href="/formulaire-commande-gateau"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<ClipboardList class="h-4 w-4 text-neutral-500" />
											<span>Formulaire commande</span>
										</a>
										<a
											href="/devis-factures-cake-designer"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Receipt class="h-4 w-4 text-neutral-500" />
											<span>Devis et factures</span>
										</a>
									</div>
								</div>
								<!-- Colonne droite : Recherche -->
								<div class="p-6">
									<p class="mb-4 text-sm font-semibold text-neutral-900">
										Recherche
									</p>
									<div class="space-y-1">
										<a
											href="/trouver-un-cake-designer"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Search class="h-4 w-4 text-neutral-500" />
											<span>Trouver un cake designer</span>
										</a>
										<a
											href="/annuaire"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Search class="h-4 w-4 text-neutral-500" />
											<span>Annuaire complet</span>
										</a>
										<a
											href="/tous-les-gateaux"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Cake class="h-4 w-4 text-neutral-500" />
											<span>Tous les gâteaux</span>
										</a>
									</div>
									<div class="my-8 border-t border-neutral-200"></div>
									<div class="space-y-1">
										<p
											class="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
										>
											Types de gâteaux
										</p>
										<a
											href="/gateau-anniversaire"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Cake class="h-4 w-4 text-neutral-500" />
											<span>Gâteau d'anniversaire</span>
										</a>
										<a
											href="/gateau-mariage"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Cake class="h-4 w-4 text-neutral-500" />
											<span>Gâteau de mariage</span>
										</a>
										<a
											href="/cupcakes"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Cake class="h-4 w-4 text-neutral-500" />
											<span>Cupcakes</span>
										</a>
										<a
											href="/macarons"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Cake class="h-4 w-4 text-neutral-500" />
											<span>Macarons</span>
										</a>
										<a
											href="/gateau-personnalise"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<Cake class="h-4 w-4 text-neutral-500" />
											<span>Gâteau personnalisé</span>
										</a>
									</div>
									<div class="my-8 border-t border-neutral-200"></div>
									<div class="space-y-1">
										<p
											class="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
										>
											Villes populaires
										</p>
										<a
											href="/annuaire/paris"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<MapPin class="h-4 w-4 text-neutral-500" />
											<span>Paris</span>
										</a>
										<a
											href="/annuaire/marseille"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<MapPin class="h-4 w-4 text-neutral-500" />
											<span>Marseille</span>
										</a>
										<a
											href="/annuaire/lyon"
											class="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
										>
											<MapPin class="h-4 w-4 text-neutral-500" />
											<span>Lyon</span>
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				</li>
				{#each Object.entries(menuItems) as [href, text]}
					<li>
						<Button
							variant="ghost"
							{href}
							class="text-base text-foreground transition-colors duration-200 hover:bg-white/20 hover:text-white"
							style="color: #333; font-size: 18px;"
						>
							{text}
						</Button>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- Boutons à droite -->
		<div class="flex items-center gap-4">
			<!-- Boutons desktop -->
			<div class="hidden lg:flex lg:gap-4">
				{#if data.user}
					<Button href="/dashboard">Dashboard</Button>
				{:else}
					<Button
						href="/"
						class="rounded-xl bg-[#FF6F61] text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#e85a4f]"
						style="width: 160px; height: 48px;"
					>
						Je suis pâtissier
					</Button>
				{/if}
			</div>

			<!-- Bouton mobile -->
			<div class="lg:hidden">
				<Drawer.Root bind:open={menuOpen}>
					<Drawer.Trigger asChild let:builder>
						<Button variant="ghost" size="icon" builders={[builder]}>
							<span class="sr-only">Menu</span>
							<MenuIcon />
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
						<nav class="flex flex-col divide-y divide-neutral-200">
							<!-- Liens principaux en haut -->
							<div class="py-2">
								<Button
									href="/annuaire"
									variant="ghost"
									class="w-full justify-start px-4 py-4 text-base font-semibold"
									onclick={() => (menuOpen = false)}
								>
									Tous les pâtissiers
								</Button>
								<Button
									href="/tous-les-gateaux"
									variant="ghost"
									class="w-full justify-start px-4 py-4 text-base font-semibold"
									onclick={() => (menuOpen = false)}
								>
									Tous les gâteaux
								</Button>
							</div>
							<!-- Menu Produits avec accordéons -->
							<div class="py-2">
								<!-- Accordéon Logiciel de gestion -->
								<Collapsible class="border-b border-neutral-100">
									<CollapsibleTrigger
										class="group flex w-full items-center justify-between px-4 py-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
									>
										<span class="flex items-center gap-2">
											<Settings class="h-4 w-4" />
											Logiciel de gestion
										</span>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
										/>
									</CollapsibleTrigger>
									<CollapsibleContent class="px-4 pb-2">
										<div class="space-y-1">
											<Button
												href="/"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<Home class="mr-2 h-4 w-4" />
												Accueil
											</Button>
											<Button
												href="/pricing"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<DollarSign class="mr-2 h-4 w-4" />
												Tarifs
											</Button>
											<Button
												href="/faq"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<HelpCircle class="mr-2 h-4 w-4" />
												FAQ
											</Button>
											<Button
												href="/about"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<Info class="mr-2 h-4 w-4" />
												À propos
											</Button>
											<Button
												href="/contact"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<Mail class="mr-2 h-4 w-4" />
												Contact
											</Button>
										</div>
										<div class="my-2 border-t border-neutral-100"></div>
										<p
											class="px-8 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
										>
											Solutions
										</p>
										<div class="space-y-1">
											<Button
												href="/boutique-en-ligne-patissier"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<ShoppingBag class="mr-2 h-4 w-4" />
												Boutique en ligne
											</Button>
											<Button
												href="/logiciel-gestion-patisserie"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<Settings class="mr-2 h-4 w-4" />
												Logiciel de gestion
											</Button>
											<Button
												href="/formulaire-commande-gateau"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<ClipboardList class="mr-2 h-4 w-4" />
												Formulaire commande
											</Button>
											<Button
												href="/devis-factures-cake-designer"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												<Receipt class="mr-2 h-4 w-4" />
												Devis et factures
											</Button>
										</div>
									</CollapsibleContent>
								</Collapsible>

								<!-- Accordéon Recherche -->
								<Collapsible class="border-b border-neutral-100">
									<CollapsibleTrigger
										class="group flex w-full items-center justify-between px-4 py-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
									>
										<span class="flex items-center gap-2">
											<Search class="h-4 w-4" />
											Recherche
										</span>
										<ChevronDown
											class="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
										/>
									</CollapsibleTrigger>
									<CollapsibleContent class="px-4 pb-2">
										<div class="space-y-1">
											<Button
												href="/trouver-un-cake-designer"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Trouver un cake designer
											</Button>
											<Button
												href="/annuaire"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Annuaire complet
											</Button>
											<Button
												href="/tous-les-gateaux"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Tous les gâteaux
											</Button>
										</div>
										<div class="my-2 border-t border-neutral-100"></div>
										<p
											class="px-8 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
										>
											Types de gâteaux
										</p>
										<div class="space-y-1">
											<Button
												href="/gateau-anniversaire"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Gâteau d'anniversaire
											</Button>
											<Button
												href="/gateau-mariage"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Gâteau de mariage
											</Button>
											<Button
												href="/cupcakes"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Cupcakes
											</Button>
											<Button
												href="/macarons"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Macarons
											</Button>
											<Button
												href="/gateau-personnalise"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Gâteau personnalisé
											</Button>
										</div>
										<div class="my-2 border-t border-neutral-100"></div>
										<p
											class="px-8 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
										>
											Villes populaires
										</p>
										<div class="space-y-1">
											<Button
												href="/annuaire/paris"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Paris
											</Button>
											<Button
												href="/annuaire/marseille"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Marseille
											</Button>
											<Button
												href="/annuaire/lyon"
												variant="ghost"
												class="w-full justify-start py-3 pl-8 text-sm"
												onclick={() => (menuOpen = false)}
											>
												Lyon
											</Button>
										</div>
									</CollapsibleContent>
								</Collapsible>
							</div>
							<Separator />
							<!-- Actions utilisateur -->
							<div class="flex flex-col py-2">
								{#if !data.user}
									<Button
										href="/"
										variant="ghost"
										class="w-full justify-start px-4 py-4 text-base font-semibold"
										onclick={() => (menuOpen = false)}
									>
										Je suis pâtissier
									</Button>
								{:else}
									<Button
										href="/dashboard"
										variant="ghost"
										class="w-full justify-start px-4 py-4 text-base"
										onclick={() => (menuOpen = false)}
									>
										Dashboard
									</Button>
								{/if}
							</div>
						</nav>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</div>
	</div>
</header>

<main>
	<slot />
</main>

<!-- Footer -->
<footer
	class="relative overflow-hidden border-t border-neutral-200 bg-white py-16 sm:py-20"
>
	<div class="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
		<!-- Logo centré en haut -->
		<div class="mb-12 flex justify-center">
			<a href="/">
				<img
					src="/images/logo_text.svg"
					alt="Logo Pattyly"
					class="h-16 w-28 object-contain transition-transform duration-200 hover:scale-105 lg:h-[70px] lg:w-[120px]"
				/>
			</a>
		</div>

		<!-- Links grid avec icônes - disposition améliorée -->
		<div class="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5">
			<!-- Logiciel de gestion -->
			<div class="flex flex-col gap-4">
				<p class="text-sm font-semibold text-neutral-900">
					Logiciel de gestion
				</p>
				<nav class="flex flex-col gap-2">
					<a
						href="/"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Home class="h-3.5 w-3.5" />
						<span>Accueil</span>
					</a>
					<a
						href="/pricing"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<DollarSign class="h-3.5 w-3.5" />
						<span>Tarifs</span>
					</a>
					<a
						href="/faq"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<HelpCircle class="h-3.5 w-3.5" />
						<span>FAQ</span>
					</a>
					<a
						href="/about"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Info class="h-3.5 w-3.5" />
						<span>À propos</span>
					</a>
					<a
						href="/contact"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Mail class="h-3.5 w-3.5" />
						<span>Contact</span>
					</a>
					<div class="my-3 border-t border-neutral-200"></div>
					<p
						class="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500"
					>
						Solutions
					</p>
					<a
						href="/boutique-en-ligne-patissier"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<ShoppingBag class="h-3.5 w-3.5" />
						<span>Boutique en ligne</span>
					</a>
					<a
						href="/logiciel-gestion-patisserie"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Settings class="h-3.5 w-3.5" />
						<span>Logiciel de gestion</span>
					</a>
					<a
						href="/formulaire-commande-gateau"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<ClipboardList class="h-3.5 w-3.5" />
						<span>Formulaire commande</span>
					</a>
					<a
						href="/devis-factures-cake-designer"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Receipt class="h-3.5 w-3.5" />
						<span>Devis et factures</span>
					</a>
				</nav>
			</div>

			<!-- Recherche -->
			<div class="flex flex-col gap-4">
				<p class="text-sm font-semibold text-neutral-900">Recherche</p>
				<nav class="flex flex-col gap-2">
					<a
						href="/trouver-un-cake-designer"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Search class="h-3.5 w-3.5" />
						<span>Trouver un cake designer</span>
					</a>
					<a
						href="/annuaire"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Search class="h-3.5 w-3.5" />
						<span>Annuaire complet</span>
					</a>
					<a
						href="/tous-les-gateaux"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Cake class="h-3.5 w-3.5" />
						<span>Tous les gâteaux</span>
					</a>
					<div class="my-3 border-t border-neutral-200"></div>
					<p
						class="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500"
					>
						Villes populaires
					</p>
					<a
						href="/annuaire/paris"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Paris</span>
					</a>
					<a
						href="/annuaire/marseille"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Marseille</span>
					</a>
					<a
						href="/annuaire/lyon"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Lyon</span>
					</a>
					<a
						href="/annuaire/toulouse"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Toulouse</span>
					</a>
					<a
						href="/annuaire/nice"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Nice</span>
					</a>
				</nav>
			</div>

			<!-- Types de gâteaux -->
			<div class="flex flex-col gap-4">
				<p class="text-sm font-semibold text-neutral-900">Types de gâteaux</p>
				<nav class="flex flex-col gap-2">
					<a
						href="/gateau-anniversaire"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Cake class="h-3.5 w-3.5" />
						<span>Gâteau d'anniversaire</span>
					</a>
					<a
						href="/gateau-mariage"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Cake class="h-3.5 w-3.5" />
						<span>Gâteau de mariage</span>
					</a>
					<a
						href="/cupcakes"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Cake class="h-3.5 w-3.5" />
						<span>Cupcakes</span>
					</a>
					<a
						href="/macarons"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Cake class="h-3.5 w-3.5" />
						<span>Macarons</span>
					</a>
					<a
						href="/gateau-personnalise"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Cake class="h-3.5 w-3.5" />
						<span>Gâteau personnalisé</span>
					</a>
				</nav>
			</div>

			<!-- Menu & App -->
			<div class="flex flex-col gap-4">
				<p class="text-sm font-semibold text-neutral-900">Menu</p>
				<nav class="flex flex-col gap-2">
					{#each Object.entries(menuItems) as [href, text]}
						<a
							{href}
							class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
						>
							{text}
						</a>
					{/each}
				</nav>
				<div class="my-3 border-t border-neutral-200"></div>
				<p class="text-sm font-semibold text-neutral-900">Espace pâtissier</p>
				<nav class="flex flex-col gap-2">
					<a
						href="/login"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						Se connecter
					</a>
					<a
						href="/register"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						S'inscrire
					</a>
				</nav>
			</div>

			<!-- Légal & Réseaux -->
			<div class="flex flex-col gap-4">
				<p class="text-sm font-semibold text-neutral-900">Légal</p>
				<nav class="flex flex-col gap-2">
					<a
						href="/cgu"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						CGU
					</a>
					<a
						href="/legal"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						Mentions légales
					</a>
					<a
						href="/privacy"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						Confidentialité
					</a>
				</nav>
				<div class="my-3 border-t border-neutral-200"></div>
				<p class="text-sm font-semibold text-neutral-900">Retrouvez-nous</p>
				<nav class="flex flex-col gap-2">
					<a
						href="https://www.instagram.com/pattyly.app"
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						Instagram
					</a>
					<a
						href="https://www.tiktok.com/@pattyly.com"
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						TikTok
					</a>
				</nav>
			</div>
		</div>

		<!-- Copyright -->
		<div class="mt-12 border-t border-neutral-200 pt-8 text-center">
			<p class="text-sm text-neutral-500">
				© {new Date().getFullYear()} Pattyly. Tous droits réservés.
			</p>
		</div>
	</div>
</footer>
