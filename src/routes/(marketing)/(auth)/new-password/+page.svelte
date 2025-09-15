<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import NewPasswordForm from './new-password-form.svelte';

	export let data;
</script>

<svelte:head>
	<title>Nouveau mot de passe - Pattyly</title>
	<meta name="description" content="Définissez votre nouveau mot de passe" />
	<meta
		name="keywords"
		content="nouveau mot de passe, réinitialisation, sécurité, pâtisserie"
	/>
</svelte:head>

<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
			>
				<svg
					class="h-8 w-8 text-blue-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
					/>
				</svg>
			</div>
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
			>
				Nouveau mot de passe
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<NewPasswordForm data={data.form} />
		</Card.Content>
	</Card.Root>
</div>
