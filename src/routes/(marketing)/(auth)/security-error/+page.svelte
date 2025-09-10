<script lang="ts">
	import * as Card from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>Erreur de sécurité - Pattyly</title>
	<meta
		name="description"
		content="Mot de passe actuel incorrect - Vous avez été déconnecté"
	/>
</svelte:head>

<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
			>
				<svg
					class="h-8 w-8 text-red-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
			>
				Erreur de sécurité
			</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4 text-center">
			<p class="text-neutral-700">
				Vous avez tenté de modifier votre compte avec un <strong
					class="text-neutral-900">mot de passe actuel incorrect</strong
				> et avez été déconnecté.
			</p>
			<div class="mt-4 rounded-lg bg-red-50 p-4">
				<p class="text-xs text-red-600">
					🔒 <strong>Sécurité :</strong> Cette mesure protège votre compte contre
					les modifications non autorisées.
				</p>
			</div>
			<div class="mt-4 flex flex-col gap-3">
				<a
					href="/login"
					class="w-full rounded-lg bg-[#FF6F61] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#e85a4f]"
				>
					Se reconnecter
				</a>
				<a
					href="/forgot-password"
					class="text-sm text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
				>
					Réinitialiser le mot de passe
				</a>
			</div>
		</Card.Content>
	</Card.Root>
</div>
