<script lang="ts">
	import { enhance } from '$app/forms';
	import { getRanges } from '$lib/calculations';

	let { data, form } = $props();

	const ranges = $derived(getRanges(data.pool.type));
	let loading = $state(false);
</script>

<div class="min-h-screen bg-gray-900 text-gray-100">
	<header class="border-b border-gray-800 bg-gray-900/80 backdrop-blur">
		<div class="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
			<a href="/pool/{data.pool.id}" class="text-gray-400 hover:text-gray-200">&larr;</a>
			<div>
				<h1 class="text-xl font-bold">Log Water Test</h1>
				<p class="text-sm text-gray-400">{data.pool.name}</p>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-8">
		{#if form?.error}
			<div class="mb-6 rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-400">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="space-y-6"
		>
			<!-- Primary readings -->
			<section>
				<h2 class="mb-4 text-lg font-semibold">Primary Readings</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="freeChlorine" class="mb-1 block text-sm text-gray-400">
							Free Chlorine (ppm)
							<span class="text-xs text-gray-500">
								Ideal: {ranges.freeChlorine.min}-{ranges.freeChlorine.max}
							</span>
						</label>
						<input
							type="number"
							id="freeChlorine"
							name="freeChlorine"
							step="0.1"
							min="0"
							max="20"
							placeholder="{ranges.freeChlorine.min} - {ranges.freeChlorine.max}"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="ph" class="mb-1 block text-sm text-gray-400">
							pH
							<span class="text-xs text-gray-500">
								Ideal: {ranges.ph.min}-{ranges.ph.max}
							</span>
						</label>
						<input
							type="number"
							id="ph"
							name="ph"
							step="0.1"
							min="6"
							max="9"
							placeholder="{ranges.ph.min} - {ranges.ph.max}"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="alkalinity" class="mb-1 block text-sm text-gray-400">
							Total Alkalinity (ppm)
							<span class="text-xs text-gray-500">
								Ideal: {ranges.alkalinity.min}-{ranges.alkalinity.max}
							</span>
						</label>
						<input
							type="number"
							id="alkalinity"
							name="alkalinity"
							min="0"
							max="500"
							placeholder="{ranges.alkalinity.min} - {ranges.alkalinity.max}"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="cyanuricAcid" class="mb-1 block text-sm text-gray-400">
							Cyanuric Acid / CYA (ppm)
							<span class="text-xs text-gray-500">
								Ideal: {ranges.cyanuricAcid.min}-{ranges.cyanuricAcid.max}
							</span>
						</label>
						<input
							type="number"
							id="cyanuricAcid"
							name="cyanuricAcid"
							min="0"
							max="300"
							placeholder="{ranges.cyanuricAcid.min} - {ranges.cyanuricAcid.max}"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
				</div>
			</section>

			<!-- Secondary readings -->
			<section>
				<h2 class="mb-4 text-lg font-semibold">Additional Readings</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="calcium" class="mb-1 block text-sm text-gray-400">
							Calcium Hardness (ppm)
							<span class="text-xs text-gray-500">
								Ideal: {ranges.calcium.min}-{ranges.calcium.max}
							</span>
						</label>
						<input
							type="number"
							id="calcium"
							name="calcium"
							min="0"
							max="1000"
							placeholder="{ranges.calcium.min} - {ranges.calcium.max}"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label for="totalChlorine" class="mb-1 block text-sm text-gray-400">
							Total Chlorine (ppm)
						</label>
						<input
							type="number"
							id="totalChlorine"
							name="totalChlorine"
							step="0.1"
							min="0"
							max="20"
							placeholder="Optional"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
					{#if data.pool.type === 'saltwater' && ranges.salt}
						<div>
							<label for="salt" class="mb-1 block text-sm text-gray-400">
								Salt (ppm)
								<span class="text-xs text-gray-500">
									Ideal: {ranges.salt.min}-{ranges.salt.max}
								</span>
							</label>
							<input
								type="number"
								id="salt"
								name="salt"
								min="0"
								max="10000"
								placeholder="{ranges.salt.min} - {ranges.salt.max}"
								class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
							/>
						</div>
					{/if}
					<div>
						<label for="temperature" class="mb-1 block text-sm text-gray-400">
							Water Temperature (°F)
						</label>
						<input
							type="number"
							id="temperature"
							name="temperature"
							min="32"
							max="120"
							placeholder="Optional"
							class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
						/>
					</div>
				</div>
			</section>

			<!-- Notes -->
			<section>
				<label for="notes" class="mb-1 block text-sm text-gray-400">Notes (optional)</label>
				<textarea
					id="notes"
					name="notes"
					rows="3"
					placeholder="Water clarity, weather conditions, etc."
					class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 focus:border-blue-500 focus:outline-none"
				></textarea>
			</section>

			<div class="flex gap-4">
				<button
					type="submit"
					disabled={loading}
					class="flex-1 rounded-lg bg-green-600 py-3 font-medium transition hover:bg-green-500 disabled:opacity-50"
				>
					{loading ? 'Saving...' : 'Save Test Results'}
				</button>
				<a
					href="/pool/{data.pool.id}"
					class="rounded-lg border border-gray-600 px-6 py-3 text-center transition hover:bg-gray-800"
				>
					Cancel
				</a>
			</div>
		</form>
	</main>
</div>
