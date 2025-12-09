<script lang="ts">
	import { ChevronUp, ChevronDown, Database } from 'lucide-svelte';
	import IndexerRow from './IndexerRow.svelte';
	import type { IndexerWithStatus, IndexerSort } from '$lib/types/indexer';

	interface Props {
		indexers: IndexerWithStatus[];
		selectedIds: Set<string>;
		sort: IndexerSort;
		testingIds: Set<string>;
		onSelect: (id: string, selected: boolean) => void;
		onSelectAll: (selected: boolean) => void;
		onSort: (column: IndexerSort['column']) => void;
		onEdit: (indexer: IndexerWithStatus) => void;
		onDelete: (indexer: IndexerWithStatus) => void;
		onTest: (indexer: IndexerWithStatus) => void;
	}

	let {
		indexers,
		selectedIds,
		sort,
		testingIds,
		onSelect,
		onSelectAll,
		onSort,
		onEdit,
		onDelete,
		onTest
	}: Props = $props();

	const allSelected = $derived(indexers.length > 0 && indexers.every((i) => selectedIds.has(i.id)));
	const someSelected = $derived(indexers.some((i) => selectedIds.has(i.id)) && !allSelected);

	function isSortedBy(column: IndexerSort['column']): boolean {
		return sort.column === column;
	}

	function isAscending(): boolean {
		return sort.direction === 'asc';
	}
</script>

{#if indexers.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-base-content/50">
		<Database class="mb-4 h-12 w-12" />
		<p class="text-lg font-medium">No indexers configured</p>
		<p class="text-sm">Add an indexer to start searching for content</p>
	</div>
{:else}
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th class="w-10">
						<input
							type="checkbox"
							class="checkbox checkbox-sm"
							checked={allSelected}
							indeterminate={someSelected}
							onchange={(e) => onSelectAll(e.currentTarget.checked)}
						/>
					</th>
					<th class="w-24">
						<button
							class="flex items-center gap-1 hover:text-primary"
							onclick={() => onSort('enabled')}
						>
							Status
							{#if isSortedBy('enabled')}
								{#if isAscending()}
									<ChevronUp class="h-3 w-3" />
								{:else}
									<ChevronDown class="h-3 w-3" />
								{/if}
							{/if}
						</button>
					</th>
					<th>
						<button
							class="flex items-center gap-1 hover:text-primary"
							onclick={() => onSort('name')}
						>
							Name
							{#if isSortedBy('name')}
								{#if isAscending()}
									<ChevronUp class="h-3 w-3" />
								{:else}
									<ChevronDown class="h-3 w-3" />
								{/if}
							{/if}
						</button>
					</th>
					<th>Definition</th>
					<th>
						<button
							class="flex items-center gap-1 hover:text-primary"
							onclick={() => onSort('protocol')}
						>
							Protocol
							{#if isSortedBy('protocol')}
								{#if isAscending()}
									<ChevronUp class="h-3 w-3" />
								{:else}
									<ChevronDown class="h-3 w-3" />
								{/if}
							{/if}
						</button>
					</th>
					<th>Search</th>
					<th class="text-center">
						<button
							class="mx-auto flex items-center gap-1 hover:text-primary"
							onclick={() => onSort('priority')}
						>
							Priority
							{#if isSortedBy('priority')}
								{#if isAscending()}
									<ChevronUp class="h-3 w-3" />
								{:else}
									<ChevronDown class="h-3 w-3" />
								{/if}
							{/if}
						</button>
					</th>
					<th>URL</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each indexers as indexer (indexer.id)}
					<IndexerRow
						{indexer}
						selected={selectedIds.has(indexer.id)}
						testing={testingIds.has(indexer.id)}
						{onSelect}
						{onEdit}
						{onDelete}
						{onTest}
					/>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
