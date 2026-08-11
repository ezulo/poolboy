# Pool Chemistry Calculations

This document describes the water chemistry calculations and treatment recommendations used in Poolboy.

## Ideal Ranges

Ideal ranges vary by pool type. Common parameters are shared, while others differ based on pool chemistry needs.

### Common Ranges (All Pool Types)

| Parameter | Min | Max | Unit | Notes |
|-----------|-----|-----|------|-------|
| Free Chlorine | 1 | 3 | ppm | Sanitizer level (adjusted by CYA when present) |
| pH | 7.2 | 7.6 | - | Acidity/alkalinity balance |
| Calcium Hardness | 200 | 400 | ppm | Prevents corrosion/scaling |

### Chlorine Pool Ranges

| Parameter | Min | Max | Unit | Notes |
|-----------|-----|-----|------|-------|
| Total Alkalinity | 80 | 120 | ppm | pH buffer |
| Cyanuric Acid (CYA) | 30 | 50 | ppm | UV stabilizer for chlorine |

### Saltwater Pool Ranges

| Parameter | Min | Max | Unit | Notes |
|-----------|-----|-----|------|-------|
| Total Alkalinity | 60 | 80 | ppm | Lower range helps manage pH rise from SWG |
| Cyanuric Acid (CYA) | 60 | 80 | ppm | Higher range beneficial with continuous chlorine generation |
| Salt | 2700 | 3400 | ppm | Required for chlorine generator operation |

## Reading Status Thresholds

Readings are color-coded based on how far they deviate from the ideal range:

| Status | Condition |
|--------|-----------|
| Good | Within ideal range |
| Warning | Within 25% tolerance outside range |
| Danger | More than 25% outside range |

```
tolerance = (max - min) * 0.25

good:    min <= value <= max
warning: (min - tolerance) <= value < min  OR  max < value <= (max + tolerance)
danger:  value < (min - tolerance)  OR  value > (max + tolerance)
```

## Treatment Calculations

All dosing amounts are calculated per 10,000 gallons and then scaled by the pool's actual volume:

```
factor = pool_volume_gallons / 10000
actual_dose = base_dose * factor
```

### pH Adjustment

**Low pH (below 7.2)** → Add Soda Ash (Sodium Carbonate)

```
deficit = 7.2 - current_pH
dose_oz = (deficit / 0.2) * 6 * factor
```

- 6 oz of soda ash raises pH by 0.2 per 10,000 gallons
- Priority: HIGH if pH < 7.0, otherwise MEDIUM

**High pH (above 7.6)** → Add Muriatic Acid

```
excess = current_pH - 7.6
dose_fl_oz = (excess / 0.2) * 12 * factor
```

- 12 fl oz of muriatic acid lowers pH by 0.2 per 10,000 gallons
- Priority: HIGH if pH > 8.0, otherwise MEDIUM

### Total Alkalinity Adjustment

**Low Alkalinity (below 80 ppm)** → Add Baking Soda (Sodium Bicarbonate)

```
deficit = 80 - current_alkalinity
dose_lbs = (deficit / 10) * 1.5 * factor
```

- 1.5 lbs of baking soda raises TA by 10 ppm per 10,000 gallons
- Priority: MEDIUM

**High Alkalinity (above 140 ppm)** → Add Muriatic Acid

```
dose_fl_oz = 16 * factor
```

- Fixed dose with aerator running to lower TA without dropping pH excessively
- Only triggered when alkalinity exceeds ideal max + 20 ppm
- Priority: LOW

### Free Chlorine Adjustment

Chlorine requirements are calculated based on CYA level when available, following the FC/CYA ratio guidelines.

**Without CYA reading:** Uses default range (1-3 ppm)

```
minimum_FC = 1 ppm
target_FC = 3 ppm
```

**With CYA reading:** Uses FC/CYA ratios

```
minimum_FC = CYA * 0.075  # 7.5% of CYA
target_FC = CYA * 0.10    # 10% of CYA
```

| CYA (ppm) | Min FC (ppm) | Target FC (ppm) |
|-----------|--------------|-----------------|
| 30 | 2.3 | 3.0 |
| 40 | 3.0 | 4.0 |
| 50 | 3.8 | 5.0 |
| 70 | 5.3 | 7.0 |

**Low Chlorine (below minimum)** → Add Liquid Chlorine (12.5%)

```
deficit = target_FC - current_chlorine
dose_fl_oz = deficit * 10 * factor
```

