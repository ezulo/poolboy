// Ideal ranges for pool chemistry
type Range = { min: number; max: number; unit: string };
type PoolType = 'chlorine' | 'saltwater';

const idealRangesBase = {
	common: {
		freeChlorine: { min: 1, max: 3, unit: 'ppm' },
		ph: { min: 7.2, max: 7.6, unit: '' },
		calcium: { min: 200, max: 400, unit: 'ppm' }
	},
	chlorine: {
		alkalinity: { min: 80, max: 120, unit: 'ppm' },
		cyanuricAcid: { min: 30, max: 50, unit: 'ppm' }
	},
	saltwater: {
		alkalinity: { min: 60, max: 80, unit: 'ppm' },
		cyanuricAcid: { min: 60, max: 80, unit: 'ppm' },
		salt: { min: 2700, max: 3400, unit: 'ppm' }
	}
} as const;

export type IdealRanges = {
	freeChlorine: Range;
	ph: Range;
	calcium: Range;
	alkalinity: Range;
	cyanuricAcid: Range;
	salt?: Range;
};

/**
 * Get ideal ranges for a specific pool type
 */
export function getRanges(poolType: PoolType): IdealRanges {
	return {
		...idealRangesBase.common,
		...idealRangesBase[poolType]
	} as IdealRanges;
}

// Default ranges for backward compatibility (chlorine pool defaults)
export const idealRanges = getRanges('chlorine');

export type Recommendation = {
	chemical: string;
	amount: number;
	unit: string;
	reason: string;
	priority: 'high' | 'medium' | 'low';
};

type TestReadings = {
	freeChlorine?: number | null;
	ph?: number | null;
	alkalinity?: number | null;
	cyanuricAcid?: number | null;
	calcium?: number | null;
	salt?: number | null;
};

/**
 * Calculate treatment recommendations based on test readings
 * @param readings Current water test readings
 * @param volumeGallons Pool volume in gallons
 * @param poolType 'chlorine' or 'saltwater'
 */
