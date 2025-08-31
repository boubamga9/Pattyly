<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import ContactForm from './contact-form.svelte';
	import { WebsiteName } from '../../../config';

	export let data;
</script>

<svelte:head>
	<title>Contact - {WebsiteName}</title>
	<meta
		name="description"
		content="Contactez l'équipe Pattyly pour toute question sur notre plateforme de gestion pour pâtissiers."
	/>
	<meta name="keywords" content="contact, support, aide, pâtisserie, gestion" />
</svelte:head>

<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-lg rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
				>Nous contacter</Card.Title
			>
			<Card.Description class="text-neutral-700"
				>Dis-nous comment on peut t'aider.</Card.Description
			>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<ContactForm data={data.form} />
		</Card.Content>
	</Card.Root>
</div>
