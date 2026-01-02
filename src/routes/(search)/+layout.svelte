<script lang="ts">
	// Le layout search réutilise le header et footer du marketing
	// On importe les mêmes composants et logique
	import { onMount, onDestroy } from 'svelte';
	import { onNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
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
	import { isSearchBarVisible } from '$lib/stores/searchBarVisibility';
	import '../../app.css';

	let header: HTMLElement;
	let logo: HTMLElement;

	export let data;
	
	// Déterminer l'état du switch basé sur la page actuelle
	$: isGateauxView = $page.url.pathname.startsWith('/gateaux');
	$: isPatissiersView = !isGateauxView; // Par défaut, si ce n'est pas la vue gâteaux, c'est la vue pâtissiers

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

	onMount(() => {
		initSmoothScroll();
		gsap.registerPlugin(ScrollTrigger);

		// Animation du header au scroll
		if (header && logo) {
			let scrollTriggerInstance: ScrollTrigger | null = null;
			
			const updateHeaderShadow = () => {
				const searchBarVisible = $isSearchBarVisible;
				if (scrollTriggerInstance && scrollTriggerInstance.isActive) {
					gsap.to(header, {
						duration: 0.3,
						boxShadow: searchBarVisible ? '0 0 0 rgba(0, 0, 0, 0)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
					});
				}
			};
			
			// Écouter les changements du store
			const unsubscribe = isSearchBarVisible.subscribe(() => {
				updateHeaderShadow();
			});
			
			scrollTriggerInstance = ScrollTrigger.create({
				trigger: document.body,
				start: 'top -100',
				onEnter: () => {
					const searchBarVisible = $isSearchBarVisible;
					gsap.to(header, {
						duration: 0.3,
						paddingTop: '0.75rem',
						paddingBottom: '0.75rem',
						backgroundColor: 'rgba(255, 255, 255, 0.95)',
						backdropFilter: 'blur(10px)',
						boxShadow: searchBarVisible ? '0 0 0 rgba(0, 0, 0, 0)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
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
			
			return () => {
				unsubscribe();
			};
		}
	});

	onDestroy(() => {
		destroySmoothScroll();
		ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
	});

	onNavigate(() => {
		// Navigation effectuée
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

		<!-- Switch Pâtissiers | Gâteaux -->
		<nav class="absolute left-1/2 hidden -translate-x-1/2 transform md:block">
			<div class="flex items-center gap-2 rounded-full border border-neutral-300 bg-white p-1 shadow-sm">
				<button
					on:click={() => goto('/patissiers')}
					class={cn(
						'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm',
						isPatissiersView
							? 'bg-[#FF6F61] text-white shadow-sm'
							: 'text-neutral-700 hover:text-neutral-900'
					)}
				>
					Pâtissiers
				</button>
				<button
					on:click={() => goto('/gateaux')}
					class={cn(
						'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm',
						isGateauxView
							? 'bg-[#FF6F61] text-white shadow-sm'
							: 'text-neutral-700 hover:text-neutral-900'
					)}
				>
					Gâteaux
				</button>
					</div>
		</nav>

		<!-- Boutons à droite -->
		<div class="flex items-center gap-4">
			<!-- Boutons desktop -->
			<div class="hidden lg:flex lg:gap-4">
					<Button
						variant="ghost"
						class="text-sm font-normal text-neutral-700 transition-colors duration-200 hover:text-neutral-900 hover:bg-transparent"
						on:click={(e) => handleNavClick('/', e)}
					>
						Je suis pâtissier
					</Button>
				{#if data.user}
					<Button on:click={(e) => handleNavClick('/dashboard', e)}>Dashboard</Button>
				{/if}
			</div>

			<!-- Bouton mobile -->
			<div class="lg:hidden">
								<Button
									variant="ghost"
					class="text-sm font-normal text-neutral-700 transition-colors duration-200 hover:text-neutral-900 hover:bg-transparent"
										on:click={(e) => handleNavClick('/', e)}
									>
										Je suis pâtissier
									</Button>
				{#if data.user}
									<Button
										variant="ghost"
						class="text-sm font-normal text-neutral-700 transition-colors duration-200 hover:text-neutral-900 hover:bg-transparent"
										on:click={(e) => handleNavClick('/dashboard', e)}
									>
										Dashboard
									</Button>
								{/if}
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
					src="/images/logo_icone.svg"
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
						href="/patissiers"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<Search class="h-3.5 w-3.5" />
						<span>Annuaire complet</span>
					</a>
					<a
						href="/gateaux"
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
						href="/patissiers/paris"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Paris</span>
					</a>
					<a
						href="/patissiers/marseille"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Marseille</span>
					</a>
					<a
						href="/patissiers/lyon"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Lyon</span>
					</a>
					<a
						href="/patissiers/toulouse"
						class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						<MapPin class="h-3.5 w-3.5" />
						<span>Toulouse</span>
					</a>
					<a
						href="/patissiers/nice"
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
					<a
						href="/patissiers"
						class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
					>
						Tous les pâtissiers
					</a>
					<a
						href="/gateaux"
							class="text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
						>
						Tous les gâteaux
						</a>
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
						href="https://www.instagram.com/pattyly_com"
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
