import { db } from '$lib/server/db';
import { pools, waterTests, treatments } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const pool = await db.select().from(pools).where(eq(pools.id, params.id)).limit(1);

	if (!pool[0]) {
		throw error(404, 'Pool not found');
	}

	const tests = await db
		.select()
		.from(waterTests)
		.where(eq(waterTests.poolId, params.id))
		.orderBy(desc(waterTests.testedAt))
		.limit(50);

	const recentTreatments = await db
		.select()
		.from(treatments)
		.where(eq(treatments.poolId, params.id))
		.orderBy(desc(treatments.appliedAt))
		.limit(20);

	return {
		pool: pool[0],
		tests,
		treatments: recentTreatments
	};
};
