<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Plus } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type {
		RootFolder,
		RootFolderFormData,
		PathValidationResult
	} from '$lib/types/downloadClient';

	import { RootFolderModal, RootFolderList } from '$lib/components/rootFolders';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Root Folder state
	let folderModalOpen = $state(false);
	let folderModalMode = $state<'add' | 'edit'>('add');
	let editingFolder = $state<RootFolder | null>(null);
	let folderSaving = $state(false);
	let folderSaveError = $state<string | null>(null);
	let confirmFolderDeleteOpen = $state(false);
	let deleteFolderTarget = $state<RootFolder | null>(null);

	// Root Folder Functions
	function openAddFolderModal() {
		folderModalMode = 'add';
		editingFolder = null;
		folderSaveError = null;
		folderModalOpen = true;
	}

	function openEditFolderModal(folder: RootFolder) {
		folderModalMode = 'edit';
		editingFolder = folder;
		folderSaveError = null;
		folderModalOpen = true;
	}

	function closeFolderModal() {
		folderModalOpen = false;
		editingFolder = null;
		folderSaveError = null;
	}

	async function handleValidatePath(path: string): Promise<PathValidationResult> {
		try {
			const response = await fetch('/api/root-folders/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path })
			});
			return await response.json();
		} catch (e) {
			return {
				valid: false,
				exists: false,
				writable: false,
				error: e instanceof Error ? e.message : 'Unknown error'
			};
		}
	}

	async function handleFolderSave(formData: RootFolderFormData) {
		folderSaving = true;
		folderSaveError = null;
		try {
			const form = new FormData();
			form.append('data', JSON.stringify(formData));

			let response: Response;
			if (folderModalMode === 'edit' && editingFolder) {
				form.append('id', editingFolder.id);
				response = await fetch(`?/updateRootFolder`, {
					method: 'POST',
					body: form
				});
			} else {
				response = await fetch(`?/createRootFolder`, {
					method: 'POST',
					body: form
				});
			}

			// Parse the response to check for errors
			const result = await response.json();

			// SvelteKit form actions return data in a specific format
			if (result.type === 'failure' || result.data?.rootFolderError) {
				const errorMessage = result.data?.rootFolderError || 'Failed to save root folder';
				folderSaveError = errorMessage;
				return; // Don't close modal on error
			}

			await invalidateAll();
			closeFolderModal();
		} catch (error) {
			folderSaveError = error instanceof Error ? error.message : 'An unexpected error occurred';
		} finally {
			folderSaving = false;
		}
	}

	async function handleFolderDelete() {
		if (!editingFolder) return;
		const form = new FormData();
		form.append('id', editingFolder.id);
		await fetch(`?/deleteRootFolder`, {
			method: 'POST',
			body: form
		});
		await invalidateAll();
		closeFolderModal();
	}

	function confirmFolderDelete(folder: RootFolder) {
		deleteFolderTarget = folder;
		confirmFolderDeleteOpen = true;
	}

	async function handleConfirmFolderDelete() {
		if (!deleteFolderTarget) return;
		const form = new FormData();
		form.append('id', deleteFolderTarget.id);
		await fetch(`?/deleteRootFolder`, {
			method: 'POST',
			body: form
		});
		await invalidateAll();
		confirmFolderDeleteOpen = false;
		deleteFolderTarget = null;
	}
</script>

<div class="w-full p-4">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">General Settings</h1>
		<p class="text-base-content/70">
			Configure general application settings and media library folders.
		</p>
	</div>

	<!-- Root Folders Section -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold">Root Folders</h2>
				<p class="text-base-content/70">
					Configure media library folders where content will be organized.
				</p>
			</div>
			<button class="btn gap-2 btn-primary" onclick={openAddFolderModal}>
				<Plus class="h-4 w-4" />
				Add Folder
			</button>
		</div>

		{#if form?.rootFolderError}
			<div class="mb-4 alert alert-error">
				<span>{form.rootFolderError}</span>
			</div>
		{/if}

		{#if form?.rootFolderSuccess}
			<div class="mb-4 alert alert-success">
				<span>Operation completed successfully!</span>
			</div>
		{/if}

		<RootFolderList
			folders={data.rootFolders}
			onEdit={openEditFolderModal}
			onDelete={confirmFolderDelete}
		/>
	</div>
</div>

<!-- Root Folder Modal -->
<RootFolderModal
	open={folderModalOpen}
	mode={folderModalMode}
	folder={editingFolder}
	saving={folderSaving}
	error={folderSaveError}
	onClose={closeFolderModal}
	onSave={handleFolderSave}
	onDelete={handleFolderDelete}
	onValidatePath={handleValidatePath}
/>

<!-- Root Folder Delete Confirmation Modal -->
{#if confirmFolderDeleteOpen}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Confirm Delete</h3>
			<p class="py-4">
				Are you sure you want to delete <strong>{deleteFolderTarget?.name}</strong>? This action
				cannot be undone.
			</p>
			<div class="modal-action">
				<button class="btn btn-ghost" onclick={() => (confirmFolderDeleteOpen = false)}
					>Cancel</button
				>
				<button class="btn btn-error" onclick={handleConfirmFolderDelete}>Delete</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop cursor-default border-none bg-black/50"
			onclick={() => (confirmFolderDeleteOpen = false)}
			aria-label="Close modal"
		></button>
	</div>
{/if}
