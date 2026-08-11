import { describe, it, expect } from 'vitest';
import {
	calculateRecommendations,
	getReadingStatus,
	getRanges,
	idealRanges
} from './calculations';

describe('getRanges', () => {
	it('returns correct ranges for chlorine pools', () => {
		const ranges = getRanges('chlorine');
		expect(ranges.alkalinity).toEqual({ min: 80, max: 120, unit: 'ppm' });
		expect(ranges.cyanuricAcid).toEqual({ min: 30, max: 50, unit: 'ppm' });
		expect(ranges.salt).toBeUndefined();
	});

	it('returns correct ranges for saltwater pools', () => {
		const ranges = getRanges('saltwater');
		expect(ranges.alkalinity).toEqual({ min: 60, max: 80, unit: 'ppm' });
		expect(ranges.cyanuricAcid).toEqual({ min: 60, max: 80, unit: 'ppm' });
		expect(ranges.salt).toEqual({ min: 2700, max: 3400, unit: 'ppm' });
	});

	it('shares common ranges between pool types', () => {
		const chlorine = getRanges('chlorine');
		const saltwater = getRanges('saltwater');

		// These should be the same
		expect(chlorine.freeChlorine).toEqual(saltwater.freeChlorine);
		expect(chlorine.ph).toEqual(saltwater.ph);
		expect(chlorine.calcium).toEqual(saltwater.calcium);
	});

	it('default idealRanges export equals chlorine ranges', () => {
		const chlorineRanges = getRanges('chlorine');
		expect(idealRanges.alkalinity).toEqual(chlorineRanges.alkalinity);
		expect(idealRanges.cyanuricAcid).toEqual(chlorineRanges.cyanuricAcid);
	});
});

describe('getReadingStatus', () => {
	it('returns "unknown" for null value', () => {
		expect(getReadingStatus(null, { min: 1, max: 3 })).toBe('unknown');
	});

	it('returns "unknown" for undefined value', () => {
		expect(getReadingStatus(undefined, { min: 1, max: 3 })).toBe('unknown');
	});

	it('returns "good" when value is within range', () => {
		expect(getReadingStatus(2, { min: 1, max: 3 })).toBe('good');
		expect(getReadingStatus(1, { min: 1, max: 3 })).toBe('good');
		expect(getReadingStatus(3, { min: 1, max: 3 })).toBe('good');
	});

	it('returns "warning" when value is slightly outside range', () => {
		// Range is 1-3, tolerance is 0.5 (25% of 2)
		expect(getReadingStatus(0.6, { min: 1, max: 3 })).toBe('warning');
		expect(getReadingStatus(3.4, { min: 1, max: 3 })).toBe('warning');
	});

	it('returns "danger" when value is far outside range', () => {
		expect(getReadingStatus(0, { min: 1, max: 3 })).toBe('danger');
		expect(getReadingStatus(5, { min: 1, max: 3 })).toBe('danger');
	});

	it('works with pH range', () => {
		// pH ideal range is 7.2-7.6, tolerance is 0.1 (25% of 0.4)
		expect(getReadingStatus(7.4, idealRanges.ph)).toBe('good');
		expect(getReadingStatus(7.15, idealRanges.ph)).toBe('warning'); // slightly below min
		expect(getReadingStatus(7.65, idealRanges.ph)).toBe('warning'); // slightly above max
		expect(getReadingStatus(7.0, idealRanges.ph)).toBe('danger'); // too low
		expect(getReadingStatus(8.0, idealRanges.ph)).toBe('danger');
	});

	it('works with chlorine range', () => {
		expect(getReadingStatus(2, idealRanges.freeChlorine)).toBe('good');
		expect(getReadingStatus(0.5, idealRanges.freeChlorine)).toBe('warning');
		expect(getReadingStatus(0, idealRanges.freeChlorine)).toBe('danger');
	});
});

