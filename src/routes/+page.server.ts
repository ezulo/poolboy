import { db } from '$lib/server/db';
import { pools, waterTests } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const allPools = await db.select().from(pools).orderBy(desc(pools.createdAt));

	// Get the latest test for each pool
	const poolsWithTests = await Promise.all(
		allPools.map(async (pool) => {
			const latestTest = await db
				.select()
				.from(waterTests)
				.where(eq(waterTests.poolId, pool.id))
				.orderBy(desc(waterTests.testedAt))
				.limit(1);

			return {
				...pool,
				latestTest: latestTest[0] ?? null
			};
		})
	);

	return { pools: poolsWithTests };
};

export const actions: Actions = {
	createPool: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const type = data.get('type')?.toString() as 'chlorine' | 'saltwater';
		const volumeGallons = parseInt(data.get('volumeGallons')?.toString() ?? '0');

		if (!name) {
			return fail(400, { error: 'Pool name is required' });
		}
		if (!type || !['chlorine', 'saltwater'].includes(type)) {
			return fail(400, { error: 'Invalid pool type' });
		}
		if (!volumeGallons || volumeGallons < 100) {
			return fail(400, { error: 'Volume must be at least 100 gallons' });
		}

		await db.insert(pools).values({ name, type, volumeGallons });

		return { success: true };
	},

	deletePool: async ({ request }) => {
		const data = await request.formData();
		const poolId = data.get('poolId')?.toString();

		if (!poolId) {
			return fail(400, { error: 'Pool ID is required' });
		}

		await db.delete(pools).where(eq(pools.id, poolId));

		return { success: true };
	}
};