- 10 fl oz of 12.5% liquid chlorine raises FC by 1 ppm per 10,000 gallons
- For saltwater pools, labeled as "boost" since the SWG normally maintains levels
- Priority: HIGH if FC < (minimum_FC * 0.5), otherwise MEDIUM

**High Chlorine (above 1.5x target)** → Wait & Retest

- Chlorine dissipates naturally through UV exposure and oxidation
- No chemical treatment needed - just wait 24-48 hours and retest
- Keep pump running and pool uncovered to speed dissipation
- Avoid swimming until FC drops to safe levels (1.5x target)
- Priority: HIGH if FC > (target_FC * 3), otherwise MEDIUM

### Cyanuric Acid (Stabilizer) Adjustment

**Low CYA (below 30 ppm)** → Add Cyanuric Acid

```
deficit = 30 - current_CYA
dose_oz = (deficit / 10) * 13 * factor
```

- 13 oz of CYA raises level by 10 ppm per 10,000 gallons
- Priority: MEDIUM

**Very High CYA (above 100 ppm)** → Drain & Refill

```
drain_percentage = (1 - 50 / current_CYA) * 100
```

- CYA does not degrade; dilution is the only solution
- Calculation targets 50 ppm after refill
- Priority: HIGH

### Calcium Hardness Adjustment

**Low Calcium (below 200 ppm)** → Add Calcium Chloride

```
deficit = 200 - current_calcium
dose_oz = (deficit / 10) * 12 * factor
```

- 12 oz of calcium chloride raises CH by 10 ppm per 10,000 gallons
- Priority: LOW

**High Calcium (above 400 ppm)** → Drain & Refill

```
target_calcium = 300  # Middle of ideal range
drain_percentage = (1 - target_calcium / current_calcium) * 100
```

- No chemical can remove calcium from water
- Dilution by partial drain and refill is the only solution
- High calcium causes scaling on pool surfaces and equipment
- Priority: MEDIUM if > 600 ppm, otherwise LOW

### Salt Adjustment (Saltwater Pools Only)

**Low Salt (below 2700 ppm)** → Add Pool Salt

```
deficit = 2700 - current_salt
dose_lbs = (deficit / 1000) * 30 * factor
```

- 30 lbs of salt raises level by 1000 ppm per 10,000 gallons
- Only calculated for saltwater pools
- Priority: MEDIUM

## Priority Ordering

Recommendations are sorted by priority to help users address the most critical issues first:

1. **HIGH** - Immediate attention needed (very low chlorine, extreme pH, very high CYA)
2. **MEDIUM** - Should be addressed soon (moderately off readings)
3. **LOW** - Can wait (minor adjustments, calcium)

## Chemistry Notes

### Why pH Matters
- Low pH (< 7.0): Corrosive to equipment, irritating to swimmers
- High pH (> 7.8): Chlorine becomes less effective, scaling occurs
- Optimal chlorine effectiveness is at pH 7.2-7.4

### The CYA-Chlorine Relationship
Cyanuric acid (stabilizer) protects chlorine from UV degradation but also reduces its sanitizing effectiveness. Higher CYA requires proportionally higher chlorine levels.

Poolboy uses the widely-accepted FC/CYA ratio:
- **Minimum FC** = 7.5% of CYA
- **Target FC** = 10% of CYA
- **Shock level** = 40% of CYA (not used for routine dosing)

| CYA (ppm) | Min FC (ppm) | Target FC (ppm) | Shock FC (ppm) |
|-----------|--------------|-----------------|----------------|
| 30 | 2.3 | 3.0 | 12 |
| 40 | 3.0 | 4.0 | 16 |
| 50 | 3.8 | 5.0 | 20 |
| 70 | 5.3 | 7.0 | 28 |
| 100+ | Consider draining | | |

### Alkalinity as a pH Buffer
Total alkalinity acts as a buffer to prevent pH swings. Adjust alkalinity before pH when both are off, as raising alkalinity also raises pH slightly.

### Order of Chemical Addition
When multiple adjustments are needed, follow this order:

1. **pH** (if dangerously low or high)
2. **Alkalinity** (affects pH stability)
3. **pH** (fine-tune after alkalinity)
4. **Chlorine** (more effective at correct pH)
5. **CYA** (slow to dissolve, add last)
6. **Calcium** (least urgent)

Wait 4-6 hours between additions to allow circulation and avoid chemical reactions.

## References

- [Trouble Free Pool - Pool School](https://www.troublefreepool.com/blog/pool-school/)
- [CDC - Healthy Swimming](https://www.cdc.gov/healthy-water/swimming/)
- [APSP/PHTA Pool & Spa Water Chemistry Standards](https://www.phta.org/)
