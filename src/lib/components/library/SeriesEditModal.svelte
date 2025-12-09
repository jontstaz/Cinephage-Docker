<script lang="ts">
	import { X, Loader2 } from 'lucide-svelte';

	interface SeriesData {
		title: string;
		year: number | null;
		monitored: boolean | null;
		scoringProfileId: string | null;
		rootFolderId: string | null;
		seasonFolder: boolean | null;
		wantsSubtitles: boolean | null;
	}

	interface QualityProfile {
		id: string;
		name: string;
		description: string;
		isBuiltIn: boolean;
		isDefault: boolean;
	}

	interface RootFolder {
		id: string;
		name: string;
		path: string;
		mediaType: string;
		freeSpaceBytes: number | null;
	}

	interface Props {
		open: boolean;
		series: SeriesData;
		qualityProfiles: QualityProfile[];
		rootFolders: RootFolder[];
		saving: boolean;
		onClose: () => void;
		onSave: (data: SeriesEditData) => void;
	}

	export interface SeriesEditData {
		monitored: boolean;
		scoringProfileId: string | null;
		rootFolderId: string | null;
		seasonFolder: boolean;
		wantsSubtitles: boolean;
	}

	let { open, series, qualityProfiles, rootFolders, saving, onClose, onSave }: Props = $props();

	// Form state (defaults only, effect syncs from props)
	let monitored = $state(true);
	let qualityProfileId = $state('');
	let rootFolderId = $state('');
	let seasonFolder = $state(true);
	let wantsSubtitles = $state(true);

	// Reset form when modal opens
	$effect(() => {
		if (open) {
			monitored = series.monitored ?? true;
			qualityProfileId = series.scoringProfileId ?? '';
			rootFolderId = series.rootFolderId ?? '';
			seasonFolder = series.seasonFolder ?? true;
			wantsSubtitles = series.wantsSubtitles ?? true;
		}
	});

	// Get the current quality profile for description display
	let currentProfile = $derived(qualityProfiles.find((p) => p.id === qualityProfileId));

	function formatBytes(bytes: number | null): string {
		if (!bytes) return 'Unknown';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function handleSave() {
		onSave({
			monitored,
			scoringProfileId: qualityProfileId || null,
			rootFolderId: rootFolderId || null,
			seasonFolder,
			wantsSubtitles
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="modal-open modal">
		<div class="modal-box max-w-lg">
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-bold">Edit Series</h3>
				<button class="btn btn-circle btn-ghost btn-sm" onclick={onClose}>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Series info -->
			<div class="mb-6 rounded-lg bg-base-200 p-3">
				<div class="font-medium">{series.title}</div>
				{#if series.year}
					<div class="text-sm text-base-content/60">{series.year}</div>
				{/if}
			</div>

			<!-- Form -->
			<div class="space-y-4">
				<!-- Monitored -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input type="checkbox" bind:checked={monitored} class="toggle toggle-primary" />
						<div>
							<span class="label-text font-medium">Monitored</span>
							<p class="text-xs text-base-content/60">Search for new episodes automatically</p>
						</div>
					</label>
				</div>

				<!-- Season Folder -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input type="checkbox" bind:checked={seasonFolder} class="toggle toggle-secondary" />
						<div>
							<span class="label-text font-medium">Season Folders</span>
							<p class="text-xs text-base-content/60">
								Organize episodes into season folders (e.g., /Season 01/)
							</p>
						</div>
					</label>
				</div>

				<!-- Wants Subtitles -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input type="checkbox" bind:checked={wantsSubtitles} class="toggle toggle-primary" />
						<div>
							<span class="label-text font-medium">Auto-Download Subtitles</span>
							<p class="text-xs text-base-content/60">
								Automatically search and download subtitles for episodes
							</p>
						</div>
					</label>
				</div>

				<!-- Quality Profile -->
				<div class="form-control">
					<label class="label" for="series-quality-profile">
						<span class="label-text font-medium">Quality Profile</span>
					</label>
					<select
						id="series-quality-profile"
						bind:value={qualityProfileId}
						class="select-bordered select w-full"
					>
						<option value=""
							>Default ({qualityProfiles.find((p) => p.isDefault)?.name ??
								'System Default'})</option
						>
						{#each qualityProfiles as profile (profile.id)}
							<option value={profile.id}>
								{profile.name}
								{profile.isBuiltIn ? '' : '(Custom)'}
							</option>
						{/each}
					</select>
					<div class="label">
						<span class="label-text-alt text-base-content/60">
							{#if currentProfile}
								{currentProfile.description}
							{:else}
								Controls quality scoring and upgrade behavior
							{/if}
						</span>
					</div>
				</div>

				<!-- Root Folder -->
				<div class="form-control">
					<label class="label" for="series-root-folder">
						<span class="label-text font-medium">Root Folder</span>
					</label>
					<select
						id="series-root-folder"
						bind:value={rootFolderId}
						class="select-bordered select w-full"
					>
						<option value="">Not set</option>
						{#each rootFolders as folder (folder.id)}
							<option value={folder.id}>
								{folder.path}
								{#if folder.freeSpaceBytes}
									({formatBytes(folder.freeSpaceBytes)} free)
								{/if}
							</option>
						{/each}
					</select>
					<div class="label">
						<span class="label-text-alt text-base-content/60">
							Where downloaded files will be stored
						</span>
					</div>
				</div>
			</div>

			<!-- Actions -->
			<div class="modal-action">
				<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleSave} disabled={saving}>
					{#if saving}
						<Loader2 class="h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop border-none bg-black/50"
			onclick={onClose}
			aria-label="Close modal"
		></button>
	</div>
{/if}
