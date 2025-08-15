<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import Trash from '~icons/lucide/trash-2';
	import DeleteAccountForm from './delete-account-form.svelte';
	import EmailForm from './email-form.svelte';
	import ChangePasswordForm from './change-password-form.svelte';
	import CreatePasswordForm from './create-password-form.svelte';

	export let data;
	export let form;
</script>

<svelte:head>
	<title>Profile | Settings</title>
</svelte:head>

{#if form?.success}
	<p class="text-green-700">{form.success}</p>
{/if}

<EmailForm data={data.emailForm} user={data.user} />

{#if data.createPassword || data.recoverySession}
	<CreatePasswordForm
		data={data.createPasswordForm}
		user={data.user}
		recoverySession={data.recoverySession}
	/>
{:else}
	<ChangePasswordForm data={data.changePasswordForm} user={data.user} />
{/if}

<Card.Root class="border-destructive bg-destructive/5 text-destructive">
	<Card.Header>
		<Card.Title>Delete Account</Card.Title>
		<Card.Description class="text-destructive">
			Permanently delete your account. This action is irreversible.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if data.deleteAccountForm}
			<Dialog.Root>
				<Dialog.Trigger asChild let:builder>
					<Button
						variant="destructive"
						class="flex flex-nowrap items-center gap-2"
						builders={[builder]}
					>
						<Trash class="h-4 w-4" />
						Delete Account
					</Button>
				</Dialog.Trigger>
				<Dialog.Content class="border-destructive">
					<Dialog.Header>
						<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
						<Dialog.Description>
							This action cannot be undone. This will permanently delete your
							account and remove your data from our servers. Any of your active
							subscriptions will be cancelled automatically.
						</Dialog.Description>
					</Dialog.Header>

					<DeleteAccountForm data={data.deleteAccountForm} />
				</Dialog.Content>
			</Dialog.Root>
		{:else}
			<p>
				To be able to delete your account, you have to have a password set up.
				You can setup your password in the <a
					href="/settings/security"
					class="underline">security settings</a
				>.
			</p>
		{/if}
	</Card.Content>
</Card.Root>
