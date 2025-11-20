<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import XIcon from 'virtual:icons/lucide/x';
	import { initSmoothScroll, destroySmoothScroll } from '$lib/utils/smooth-scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import '../../app.css';

	const menuItems = {
		'/': 'Accueil',
		'/about': 'À propos',
		'/pricing': 'Tarifs',
		'/faq': 'FAQ',
		'/contact': 'Contact',
	};

	let menuOpen = false;
	let header: HTMLElement;
	let logo: HTMLElement;

	onNavigate((_) => {
		menuOpen = false;
	});

	onMount(() => {
		// Initialize smooth scroll
		initSmoothScroll();

		// Register ScrollTrigger
		if (typeof window !== 'undefined') {
			gsap.registerPlugin(ScrollTrigger);
		}

		// Animate header on scroll
		if (header && logo) {
			ScrollTrigger.create({
				trigger: 'body',
				start: 'top -100',
				onEnter: () => {
					gsap.to(header, {
						backgroundColor: 'rgba(255, 255, 255, 0.95)',
						backdropFilter: 'blur(10px)',
						paddingTop: '0.75rem',
						paddingBottom: '0.75rem',
						boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
						duration: 0.3,
						ease: 'power2.out',
					});
					gsap.to(logo, {
						scale: 0.85,
						duration: 0.3,
						ease: 'power2.out',
					});
				},
				onLeaveBack: () => {
					gsap.to(header, {
						backgroundColor: 'transparent',
						backdropFilter: 'none',
						paddingTop: '1rem',
						paddingBottom: '1rem',
						boxShadow: 'none',
						duration: 0.3,
						ease: 'power2.out',
					});
					gsap.to(logo, {
						scale: 1,
						duration: 0.3,
						ease: 'power2.out',
					});
				},
			});
		}
	});

	onDestroy(() => {
		destroySmoothScroll();
		ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
	});

	export let data;
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
						href="/login"
						variant="ghost"
						class="text-base font-medium text-neutral-700 transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:text-neutral-800"
					>
						Se connecter
					</Button>
					<Button
						href="/register"
						class="rounded-xl bg-[#FF6F61] text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#e85a4f]"
						style="width: 140px; height: 48px;"
					>
						Commencer
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
						<nav class="[&_ul]:flex [&_ul]:flex-col [&_ul]:p-2">
							<ul>
								{#each Object.entries(menuItems) as [href, text]}
									<li>
										<Button
											{href}
											variant="ghost"
											class="w-full py-6 text-base"
										>
											{text}
										</Button>
									</li>
								{/each}
							</ul>
							<Separator />
							<ul class="">
								{#if !data.user}
									<li>
										<Button
											href="/register"
											variant="ghost"
											class="w-full py-6 text-base"
										>
											S'inscrire
										</Button>
									</li>
									<li>
										<Button
											href="/login"
											variant="ghost"
											class="w-full py-6 text-base"
										>
											Se connecter
										</Button>
									</li>
								{:else}
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
											href="/dashboard/settings"
											variant="ghost"
											class="w-full py-6 text-base"
										>
											Paramètres
										</Button>
									</li>
								{/if}
							</ul>
						</nav>
					</Drawer.Content>
				</Drawer.Root>
			</div>
		</div>
	</div>
</header>

<main class="marketing-section">
	<slot />
</main>

<!-- Spacer grows so the footer can be at bottom on short pages -->
<div class="flex-grow"></div>
<footer class="border-t border-border bg-card py-6">
	<div class="container">
		<div class="flex flex-col gap-8 lg:flex-row lg:gap-12">
			<!-- Logo section -->
			<div class="flex-shrink-0">
				<img
					src="/images/logo_icone.svg"
					alt="Logo Pattyly"
					class="h-12 w-20 object-contain transition-transform duration-200 hover:scale-105 sm:h-16 sm:w-28 lg:h-[70px] lg:w-[120px]"
				/>
			</div>
			<!-- Links grid -->
			<div
				class={cn(
					'grid flex-1 grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 lg:grid-cols-5',
					'[&_.col]:flex [&_.col]:flex-col [&_.col]:gap-3',
					'[&_.footer-title]:text-base [&_.footer-title]:font-semibold [&_.footer-title]:text-primary sm:[&_.footer-title]:text-lg',
					'[&_nav]:flex [&_nav]:flex-col [&_nav]:gap-2 [&_nav]:text-muted-foreground sm:[&_nav]:gap-3',
				)}
			>
				<div class="col">
					<span class="footer-title">Menu</span>
					<nav>
						{#each Object.entries(menuItems) as [href, text]}
							<Button
								{href}
								variant="link"
								class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
							>
								{text}
							</Button>
						{/each}
					</nav>
				</div>
				<div class="col">
					<span class="footer-title">Fonctionnalités</span>
					<nav>
						<Button
							href="/boutique-en-ligne-patissier"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Boutique en ligne
						</Button>
						<Button
							href="/logiciel-gestion-patisserie"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Logiciel de gestion
						</Button>
						<Button
							href="/formulaire-commande-gateau"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Formulaire commande
						</Button>
						<Button
							href="/devis-factures-cake-designer"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Devis et factures
						</Button>
					</nav>
				</div>
				<div class="col">
					<span class="footer-title">App</span>
					<nav>
						<Button
							href="/login"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Se connecter
						</Button>
						<Button
							href="/register"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							S'inscrire
						</Button>
					</nav>
				</div>
				<div class="col">
					<span class="footer-title">Légal</span>
					<nav>
						<Button
							href="/cgu"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							CGU
						</Button>
						<Button
							href="/legal"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Mentions légales
						</Button>
						<Button
							href="/privacy"
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
						>
							Confidentialité
						</Button>
					</nav>
				</div>
				<div class="col">
					<span class="footer-title">Retrouvez-nous</span>
					<nav>
						<Button
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
							href="https://www.instagram.com/pattyly.app"
							target="_blank"
						>
							Instagram
						</Button>
						<Button
							variant="link"
							class="block h-auto p-0 text-start text-sm font-normal text-muted-foreground sm:text-base"
							href="https://www.tiktok.com/@pattyly.app"
							target="_blank"
						>
							Tiktok
						</Button>
					</nav>
				</div>
			</div>
		</div>
	</div>
</footer>

<style>
	:root {
		scroll-behavior: smooth;
	}
</style>
