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
			</div>
		</div>
	</div>
</header>

<main>
	<slot />
</main>

<!-- Footer -->
<footer class="border-t border-neutral-200 bg-white">
	<!-- Logo en haut, centré -->
	<div class="bg-gradient-to-b from-[#FFE8D6]/10 to-transparent py-12">
		<div class="container flex flex-col items-center gap-6">
			<a href="/" class="inline-block">
				<img
					src="/images/logo_icone.svg"
					alt="Logo Pattyly"
					class="h-16 w-28 object-contain transition-transform duration-200 hover:scale-105 lg:h-[70px] lg:w-[120px]"
				/>
			</a>
			<!-- Réseaux sociaux -->
			<div class="flex items-center gap-4">
				<a
					href="https://www.instagram.com/pattyly_com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
					aria-label="Instagram"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path fill-rule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clip-rule="evenodd" />
					</svg>
				</a>
				<a
					href="https://www.tiktok.com/@pattyly.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
					aria-label="TikTok"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.07 6.07 0 00-.79-.05A6.67 6.67 0 005 20.1a6.67 6.67 0 0010.86-5.22v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.31z"/>
					</svg>
				</a>
			</div>
		</div>
	</div>

	<!-- Séparateur -->
	<div class="container">
		<div class="mx-auto max-w-7xl border-t border-neutral-200"></div>
	</div>

	<!-- Deux sections principales (inversées) -->
	<div class="container py-16">
		<div class="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_auto_1fr] lg:gap-16">
			<!-- Section 1: Pour les Clients (Marketplace) - À GAUCHE -->
			<div class="space-y-6 border-b border-neutral-200 pb-12 lg:border-b-0 lg:pb-0">
				<!-- En-tête de section avec badge -->
				<div class="space-y-2">
					<div class="inline-flex items-center gap-2 rounded-full bg-[#FF6F61]/10 px-4 py-1.5">
						<Cake class="h-4 w-4 text-[#FF6F61]" />
						<span class="text-xs font-semibold uppercase tracking-wider text-[#FF6F61]">
							Pour les Clients
						</span>
					</div>
					<h3 class="text-2xl font-semibold text-neutral-900">
						Marketplace
					</h3>
					<p class="text-sm text-neutral-600">
						Trouvez le gâteau parfait près de chez vous
					</p>
				</div>

				<!-- Navigation -->
				<nav class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<!-- Recherche -->
					<div class="space-y-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
							Recherche
						</p>
						<div class="flex flex-col gap-2">
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
								<span>Découvrir les créations</span>
							</a>
						</div>
					</div>

					<!-- Types de gâteaux -->
					<div class="space-y-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
							Types de gâteaux
						</p>
						<div class="flex flex-col gap-2">
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
						</div>
					</div>
				</nav>

				<!-- Villes populaires -->
				<div class="space-y-3 pt-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
						Villes populaires
					</p>
					<div class="flex flex-wrap gap-2">
						<a
							href="/patissiers/paris"
							class="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
						>
							<MapPin class="h-3 w-3" />
							<span>Paris</span>
						</a>
						<a
							href="/patissiers/marseille"
							class="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
						>
							<MapPin class="h-3 w-3" />
							<span>Marseille</span>
						</a>
						<a
							href="/patissiers/lyon"
							class="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
						>
							<MapPin class="h-3 w-3" />
							<span>Lyon</span>
						</a>
						<a
							href="/patissiers/toulouse"
							class="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
						>
							<MapPin class="h-3 w-3" />
							<span>Toulouse</span>
						</a>
						<a
							href="/patissiers/nice"
							class="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-600 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61]/5 hover:text-[#FF6F61]"
						>
							<MapPin class="h-3 w-3" />
							<span>Nice</span>
						</a>
					</div>
				</div>
			</div>

			<!-- Séparateur vertical (desktop) -->
			<div class="hidden lg:block">
				<div class="h-full w-px bg-gradient-to-b from-transparent via-neutral-200 to-transparent"></div>
			</div>

			<!-- Section 2: Pour les Pâtissiers (Logiciel de gestion) - À DROITE -->
			<div class="space-y-6">
				<!-- En-tête de section avec badge -->
				<div class="space-y-2">
					<div class="inline-flex items-center gap-2 rounded-full bg-[#FF6F61]/10 px-4 py-1.5">
						<Settings class="h-4 w-4 text-[#FF6F61]" />
						<span class="text-xs font-semibold uppercase tracking-wider text-[#FF6F61]">
							Pour les Pâtissiers
						</span>
					</div>
					<h3 class="text-2xl font-semibold text-neutral-900">
						Logiciel de gestion
					</h3>
					<p class="text-sm text-neutral-600">
						Tout ce dont vous avez besoin pour gérer votre activité de cake designer
					</p>
				</div>

				<!-- Navigation -->
				<nav class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<!-- Informations générales -->
					<div class="space-y-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
							Informations
						</p>
						<div class="flex flex-col gap-2">
							<a
								href="/about"
								class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
							>
								<Info class="h-3.5 w-3.5" />
								<span>À propos</span>
							</a>
							<a
								href="/pricing"
								class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
							>
								<DollarSign class="h-3.5 w-3.5" />
								<span>Tarifs</span>
							</a>
							<a
								href="/contact"
								class="flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-[#FF6F61]"
							>
								<Mail class="h-3.5 w-3.5" />
								<span>Contact</span>
							</a>
						</div>
					</div>

					<!-- Solutions -->
					<div class="space-y-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
							Solutions
						</p>
						<div class="flex flex-col gap-2">
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
						</div>
					</div>
				</nav>

				<!-- Accès rapide -->
				<div class="space-y-3 pt-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
						Prêt à simplifier votre gestion ?
					</p>
					<div class="flex flex-wrap gap-3">
						<a
							href="/register"
							class="rounded-lg bg-[#FF6F61] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#e85a4f] hover:scale-105"
						>
							Commencer gratuitement
						</a>
						<a
							href="/login"
							class="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-[#FF6F61] hover:text-[#FF6F61]"
						>
							Se connecter
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Section inférieure : Légal & Copyright -->
		<div class="mt-16 border-t border-neutral-200 pt-12">
			<div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
				<!-- Légal -->
				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
						Légal
					</p>
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
				</div>

				<!-- Copyright -->
				<div class="space-y-3 sm:text-right">
					<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
						© {new Date().getFullYear()} Pattyly
					</p>
					<p class="text-xs text-neutral-500">
						Tous droits réservés
					</p>
				</div>
			</div>
		</div>
	</div>
</footer>
