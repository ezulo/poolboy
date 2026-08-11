<script lang="ts">
	import { enhance } from '$app/forms';
	import { getRanges, getReadingStatus } from '$lib/calculations';

	let { data } = $props();

	let showAddPool = $state(false);
	let formLoading = $state(false);

	function formatDate(date: Date | null): string {
		if (!date) return 'Never';
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(date));
	}

	function statusClass(status: ReturnType<typeof getReadingStatus>): string {
		switch (status) {
			case 'good':
				return 'text-green-400';
			case 'warning':
				return 'text-yellow-400';
			case 'danger':
				return 'text-red-400';
			default:
				return 'text-gray-500';
		}
	}
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">
	<header class="border-b border-gray-800 bg-gray-900/80 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
			<h1 class="text-2xl font-bold text-blue-400">Poolboy</h1>
			<button
				onclick={() => (showAddPool = !showAddPool)}
				class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
			>
				{showAddPool ? 'Cancel' : '+ Add Pool'}
			</button>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-8">
		{#if showAddPool}
			<form
				method="POST"
				action="?/createPool"
				use:enhance={() => {
					formLoading = true;
					return async ({ update }) => {
						await update();
						formLoading = false;
						showAddPool = false;
					};
				}}
				class="mb-8 rounded-xl border border-gray-700 bg-gray-800 p-6"
			>
				<h2 class="mb-4 text-lg font-semibold">Add New Pool</h2>
				<div class="grid gap-4 sm:grid-cols-3">
					<div>
						<label for="name" class="mb-1 block text-sm text-gray-400">Pool Name</label>
						<input
							type="text"
							id="name"
							name="name"
							required
							placeholder="Backyard Pool"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="type" class="mb-1 block text-sm text-gray-400">Pool Type</label>
						<select
							id="type"
							name="type"
							required
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						>
							<option value="chlorine">Chlorine</option>
							<option value="saltwater">Saltwater</option>
						</select>
					</div>
					<div>
						<label for="volumeGallons" class="mb-1 block text-sm text-gray-400"
							>Volume (gallons)</label
						>
						<input
							type="number"
							id="volumeGallons"
							name="volumeGallons"
							required
							min="100"
							placeholder="15000"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
				</div>
				<button
					type="submit"
					disabled={formLoading}
					class="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-medium transition hover:bg-blue-500 disabled:opacity-50"
				>
					{formLoading ? 'Adding...' : 'Add Pool'}
				</button>
			</form>
		{/if}

		{#if data.pools.length === 0}
			<div class="rounded-xl border border-gray-700 bg-gray-800 p-12 text-center">
				<div class="mb-4 text-5xl">🏊</div>
				<h2 class="mb-2 text-xl font-semibold">No pools yet</h2>
				<p class="text-gray-400">Add your first pool to start tracking water chemistry.</p>
			</div>
		{:else}
			<div class="grid gap-6">
				{#each data.pools as pool}
					{@const test = pool.latestTest}
					{@const ranges = getRanges(pool.type)}
					<div class="rounded-xl border border-gray-700 bg-gray-800 p-6">
						<div class="mb-4 flex items-start justify-between">
							<div>
								<h2 class="text-xl font-semibold">{pool.name}</h2>
								<p class="text-sm text-gray-400">
									{pool.type === 'saltwater' ? 'Saltwater' : 'Chlorine'} &bull;
									{pool.volumeGallons.toLocaleString()} gal
								</p>
							</div>
							<a
								href="/pool/{pool.id}/test"
								class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium transition hover:bg-green-500"
							>
								+ Log Test
							</a>
						</div>

						{#if test}
							<div class="mb-3 text-xs text-gray-500">
								Last tested: {formatDate(test.testedAt)}
							</div>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
								<div class="rounded-lg bg-gray-700/50 p-3">
									<div class="text-xs text-gray-400">Free Cl</div>
									<div class={statusClass(getReadingStatus(test.freeChlorine, ranges.freeChlorine))}>
										{test.freeChlorine ?? '-'} <span class="text-xs">ppm</span>
									</div>
								</div>
								<div class="rounded-lg bg-gray-700/50 p-3">
									<div class="text-xs text-gray-400">pH</div>
									<div class={statusClass(getReadingStatus(test.ph, ranges.ph))}>
										{test.ph ?? '-'}
									</div>
								</div>
								<div class="rounded-lg bg-gray-700/50 p-3">
									<div class="text-xs text-gray-400">Alkalinity</div>
									<div class={statusClass(getReadingStatus(test.alkalinity, ranges.alkalinity))}>
										{test.alkalinity ?? '-'} <span class="text-xs">ppm</span>
									</div>
								</div>
								<div class="rounded-lg bg-gray-700/50 p-3">
									<div class="text-xs text-gray-400">CYA</div>
									<div class={statusClass(getReadingStatus(test.cyanuricAcid, ranges.cyanuricAcid))}>
										{test.cyanuricAcid ?? '-'} <span class="text-xs">ppm</span>
									</div>
								</div>
								<div class="rounded-lg bg-gray-700/50 p-3">
									<div class="text-xs text-gray-400">Calcium</div>
									<div class={statusClass(getReadingStatus(test.calcium, ranges.calcium))}>
										{test.calcium ?? '-'} <span class="text-xs">ppm</span>
									</div>
								</div>
								{#if pool.type === 'saltwater' && ranges.salt}
									<div class="rounded-lg bg-gray-700/50 p-3">
										<div class="text-xs text-gray-400">Salt</div>
										<div class={statusClass(getReadingStatus(test.salt, ranges.salt))}>
											{test.salt ?? '-'} <span class="text-xs">ppm</span>
										</div>
									</div>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-gray-500">No tests recorded yet.</p>
						{/if}

						<div class="mt-4 flex gap-3 border-t border-gray-700 pt-4">
							<a
								href="/pool/{pool.id}"
								class="text-sm text-blue-400 hover:text-blue-300"
							>
								View History
							</a>
							<form
								method="POST"
								action="?/deletePool"
								use:enhance={() => {
									if (!confirm('Delete this pool and all its data?')) {
										return () => {};
									}
									return async ({ update }) => update();
								}}
								class="inline"
							>
								<input type="hidden" name="poolId" value={pool.id} />
								<button type="submit" class="text-sm text-red-400 hover:text-red-300">
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