describe('calculateRecommendations', () => {
	const standardPool = { volumeGallons: 10000, poolType: 'chlorine' as const };

	describe('with all readings in ideal range', () => {
		it('returns no recommendations', () => {
			const readings = {
				freeChlorine: 3.5,
				ph: 7.4,
				alkalinity: 100,
				cyanuricAcid: 40,
				calcium: 300
			};
			const result = calculateRecommendations(readings, standardPool.volumeGallons, 'chlorine');
			expect(result).toHaveLength(0);
		});
	});

	describe('with no readings', () => {
		it('returns no recommendations', () => {
			const result = calculateRecommendations({}, standardPool.volumeGallons, 'chlorine');
			expect(result).toHaveLength(0);
		});
	});

	describe('pH adjustments', () => {
		it('recommends soda ash when pH is low', () => {
			const result = calculateRecommendations({ ph: 7.0 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Soda Ash (Sodium Carbonate)');
			expect(result[0].unit).toBe('oz');
			expect(result[0].priority).toBe('medium');
		});

		it('sets high priority when pH is very low', () => {
			const result = calculateRecommendations({ ph: 6.8 }, 10000, 'chlorine');
			expect(result[0].priority).toBe('high');
		});

		it('recommends muriatic acid when pH is high', () => {
			const result = calculateRecommendations({ ph: 7.8 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Muriatic Acid');
			expect(result[0].unit).toBe('fl oz');
			expect(result[0].priority).toBe('medium');
		});

		it('sets high priority when pH is very high', () => {
			const result = calculateRecommendations({ ph: 8.2 }, 10000, 'chlorine');
			expect(result[0].priority).toBe('high');
		});

		it('scales dosage with pool volume', () => {
			const small = calculateRecommendations({ ph: 7.0 }, 10000, 'chlorine');
			const large = calculateRecommendations({ ph: 7.0 }, 20000, 'chlorine');
			expect(large[0].amount).toBe(small[0].amount * 2);
		});
	});

	describe('alkalinity adjustments', () => {
		it('recommends baking soda when alkalinity is low', () => {
			const result = calculateRecommendations({ alkalinity: 60 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Baking Soda (Sodium Bicarbonate)');
			expect(result[0].unit).toBe('lbs');
			expect(result[0].priority).toBe('medium');
		});

		it('recommends muriatic acid when alkalinity is high', () => {
			const result = calculateRecommendations({ alkalinity: 150 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Muriatic Acid');
			expect(result[0].priority).toBe('low');
		});

		it('does not recommend anything when alkalinity is slightly high', () => {
			// Only triggers when > max + 20 (120 + 20 = 140)
			const result = calculateRecommendations({ alkalinity: 130 }, 10000, 'chlorine');
			expect(result).toHaveLength(0);
		});

		it('uses different alkalinity ranges for saltwater pools', () => {
			// Saltwater ideal range is 60-80 ppm
			// 70 ppm is ideal for saltwater but low for chlorine
			const saltwater = calculateRecommendations({ alkalinity: 70 }, 10000, 'saltwater');
			const chlorine = calculateRecommendations({ alkalinity: 70 }, 10000, 'chlorine');

			expect(saltwater).toHaveLength(0); // 70 is within 60-80
			expect(chlorine).toHaveLength(1); // 70 is below 80-120
			expect(chlorine[0].chemical).toBe('Baking Soda (Sodium Bicarbonate)');
		});
	});

	describe('chlorine adjustments', () => {
		it('recommends liquid chlorine when free chlorine is low', () => {
			const result = calculateRecommendations({ freeChlorine: 0.5 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Liquid Chlorine (12.5%)');
			expect(result[0].unit).toBe('fl oz');
		});

		it('uses different chemical name for saltwater pools', () => {
			const result = calculateRecommendations({ freeChlorine: 0.5 }, 10000, 'saltwater');
			expect(result[0].chemical).toBe('Liquid Chlorine (boost)');
		});

		it('sets high priority when chlorine is very low', () => {
			const result = calculateRecommendations({ freeChlorine: 0.3 }, 10000, 'chlorine');
			expect(result[0].priority).toBe('high');
		});

		it('does not recommend when chlorine is adequate', () => {
			const result = calculateRecommendations({ freeChlorine: 2 }, 10000, 'chlorine');
			expect(result).toHaveLength(0);
		});

		it('uses default ideal range (1-3 ppm) when CYA is absent', () => {
			const result = calculateRecommendations({ freeChlorine: 2 }, 10000, 'chlorine');
			expect(result).toHaveLength(0);
		});

		describe('with CYA-adjusted ranges', () => {
			it('recommends chlorine when FC is below 7.5% of CYA', () => {
				// CYA 40 -> min FC = 3 ppm (40 * 0.075)
				const result = calculateRecommendations({ freeChlorine: 2, cyanuricAcid: 40 }, 10000, 'chlorine');
				expect(result).toHaveLength(1);
				expect(result[0].chemical).toBe('Liquid Chlorine (12.5%)');
			});

			it('does not recommend when FC meets CYA-based minimum', () => {
				// CYA 40 -> min FC = 3 ppm, target = 4 ppm (40 * 0.1)
				const result = calculateRecommendations({ freeChlorine: 3.5, cyanuricAcid: 40 }, 10000, 'chlorine');
				expect(result).toHaveLength(0);
			});

			it('targets 10% of CYA for dosing', () => {
				// CYA 50 -> target FC = 5 ppm (50 * 0.1)
				// Current FC = 2, deficit = 3 ppm
				// Dose = 3 * 10 = 30 fl oz per 10k gallons
				const result = calculateRecommendations({ freeChlorine: 2, cyanuricAcid: 50 }, 10000, 'chlorine');
				expect(result[0].amount).toBe(30);
			});

			it('includes CYA info in reason when CYA is present', () => {
				const result = calculateRecommendations({ freeChlorine: 2, cyanuricAcid: 40 }, 10000, 'chlorine');
				expect(result[0].reason).toContain('CYA 40');
				expect(result[0].reason).toContain('min 3'); // 40 * 0.075 = 3
			});

			it('sets high priority when FC is less than half the CYA-based minimum', () => {
				// CYA 40 -> min FC = 3 ppm, high priority threshold = 1.5 ppm
				const result = calculateRecommendations({ freeChlorine: 1, cyanuricAcid: 40 }, 10000, 'chlorine');
				expect(result[0].priority).toBe('high');
			});

			it('sets medium priority when FC is above half the CYA-based minimum', () => {
				// CYA 40 -> min FC = 3 ppm, high priority threshold = 1.5 ppm
				const result = calculateRecommendations({ freeChlorine: 2, cyanuricAcid: 40 }, 10000, 'chlorine');
				expect(result[0].priority).toBe('medium');
			});
		});

		describe('high chlorine warnings', () => {
			it('warns when chlorine is more than 1.5x the target', () => {
				// Without CYA: target is 3 ppm, so > 4.5 ppm triggers warning
				const result = calculateRecommendations({ freeChlorine: 5 }, 10000, 'chlorine');
				expect(result).toHaveLength(1);
				expect(result[0].chemical).toBe('Wait & Retest');
				expect(result[0].unit).toBe('hours');
			});

			it('sets high priority when chlorine is extremely high', () => {
				// Without CYA: target is 3 ppm, > 9 ppm (3x) is high priority
				const result = calculateRecommendations({ freeChlorine: 10 }, 10000, 'chlorine');
				expect(result[0].priority).toBe('high');
			});

			it('sets medium priority when chlorine is moderately high', () => {
				// Without CYA: target is 3 ppm, 5 ppm is between 1.5x and 3x
				const result = calculateRecommendations({ freeChlorine: 5 }, 10000, 'chlorine');
				expect(result[0].priority).toBe('medium');
			});

			it('uses CYA-adjusted target for high chlorine threshold', () => {
				// CYA 50 -> target = 5 ppm (10% of CYA), so > 7.5 ppm triggers warning
				const noWarning = calculateRecommendations({ freeChlorine: 7, cyanuricAcid: 50 }, 10000, 'chlorine');
				const warning = calculateRecommendations({ freeChlorine: 8, cyanuricAcid: 50 }, 10000, 'chlorine');

				expect(noWarning).toHaveLength(0); // 7 < 7.5, no warning
				expect(warning).toHaveLength(1); // 8 > 7.5, warning
				expect(warning[0].chemical).toBe('Wait & Retest');
			});
		});
	});

	describe('cyanuric acid adjustments', () => {
		it('recommends CYA when stabilizer is low', () => {
			const result = calculateRecommendations({ cyanuricAcid: 20 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Cyanuric Acid (Stabilizer)');
			expect(result[0].unit).toBe('oz');
		});

		it('recommends drain and refill when CYA is very high', () => {
			const result = calculateRecommendations({ cyanuricAcid: 150 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Drain & Refill');
			expect(result[0].unit).toBe('% of pool water');
			expect(result[0].priority).toBe('high');
			expect(result[0].amount).toBeGreaterThan(0);
			expect(result[0].amount).toBeLessThan(100);
		});

		it('calculates correct drain percentage', () => {
			// At CYA 100, need to drain to 50 = 50% drain
			const result = calculateRecommendations({ cyanuricAcid: 100 }, 10000, 'chlorine');
			// Actually at 100, it's exactly the threshold, so drain needed is 1 - 50/100 = 50%
			// But let's check with 200 CYA: drain = 1 - 50/200 = 75%
			const result2 = calculateRecommendations({ cyanuricAcid: 200 }, 10000, 'chlorine');
			expect(result2[0].amount).toBe(75);
		});

		it('uses different CYA ranges for saltwater pools', () => {
			// Saltwater ideal CYA range is 60-80 ppm
			// Chlorine ideal CYA range is 30-50 ppm
			// 55 ppm is high for chlorine (above 50) but low for saltwater (below 60)
			const saltwater = calculateRecommendations({ cyanuricAcid: 55 }, 10000, 'saltwater');
			const chlorine = calculateRecommendations({ cyanuricAcid: 55 }, 10000, 'chlorine');

			expect(saltwater).toHaveLength(1); // 55 is below 60-80, needs CYA
			expect(saltwater[0].chemical).toBe('Cyanuric Acid (Stabilizer)');
			expect(chlorine).toHaveLength(0); // 55 is above 30-50, no recommendation
		});
	});

	describe('calcium adjustments', () => {
		it('recommends calcium chloride when calcium is low', () => {
			const result = calculateRecommendations({ calcium: 150 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Calcium Chloride');
			expect(result[0].unit).toBe('oz');
			expect(result[0].priority).toBe('low');
		});

		it('does not recommend when calcium is adequate', () => {
			const result = calculateRecommendations({ calcium: 300 }, 10000, 'chlorine');
			expect(result).toHaveLength(0);
		});

		it('recommends drain and refill when calcium is high', () => {
			// Ideal range is 200-400 ppm, so > 400 triggers warning
			const result = calculateRecommendations({ calcium: 500 }, 10000, 'chlorine');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Drain & Refill');
			expect(result[0].unit).toBe('% of pool water');
			expect(result[0].amount).toBeGreaterThan(0);
			expect(result[0].amount).toBeLessThan(100);
		});

		it('calculates correct drain percentage for high calcium', () => {
			// Calcium 600, target middle of range = 300
			// Drain = 1 - (300/600) = 50%
			const result = calculateRecommendations({ calcium: 600 }, 10000, 'chlorine');
			expect(result[0].amount).toBe(50);
		});

		it('sets medium priority when calcium is very high', () => {
			// > 1.5x max (> 600 ppm) is medium priority
			const result = calculateRecommendations({ calcium: 700 }, 10000, 'chlorine');
			expect(result[0].priority).toBe('medium');
		});

		it('sets low priority when calcium is moderately high', () => {
			// <= 1.5x max (<= 600 ppm) is low priority
			const result = calculateRecommendations({ calcium: 500 }, 10000, 'chlorine');
			expect(result[0].priority).toBe('low');
		});
	});

	describe('salt adjustments', () => {
		it('recommends salt for saltwater pools when low', () => {
			const result = calculateRecommendations({ salt: 2500 }, 10000, 'saltwater');
			expect(result).toHaveLength(1);
			expect(result[0].chemical).toBe('Pool Salt');
			expect(result[0].unit).toBe('lbs');
		});

		it('does not recommend salt for chlorine pools', () => {
			const result = calculateRecommendations({ salt: 2500 }, 10000, 'chlorine');
			expect(result).toHaveLength(0);
		});

		it('does not recommend when salt is adequate', () => {
			const result = calculateRecommendations({ salt: 3000 }, 10000, 'saltwater');
			expect(result).toHaveLength(0);
		});
	});

	describe('priority sorting', () => {
		it('sorts recommendations by priority (high first)', () => {
			const readings = {
				ph: 6.5, // high priority (very low)
				calcium: 150, // low priority
				alkalinity: 60 // medium priority
			};
			const result = calculateRecommendations(readings, 10000, 'chlorine');

			expect(result.length).toBe(3);
			expect(result[0].priority).toBe('high'); // pH
			expect(result[1].priority).toBe('medium'); // alkalinity
			expect(result[2].priority).toBe('low'); // calcium
		});
	});

	describe('volume scaling', () => {
		it('doubles amounts for double volume', () => {
			const readings = { alkalinity: 60 };
			const small = calculateRecommendations(readings, 10000, 'chlorine');
			const large = calculateRecommendations(readings, 20000, 'chlorine');

			expect(large[0].amount).toBe(small[0].amount * 2);
		});

		it('halves amounts for half volume', () => {
			const readings = { alkalinity: 60 };
			const standard = calculateRecommendations(readings, 10000, 'chlorine');
			const small = calculateRecommendations(readings, 5000, 'chlorine');

			expect(small[0].amount).toBe(standard[0].amount / 2);
		});
	});
});
