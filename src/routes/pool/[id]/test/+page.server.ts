import { db } from '$lib/server/db';
import { pools, waterTests } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const pool = await db.select().from(pools).where(eq(pools.id, params.id)).limit(1);

	if (!pool[0]) {
		throw error(404, 'Pool not found');
	}

	return { pool: pool[0] };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const data = await request.formData();

		const parseNum = (key: string): number | null => {
			const val = data.get(key)?.toString().trim();
			if (!val) return null;
			const num = parseFloat(val);
			return isNaN(num) ? null : num;
		};

		const parseInt_ = (key: string): number | null => {
			const val = data.get(key)?.toString().trim();
			if (!val) return null;
			const num = parseInt(val, 10);
			return isNaN(num) ? null : num;
		};

		const freeChlorine = parseNum('freeChlorine');
		const totalChlorine = parseNum('totalChlorine');
		const ph = parseNum('ph');
		const alkalinity = parseInt_('alkalinity');
		const cyanuricAcid = parseInt_('cyanuricAcid');
		const calcium = parseInt_('calcium');
		const salt = parseInt_('salt');
		const temperature = parseInt_('temperature');
		const notes = data.get('notes')?.toString().trim() || null;

		// At least one reading is required
		if (
			freeChlorine === null &&
			ph === null &&
			alkalinity === null &&
			cyanuricAcid === null &&
			calcium === null &&
			salt === null
		) {
			return fail(400, { error: 'At least one reading is required' });
		}

		await db.insert(waterTests).values({
			poolId: params.id,
			freeChlorine,
			totalChlorine,
			ph,
			alkalinity,
			cyanuricAcid,
			calcium,
			salt,
			temperature,
			notes
		});

		throw redirect(303, `/pool/${params.id}`);
	}
};
