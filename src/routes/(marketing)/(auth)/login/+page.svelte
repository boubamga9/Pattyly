<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import type { AuthChangeEvent } from '@supabase/supabase-js';
	import { onMount } from 'svelte';
	import { WebsiteName } from '../../../../config';
	import SocialsAuth from '../components/socials-auth.svelte';
	import LoginForm from './login-form.svelte';

	export let data;

	let { supabase } = data;

	onMount(() => {
		supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
			// Redirect to account after sucessful login
			if (event == 'SIGNED_IN') {
				// Delay needed because order of callback not guaranteed.
				// Give the layout callback priority to update state or
				// we'll just bounch back to login when /dashboard tries to load
				setTimeout(() => {
					goto('/dashboard');
				}, 1);
			}
		});
	});
</script>

<svelte:head>
	<title>Se connecter - {WebsiteName}</title>
	<meta
		name="description"
		content="Connectez-vous à votre compte Pattyly pour accéder à votre dashboard de gestion de pâtisserie."
	/>
	<meta
		name="keywords"
		content="connexion, login, pâtisserie, gestion, dashboard"
	/>
</svelte:head>

{#if $page.url.searchParams.get('verified') == 'true'}
	<div role="alert" class="alert alert-success mb-5">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6 shrink-0 stroke-current"
			fill="none"
			viewBox="0 0 24 24"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/></svg
		>
		<span>Email vérifié ! Tu peux maintenant te connecter.</span>
	</div>
{/if}

<!-- Formulaire de connexion normal -->
<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
			>
				Se connecter <span class="sr-only">à {WebsiteName}</span>
			</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<SocialsAuth />

			<div class="flex flex-col gap-3">
				<p class="text-center text-sm text-neutral-700">
					Connecte-toi à ton compte avec ton adresse email ci-dessous.
				</p>
				<LoginForm data={data.form} />
				<div class="mt-4 text-center text-sm text-neutral-600">
					Tu n&apos;as pas encore de compte ?
					<a
						href="/register"
						class="text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
						>Créer un compte</a
					>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
