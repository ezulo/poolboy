<script lang="ts">
	import { getRanges, getReadingStatus, calculateRecommendations } from '$lib/calculations';

	let { data } = $props();

	const ranges = $derived(getRanges(data.pool.type));
	const latestTest = $derived(data.tests[0] ?? null);
	const recommendations = $derived(
		latestTest
			? calculateRecommendations(
					{
						freeChlorine: latestTest.freeChlorine,
						ph: latestTest.ph,
						alkalinity: latestTest.alkalinity,
						cyanuricAcid: latestTest.cyanuricAcid,
						calcium: latestTest.calcium,
						salt: latestTest.salt
					},
					data.pool.volumeGallons,
					data.pool.type
				)
			: []
	);

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(date));
	}

	function formatDateShort(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'numeric',
			day: 'numeric'
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

	function priorityClass(priority: 'high' | 'medium' | 'low'): string {
		switch (priority) {
			case 'high':
				return 'border-red-500 bg-red-500/10';
			case 'medium':
				return 'border-yellow-500 bg-yellow-500/10';
			default:
				return 'border-gray-600 bg-gray-700/50';
		}
	}
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">
	<header class="border-b border-gray-800 bg-gray-900/80 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
			<div class="flex items-center gap-4">
				<a href="/" class="text-gray-400 hover:text-gray-200">&larr;</a>
				<div>
					<h1 class="text-xl font-bold">{data.pool.name}</h1>
					<p class="text-sm text-gray-400">
						{data.pool.type === 'saltwater' ? 'Saltwater' : 'Chlorine'} &bull;
						{data.pool.volumeGallons.toLocaleString()} gal
					</p>
				</div>
			</div>
			<a
				href="/pool/{data.pool.id}/test"
				class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium transition hover:bg-green-500"
			>
				+ Log Test
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-8">
		<!-- Recommendations -->
		{#if recommendations.length > 0}
			<section class="mb-8">
				<h2 class="mb-4 text-lg font-semibold">Treatment Recommendations</h2>
				<div class="grid gap-3 sm:grid-cols-2">
					{#each recommendations as rec}
						<div class="rounded-lg border {priorityClass(rec.priority)} p-4">
							<div class="flex items-start justify-between">
								<div>
									<div class="font-medium">{rec.chemical}</div>
									<div class="text-2xl font-bold">
										{rec.amount} <span class="text-base font-normal text-gray-400">{rec.unit}</span>
									</div>
								</div>
								<span
									class="rounded px-2 py-0.5 text-xs font-medium uppercase {rec.priority === 'high'
										? 'bg-red-500/20 text-red-400'
										: rec.priority === 'medium'
											? 'bg-yellow-500/20 text-yellow-400'
											: 'bg-gray-500/20 text-gray-400'}"
								>
									{rec.priority}
								</span>
							</div>
							<p class="mt-2 text-sm text-gray-400">{rec.reason}</p>
						</div>
					{/each}
				</div>
			</section>
		{:else if latestTest}
			<div class="mb-8 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
				<span class="text-green-400">All readings are within ideal range!</span>
			</div>
		{/if}

		<!-- Test History -->
		<section class="mb-8">
			<h2 class="mb-4 text-lg font-semibold">Test History</h2>
			{#if data.tests.length === 0}
				<p class="text-gray-500">No tests recorded yet.</p>
			{:else}
				<div class="overflow-x-auto rounded-lg border border-gray-700">
					<table class="w-full text-sm">
						<thead class="border-b border-gray-700 bg-gray-800">
							<tr>
								<th class="px-4 py-3 text-left font-medium text-gray-400">Date</th>
								<th class="px-4 py-3 text-right font-medium text-gray-400">Free Cl</th>
								<th class="px-4 py-3 text-right font-medium text-gray-400">pH</th>
								<th class="px-4 py-3 text-right font-medium text-gray-400">Alk</th>
								<th class="px-4 py-3 text-right font-medium text-gray-400">CYA</th>
								<th class="px-4 py-3 text-right font-medium text-gray-400">Ca</th>
								{#if data.pool.type === 'saltwater'}
									<th class="px-4 py-3 text-right font-medium text-gray-400">Salt</th>
								{/if}
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-700/50">
							{#each data.tests as test}
								<tr class="hover:bg-gray-800/50">
									<td class="px-4 py-3 text-gray-300">{formatDate(test.testedAt)}</td>
									<td class="px-4 py-3 text-right {statusClass(getReadingStatus(test.freeChlorine, ranges.freeChlorine))}">
										{test.freeChlorine ?? '-'}
									</td>
									<td class="px-4 py-3 text-right {statusClass(getReadingStatus(test.ph, ranges.ph))}">
										{test.ph ?? '-'}
									</td>
									<td class="px-4 py-3 text-right {statusClass(getReadingStatus(test.alkalinity, ranges.alkalinity))}">
										{test.alkalinity ?? '-'}
									</td>
									<td class="px-4 py-3 text-right {statusClass(getReadingStatus(test.cyanuricAcid, ranges.cyanuricAcid))}">
										{test.cyanuricAcid ?? '-'}
									</td>
									<td class="px-4 py-3 text-right {statusClass(getReadingStatus(test.calcium, ranges.calcium))}">
										{test.calcium ?? '-'}
									</td>
									{#if data.pool.type === 'saltwater' && ranges.salt}
										<td class="px-4 py-3 text-right {statusClass(getReadingStatus(test.salt, ranges.salt))}">
											{test.salt ?? '-'}
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Recent Treatments -->
		{#if data.treatments.length > 0}
			<section>
				<h2 class="mb-4 text-lg font-semibold">Recent Treatments</h2>
				<div class="space-y-2">
					{#each data.treatments as treatment}
						<div class="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
							<div>
								<span class="font-medium">{treatment.chemical}</span>
								<span class="text-gray-400">
									- {treatment.amount} {treatment.unit}
								</span>
							</div>
							<span class="text-sm text-gray-500">{formatDateShort(treatment.appliedAt)}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</main>
</div>
