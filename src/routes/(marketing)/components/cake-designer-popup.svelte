<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { X, Cake, ChefHat } from 'lucide-svelte';

	let showPopup = false;
	let hasInteracted = false;
	let hasScrolled = false;

	// Vérifier si l'utilisateur a déjà répondu (via localStorage)
	const STORAGE_KEY = 'pattyly_cake_designer_popup_answered';

	onMount(() => {
		// Ne pas afficher si l'utilisateur a déjà répondu
		if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) {
			return;
		}

		// Afficher après 1 seconde OU après scroll de 30%
		const timer = setTimeout(() => {
			if (!hasScrolled && !hasInteracted) {
				showPopup = true;
			}
		}, 1000);

		const handleScroll = () => {
			if (!hasScrolled && window.scrollY > window.innerHeight * 0.3) {
				hasScrolled = true;
				if (!hasInteracted) {
					showPopup = true;
				}
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			clearTimeout(timer);
			window.removeEventListener('scroll', handleScroll);
		};
	});

	function handleGourmand() {
		hasInteracted = true;
		showPopup = false;
		
		// Sauvegarder la réponse pour ne plus afficher la popup
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, 'gourmand');
		}

		// Rediriger vers tous les gateaux
		goto('/gateaux');
	}

	function handleCreateur() {
		hasInteracted = true;
		showPopup = false;
		
		// Sauvegarder la réponse pour ne plus afficher la popup
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, 'createur');
		}

		// Rester sur la home page (popup se ferme)
	}
</script>

{#if showPopup}
	<!-- Overlay avec animation -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="popup-title"
	>
		<!-- Popup avec animation -->
		<div
			class="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
			on:click|stopPropagation
		>
			<!-- Bouton fermer -->
			<button
				on:click={handleCreateur}
				class="absolute right-4 top-4 z-10 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
				aria-label="Fermer"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Contenu : Deux colonnes -->
			<div class="flex flex-col sm:flex-row">
				<!-- Côté Gourmand -->
				<button
					on:click={handleGourmand}
					class="group flex flex-1 flex-col items-center justify-center p-8 text-center transition-all hover:bg-[#FFE8D6]/20 sm:p-12"
				>
					<!-- Icône -->
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE8D6] transition-transform group-hover:scale-110">
						<Cake class="h-8 w-8 text-[#FF6F61]" />
					</div>

					<!-- Label -->
					<span class="mb-2 text-sm font-semibold uppercase tracking-wider text-[#FF6F61]">
						Gourmand
					</span>

					<!-- Titre -->
					<h2 class="mb-3 text-2xl font-semibold text-neutral-900">
						Je cherche un cake designer
					</h2>

					<!-- Description -->
					<p class="text-base leading-relaxed text-neutral-600">
						Trouve un pâtissier près de chez toi et commande en ligne.
					</p>
				</button>

				<!-- Divider vertical -->
				<div class="hidden h-auto w-px bg-neutral-200 sm:block"></div>
				<!-- Divider horizontal pour mobile -->
				<div class="h-px w-full bg-neutral-200 sm:hidden"></div>

				<!-- Côté Créateur -->
				<button
					on:click={handleCreateur}
					class="group flex flex-1 flex-col items-center justify-center p-8 text-center transition-all hover:bg-[#FFE8D6]/20 sm:p-12"
				>
					<!-- Icône -->
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE8D6] transition-transform group-hover:scale-110">
						<ChefHat class="h-8 w-8 text-[#FF6F61]" />
					</div>

					<!-- Label -->
					<span class="mb-2 text-sm font-semibold uppercase tracking-wider text-[#FF6F61]">
						Créateur
					</span>

					<!-- Titre -->
					<h2 class="mb-3 text-2xl font-semibold text-neutral-900">
						Je suis cake designer
					</h2>

					<!-- Description -->
					<p class="text-base leading-relaxed text-neutral-600">
						Gère ta boutique en ligne, tes commandes et attire de nouveaux clients.
					</p>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes zoom-in-95 {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-in {
		animation-fill-mode: both;
	}

	.fade-in {
		animation: fade-in 200ms ease-out;
	}

	.zoom-in-95 {
		animation: zoom-in-95 200ms ease-out;
	}
</style>

