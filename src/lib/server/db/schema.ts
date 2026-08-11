import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const pools = sqliteTable('pools', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	type: text('type', { enum: ['chlorine', 'saltwater'] }).notNull(),
	volumeGallons: integer('volume_gallons').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const waterTests = sqliteTable('water_tests', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	poolId: text('pool_id')
		.notNull()
		.references(() => pools.id, { onDelete: 'cascade' }),
	testedAt: integer('tested_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	// Core readings
	freeChlorine: real('free_chlorine'), // ppm
	totalChlorine: real('total_chlorine'), // ppm
	ph: real('ph'),
	alkalinity: integer('alkalinity'), // ppm
	cyanuricAcid: integer('cyanuric_acid'), // ppm (stabilizer)
	calcium: integer('calcium'), // ppm (hardness)
	salt: integer('salt'), // ppm (for saltwater pools)
	temperature: integer('temperature'), // Fahrenheit
	notes: text('notes')
});

export const treatments = sqliteTable('treatments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	poolId: text('pool_id')
		.notNull()
		.references(() => pools.id, { onDelete: 'cascade' }),
	waterTestId: text('water_test_id').references(() => waterTests.id, { onDelete: 'set null' }),
	appliedAt: integer('applied_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	chemical: text('chemical').notNull(),
	amount: real('amount').notNull(),
	unit: text('unit').notNull(),
	notes: text('notes')
});

// Type exports for use in app
export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;
export type WaterTest = typeof waterTests.$inferSelect;
export type NewWaterTest = typeof waterTests.$inferInsert;
export type Treatment = typeof treatments.$inferSelect;
export type NewTreatment = typeof treatments.$inferInsert;
