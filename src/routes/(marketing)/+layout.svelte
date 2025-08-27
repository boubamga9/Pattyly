<script>
	import { onNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';
	import MenuIcon from 'virtual:icons/lucide/menu';
	import XIcon from 'virtual:icons/lucide/x';
	import '../../app.css';

	const menuItems = {
		'/': 'Accueil',
		'/pricing': 'Tarifs',
		'/contact': 'Contact',
	};

	let menuOpen = false;
	onNavigate((_) => {
		menuOpen = false;
	});

	export let data;
</script>

<!-- Navbar integrated in Hero section with transparent background -->
<header
	class="marketing-section absolute top-0 z-10 w-full py-4"
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
											href="/settings"
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
	<div class="container flex flex-col gap-12">
		<div class="flex flex-col flex-wrap gap-12 sm:flex-row">
			<div class="flex-[0.3]">
				<img
					src="/images/logo_icone.svg"
					alt="Logo Pattyly"
					class="h-[70px] w-[120px] object-contain transition-transform duration-200 hover:scale-105"
				/>
			</div>
			<div
				class={cn(
					'grid flex-1 grid-cols-2 gap-8 p-4 sm:grid-cols-4',
					'[&_.col]:flex [&_.col]:flex-col [&_.col]:gap-3',
					'[&_.footer-title]:text-lg [&_.footer-title]:font-semibold [&_.footer-title]:text-primary',
					'[&_nav]:flex [&_nav]:flex-col [&_nav]:gap-3 [&_nav]:text-muted-foreground',
				)}
			>
				<div class="col">
					<span class="footer-title">Menu</span>
					<nav>
						{#each Object.entries(menuItems) as [href, text]}
							<Button
								{href}
								variant="link"
								class="block h-auto p-0 text-start text-base font-normal text-muted-foreground"
							>
								{text}
							</Button>
						{/each}
					</nav>
				</div>
				<div class="col">
					<span class="footer-title">App</span>
					<nav>
						<Button
							href="/login"
							variant="link"
							class="block h-auto p-0 text-start text-base font-normal text-muted-foreground"
						>
							Se connecter
						</Button>
						<Button
							href="/register"
							variant="link"
							class="block h-auto p-0 text-start text-base font-normal text-muted-foreground"
						>
							S'inscrire
						</Button>
					</nav>
				</div>
				<div class="col">
					<span class="footer-title">Retrouvez-nous</span>
					<nav>
						<Button
							variant="link"
							class="block h-auto p-0 text-start text-base font-normal text-muted-foreground"
							href="/"
							target="_blank"
						>
							Instagram
						</Button>
						<Button
							variant="link"
							class="block h-auto p-0 text-start text-base font-normal text-muted-foreground"
							href="/"
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