export function calculateRecommendations(
	readings: TestReadings,
	volumeGallons: number,
	poolType: PoolType
): Recommendation[] {
	const recommendations: Recommendation[] = [];
	const factor = volumeGallons / 10000; // Dosing is typically per 10,000 gallons
	const ranges = getRanges(poolType);

	// pH adjustments (do this first as it affects chlorine effectiveness)
	if (readings.ph != null) {
		if (readings.ph < ranges.ph.min) {
			const deficit = ranges.ph.min - readings.ph;
			// ~6 oz of soda ash raises pH by 0.2 per 10k gallons
			const amount = (deficit / 0.2) * 6 * factor;
			recommendations.push({
				chemical: 'Soda Ash (Sodium Carbonate)',
				amount: Math.round(amount * 10) / 10,
				unit: 'oz',
				reason: `pH is low (${readings.ph}). Target: ${ranges.ph.min}-${ranges.ph.max}`,
				priority: readings.ph < 7.0 ? 'high' : 'medium'
			});
		} else if (readings.ph > ranges.ph.max) {
			const excess = readings.ph - ranges.ph.max;
			// ~12 oz of muriatic acid lowers pH by 0.2 per 10k gallons
			const amount = (excess / 0.2) * 12 * factor;
			recommendations.push({
				chemical: 'Muriatic Acid',
				amount: Math.round(amount * 10) / 10,
				unit: 'fl oz',
				reason: `pH is high (${readings.ph}). Target: ${ranges.ph.min}-${ranges.ph.max}`,
				priority: readings.ph > 8.0 ? 'high' : 'medium'
			});
		}
	}

	// Alkalinity adjustments
	if (readings.alkalinity != null) {
		if (readings.alkalinity < ranges.alkalinity.min) {
			const deficit = ranges.alkalinity.min - readings.alkalinity;
			// 1.5 lbs of baking soda raises TA by 10 ppm per 10k gallons
			const amount = (deficit / 10) * 1.5 * factor;
			recommendations.push({
				chemical: 'Baking Soda (Sodium Bicarbonate)',
				amount: Math.round(amount * 10) / 10,
				unit: 'lbs',
				reason: `Alkalinity is low (${readings.alkalinity} ppm). Target: ${ranges.alkalinity.min}-${ranges.alkalinity.max} ppm`,
				priority: 'medium'
			});
		} else if (readings.alkalinity > ranges.alkalinity.max + 20) {
			recommendations.push({
				chemical: 'Muriatic Acid',
				amount: Math.round(16 * factor * 10) / 10,
				unit: 'fl oz',
				reason: `Alkalinity is high (${readings.alkalinity} ppm). Add acid with aerator running to lower TA without dropping pH too much.`,
				priority: 'low'
			});
		}
	}

	// Free Chlorine adjustments
	if (readings.freeChlorine != null) {
		let idealMin = ranges.freeChlorine.min;
		let targetFC = ranges.freeChlorine.max;

		// Calculate ideal ranges based on CYA, if present
		if (readings.cyanuricAcid != null) {
			idealMin = readings.cyanuricAcid * 0.075; // Min FC = 7.5% of CYA
			targetFC = readings.cyanuricAcid * 0.1; // Target FC = 10% of CYA
		}

		if (readings.freeChlorine < idealMin) {
			const deficit = targetFC - readings.freeChlorine;
			// For liquid chlorine (12.5%): ~10 oz raises FC by 1 ppm per 10k gallons
			const amount = deficit * 10 * factor;
			const cyaNote =
				readings.cyanuricAcid != null
					? ` (min ${Math.round(idealMin * 10) / 10} at CYA ${readings.cyanuricAcid})`
					: '';
			recommendations.push({
				chemical: poolType === 'saltwater' ? 'Liquid Chlorine (boost)' : 'Liquid Chlorine (12.5%)',
				amount: Math.round(amount * 10) / 10,
				unit: 'fl oz',
				reason: `Free chlorine is low (${readings.freeChlorine} ppm). Target: ${Math.round(targetFC * 10) / 10} ppm${cyaNote}`,
				priority: readings.freeChlorine < idealMin * 0.5 ? 'high' : 'medium'
			});
		} else if (readings.freeChlorine > targetFC * 1.5) {
			// FC is more than 1.5x the target - warn user
			recommendations.push({
				chemical: 'Wait & Retest',
				amount: 24,
				unit: 'hours',
				reason: `Free chlorine is high (${readings.freeChlorine} ppm). Chlorine will dissipate naturally. Avoid swimming until FC drops below ${Math.round(targetFC * 1.5 * 10) / 10} ppm. Keep pump running and pool uncovered to speed dissipation.`,
				priority: readings.freeChlorine > targetFC * 3 ? 'high' : 'medium'
			});
		}
	}

	// Cyanuric Acid (Stabilizer)
	if (readings.cyanuricAcid != null) {
		if (readings.cyanuricAcid < ranges.cyanuricAcid.min) {
			const deficit = ranges.cyanuricAcid.min - readings.cyanuricAcid;
			// ~13 oz of CYA raises level by 10 ppm per 10k gallons
			const amount = (deficit / 10) * 13 * factor;
			recommendations.push({
				chemical: 'Cyanuric Acid (Stabilizer)',
				amount: Math.round(amount * 10) / 10,
				unit: 'oz',
				reason: `Stabilizer is low (${readings.cyanuricAcid} ppm). Target: ${ranges.cyanuricAcid.min}-${ranges.cyanuricAcid.max} ppm`,
				priority: 'medium'
			});
		} else if (readings.cyanuricAcid > 100) {
			recommendations.push({
				chemical: 'Drain & Refill',
				amount: Math.round((1 - 50 / readings.cyanuricAcid) * 100),
				unit: '% of pool water',
				reason: `CYA is very high (${readings.cyanuricAcid} ppm). Dilution is the only solution.`,
				priority: 'high'
			});
		}
	}

	// Calcium Hardness
	if (readings.calcium != null) {
		if (readings.calcium < ranges.calcium.min) {
			const deficit = ranges.calcium.min - readings.calcium;
			// ~12 oz of calcium chloride raises CH by 10 ppm per 10k gallons
			const amount = (deficit / 10) * 12 * factor;
			recommendations.push({
				chemical: 'Calcium Chloride',
				amount: Math.round(amount * 10) / 10,
				unit: 'oz',
				reason: `Calcium is low (${readings.calcium} ppm). Target: ${ranges.calcium.min}-${ranges.calcium.max} ppm`,
				priority: 'low'
			});
		} else if (readings.calcium > ranges.calcium.max) {
			// High calcium - needs dilution
			const targetCalcium = (ranges.calcium.min + ranges.calcium.max) / 2; // Target middle of range
			const drainPercent = Math.round((1 - targetCalcium / readings.calcium) * 100);
			recommendations.push({
				chemical: 'Drain & Refill',
				amount: drainPercent,
				unit: '% of pool water',
				reason: `Calcium is high (${readings.calcium} ppm). Target: ${ranges.calcium.min}-${ranges.calcium.max} ppm. High calcium causes scaling on surfaces and equipment. Dilution is the only way to lower it.`,
				priority: readings.calcium > ranges.calcium.max * 1.5 ? 'medium' : 'low'
			});
		}
	}

	// Salt (for saltwater pools)
	if (poolType === 'saltwater' && readings.salt != null && ranges.salt) {
		if (readings.salt < ranges.salt.min) {
			const deficit = ranges.salt.min - readings.salt;
			// ~30 lbs of salt raises level by 1000 ppm per 10k gallons
			const amount = (deficit / 1000) * 30 * factor;
			recommendations.push({
				chemical: 'Pool Salt',
				amount: Math.round(amount),
				unit: 'lbs',
				reason: `Salt is low (${readings.salt} ppm). Target: ${ranges.salt.min}-${ranges.salt.max} ppm`,
				priority: 'medium'
			});
		}
	}

	// Sort by priority
	const priorityOrder = { high: 0, medium: 1, low: 2 };
	recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

	return recommendations;
}

/**
 * Get status color for a reading
 */
export function getReadingStatus(
	value: number | null | undefined,
	range: { min: number; max: number }
): 'good' | 'warning' | 'danger' | 'unknown' {
	if (value == null) return 'unknown';
	if (value >= range.min && value <= range.max) return 'good';
	const tolerance = (range.max - range.min) * 0.25;
	if (value >= range.min - tolerance && value <= range.max + tolerance) return 'warning';
	return 'danger';
}
