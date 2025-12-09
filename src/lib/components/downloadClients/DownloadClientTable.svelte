<script lang="ts">
	import { Settings, Trash2, ToggleLeft, ToggleRight, Server } from 'lucide-svelte';
	import type { DownloadClient } from '$lib/types/downloadClient';

	interface Props {
		clients: DownloadClient[];
		onEdit: (client: DownloadClient) => void;
		onDelete: (client: DownloadClient) => void;
		onToggle: (client: DownloadClient) => void;
	}

	let { clients, onEdit, onDelete, onToggle }: Props = $props();
</script>

{#if clients.length === 0}
	<div class="py-12 text-center text-base-content/60">
		<Server class="mx-auto mb-4 h-12 w-12 opacity-40" />
		<p class="text-lg font-medium">No download clients configured</p>
		<p class="mt-1 text-sm">Add a download client to start managing downloads</p>
	</div>
{:else}
	<div class="overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Host</th>
					<th>Categories</th>
					<th>Status</th>
					<th class="text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each clients as client (client.id)}
					<tr class="hover">
						<td>
							<div class="flex items-center gap-3">
								<div class="placeholder avatar">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral text-neutral-content"
									>
										<span class="text-xs uppercase">{client.implementation.slice(0, 2)}</span>
									</div>
								</div>
								<div>
									<div class="font-bold">{client.name}</div>
									<div class="text-sm capitalize opacity-50">{client.implementation}</div>
								</div>
							</div>
						</td>
						<td>
							<div class="font-mono text-sm">
								{client.useSsl ? 'https' : 'http'}://{client.host}:{client.port}
							</div>
						</td>
						<td>
							<div class="flex flex-col gap-1">
								<span class="badge badge-ghost badge-sm">Movies: {client.movieCategory}</span>
								<span class="badge badge-ghost badge-sm">TV: {client.tvCategory}</span>
							</div>
						</td>
						<td>
							<span class="badge {client.enabled ? 'badge-success' : 'badge-ghost'}">
								{client.enabled ? 'Enabled' : 'Disabled'}
							</span>
						</td>
						<td>
							<div class="flex justify-end gap-1">
								<button
									class="btn btn-ghost btn-sm"
									onclick={() => onToggle(client)}
									title={client.enabled ? 'Disable' : 'Enable'}
								>
									{#if client.enabled}
										<ToggleRight class="h-4 w-4 text-success" />
									{:else}
										<ToggleLeft class="h-4 w-4" />
									{/if}
								</button>
								<button class="btn btn-ghost btn-sm" onclick={() => onEdit(client)} title="Edit">
									<Settings class="h-4 w-4" />
								</button>
								<button
									class="btn text-error btn-ghost btn-sm"
									onclick={() => onDelete(client)}
									title="Delete"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
