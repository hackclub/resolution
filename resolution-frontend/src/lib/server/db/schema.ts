import { pgTable, text, timestamp, boolean, integer, real, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const enrollmentRoleEnum = pgEnum('enrollment_role', ['PARTICIPANT', 'AMBASSADOR']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['ACTIVE', 'DROPPED', 'COMPLETED']);
export const pathwayEnum = pgEnum('pathway', ['PYTHON', 'WEB_DEV', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING']);
export const difficultyEnum = pgEnum('difficulty', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const shipStatusEnum = pgEnum('ship_status', ['PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MISSED']);
export const payoutStatusEnum = pgEnum('payout_status', ['DRAFT', 'PENDING', 'PAID', 'CANCELED']);
export const warehouseOrderStatusEnum = pgEnum('warehouse_order_status', ['DRAFT', 'ESTIMATED', 'APPROVED', 'SHIPPED', 'CANCELED']);
export const warehouseBatchStatusEnum = pgEnum('warehouse_batch_status', ['AWAITING_MAPPING', 'MAPPED', 'PROCESSED']);

// Tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  hackClubId: text('hack_club_id').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  slackId: text('slack_id'),
  verificationStatus: text('verification_status'),
  yswsEligible: boolean('ysws_eligible').notNull().default(false),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
});

export const programSeason = pgTable('program_season', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  signupOpensAt: timestamp('signup_opens_at', { mode: 'date' }).notNull(),
  signupClosesAt: timestamp('signup_closes_at', { mode: 'date' }).notNull(),
  startsAt: timestamp('starts_at', { mode: 'date' }).notNull(),
  endsAt: timestamp('ends_at', { mode: 'date' }).notNull(),
  totalWeeks: integer('total_weeks').notNull().default(8),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
});

export const programEnrollment = pgTable('program_enrollment', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  seasonId: text('season_id').notNull().references(() => programSeason.id, { onDelete: 'cascade' }),
  role: enrollmentRoleEnum('role').notNull(),
  status: enrollmentStatusEnum('status').notNull().default('ACTIVE'),
  joinedAt: timestamp('joined_at', { mode: 'date' }).notNull().defaultNow(),
  startingWeek: integer('starting_week').notNull().default(1),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('enrollment_user_season_role_idx').on(table.userId, table.seasonId, table.role)
]);

export const workshop = pgTable('workshop', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  authorId: text('author_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  seasonId: text('season_id').notNull().references(() => programSeason.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  pathway: pathwayEnum('pathway').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  estimatedHours: integer('estimated_hours').notNull(),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

export const workshopCompletion = pgTable('workshop_completion', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workshopId: text('workshop_id').notNull().references(() => workshop.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  seasonId: text('season_id').notNull().references(() => programSeason.id, { onDelete: 'cascade' }),
  projectUrl: text('project_url'),
  startedAt: timestamp('started_at', { mode: 'date' }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { mode: 'date' })
}, (table) => [
  uniqueIndex('completion_workshop_participant_season_idx').on(table.workshopId, table.participantId, table.seasonId)
]);

export const workshopAnalytics = pgTable('workshop_analytics', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workshopId: text('workshop_id').notNull().references(() => workshop.id, { onDelete: 'cascade' }).unique(),
  views: integer('views').notNull().default(0),
  starts: integer('starts').notNull().default(0),
  completions: integer('completions').notNull().default(0),
  avgCompletionMins: real('avg_completion_mins'),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

export const weeklyShip = pgTable('weekly_ship', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  seasonId: text('season_id').notNull().references(() => programSeason.id, { onDelete: 'cascade' }),
  workshopId: text('workshop_id').references(() => workshop.id, { onDelete: 'cascade' }),
  weekNumber: integer('week_number').notNull(),
  goalText: text('goal_text').notNull(),
  status: shipStatusEnum('status').notNull().default('PLANNED'),
  proofUrl: text('proof_url'),
  notes: text('notes'),
  shippedAt: timestamp('shipped_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => [
  index('ship_user_season_week_idx').on(table.userId, table.seasonId, table.weekNumber)
]);

export const ambassadorPayout = pgTable('ambassador_payout', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  ambassadorId: text('ambassador_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  seasonId: text('season_id').notNull().references(() => programSeason.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  status: payoutStatusEnum('status').notNull().default('DRAFT'),
  periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
  periodEnd: timestamp('period_end', { mode: 'date' }).notNull(),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
});

export const ambassadorPayoutItem = pgTable('ambassador_payout_item', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  payoutId: text('payout_id').notNull().references(() => ambassadorPayout.id, { onDelete: 'cascade' }),
  workshopId: text('workshop_id').notNull().references(() => workshop.id, { onDelete: 'cascade' }),
  completionCount: integer('completion_count').notNull(),
  rateCentsPerCompletion: integer('rate_cents_per_completion').notNull(),
  amountCents: integer('amount_cents').notNull()
});

export const userPathway = pgTable('user_pathway', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  pathway: pathwayEnum('pathway').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => [
  uniqueIndex('user_pathway_unique_idx').on(table.userId, table.pathway)
]);

// Relations
export const userRelations = relations(user, ({ many }) => ({
  pathways: many(userPathway),
  sessions: many(session),
  enrollments: many(programEnrollment),
  workshops: many(workshop),
  completions: many(workshopCompletion),
  weeklyShips: many(weeklyShip),
  payouts: many(ambassadorPayout),
  referralLinks: many(referralLink),
  warehouseOrders: many(warehouseOrder),
  }));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const programSeasonRelations = relations(programSeason, ({ many }) => ({
  enrollments: many(programEnrollment),
  workshops: many(workshop),
  completions: many(workshopCompletion),
  weeklyShips: many(weeklyShip),
  payouts: many(ambassadorPayout)
}));

export const programEnrollmentRelations = relations(programEnrollment, ({ one }) => ({
  user: one(user, { fields: [programEnrollment.userId], references: [user.id] }),
  season: one(programSeason, { fields: [programEnrollment.seasonId], references: [programSeason.id] })
}));

export const workshopRelations = relations(workshop, ({ one, many }) => ({
  author: one(user, { fields: [workshop.authorId], references: [user.id] }),
  season: one(programSeason, { fields: [workshop.seasonId], references: [programSeason.id] }),
  completions: many(workshopCompletion),
  analytics: one(workshopAnalytics),
  weeklyShips: many(weeklyShip),
  payoutItems: many(ambassadorPayoutItem)
}));

export const workshopCompletionRelations = relations(workshopCompletion, ({ one }) => ({
  workshop: one(workshop, { fields: [workshopCompletion.workshopId], references: [workshop.id] }),
  participant: one(user, { fields: [workshopCompletion.participantId], references: [user.id] }),
  season: one(programSeason, { fields: [workshopCompletion.seasonId], references: [programSeason.id] })
}));

export const workshopAnalyticsRelations = relations(workshopAnalytics, ({ one }) => ({
  workshop: one(workshop, { fields: [workshopAnalytics.workshopId], references: [workshop.id] })
}));

export const weeklyShipRelations = relations(weeklyShip, ({ one }) => ({
  user: one(user, { fields: [weeklyShip.userId], references: [user.id] }),
  season: one(programSeason, { fields: [weeklyShip.seasonId], references: [programSeason.id] }),
  workshop: one(workshop, { fields: [weeklyShip.workshopId], references: [workshop.id] })
}));

export const ambassadorPayoutRelations = relations(ambassadorPayout, ({ one, many }) => ({
  ambassador: one(user, { fields: [ambassadorPayout.ambassadorId], references: [user.id] }),
  season: one(programSeason, { fields: [ambassadorPayout.seasonId], references: [programSeason.id] }),
  items: many(ambassadorPayoutItem)
}));

export const ambassadorPayoutItemRelations = relations(ambassadorPayoutItem, ({ one }) => ({
  payout: one(ambassadorPayout, { fields: [ambassadorPayoutItem.payoutId], references: [ambassadorPayout.id] }),
  workshop: one(workshop, { fields: [ambassadorPayoutItem.workshopId], references: [workshop.id] })
}));

export const userPathwayRelations = relations(userPathway, ({ one }) => ({
	user: one(user, { fields: [userPathway.userId], references: [user.id] })
}));

// Ambassador pathway assignments - which pathways an ambassador can edit
export const ambassadorPathway = pgTable('ambassador_pathway', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	pathway: pathwayEnum('pathway').notNull(),
	assignedAt: timestamp('assigned_at', { mode: 'date' }).notNull().defaultNow(),
	assignedBy: text('assigned_by').notNull().references(() => user.id)
}, (table) => [
	uniqueIndex('ambassador_pathway_unique_idx').on(table.userId, table.pathway)
]);

// Pathway week content - stores markdown content for each week
export const pathwayWeekContent = pgTable('pathway_week_content', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	pathway: pathwayEnum('pathway').notNull(),
	weekNumber: integer('week_number').notNull(),
	title: text('title').notNull().default(''),
	content: text('content').notNull().default(''),
	isPublished: boolean('is_published').notNull().default(false),
	lastEditedBy: text('last_edited_by').references(() => user.id),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => [
	uniqueIndex('pathway_week_content_unique_idx').on(table.pathway, table.weekNumber)
]);

export const referralLink = pgTable('referral_link', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	ambassadorId: text('ambassador_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	pathway: pathwayEnum('pathway').notNull(),
	code: text('code').notNull().unique(),
	label: text('label'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
});

export const referralSignup = pgTable('referral_signup', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	referralLinkId: text('referral_link_id').notNull().references(() => referralLink.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => [
	uniqueIndex('referral_signup_unique_idx').on(table.referralLinkId, table.userId)
]);

export const ambassadorPathwayRelations = relations(ambassadorPathway, ({ one }) => ({
	user: one(user, { fields: [ambassadorPathway.userId], references: [user.id] }),
	assignedByUser: one(user, { fields: [ambassadorPathway.assignedBy], references: [user.id] })
}));

export const pathwayWeekContentRelations = relations(pathwayWeekContent, ({ one }) => ({
	editor: one(user, { fields: [pathwayWeekContent.lastEditedBy], references: [user.id] })
}));

export const referralLinkRelations = relations(referralLink, ({ one, many }) => ({
	ambassador: one(user, { fields: [referralLink.ambassadorId], references: [user.id] }),
	signups: many(referralSignup)
}));

export const referralSignupRelations = relations(referralSignup, ({ one }) => ({
	referralLink: one(referralLink, { fields: [referralSignup.referralLinkId], references: [referralLink.id] }),
	user: one(user, { fields: [referralSignup.userId], references: [user.id] })
}));

// Warehouse categories
export const warehouseCategory = pgTable('warehouse_category', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	name: text('name').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
});

// Warehouse items - inventory managed by admins
export const warehouseItem = pgTable('warehouse_item', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	categoryId: text('category_id').references(() => warehouseCategory.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	sku: text('sku').notNull().unique(),
	sizing: text('sizing'),
	packageType: text('package_type').notNull().default('box'),
	lengthIn: real('length_in').notNull(),
	widthIn: real('width_in').notNull(),
	heightIn: real('height_in').notNull(),
	weightGrams: real('weight_grams').notNull(),
	costCents: integer('cost_cents').notNull(),
	quantity: integer('quantity').notNull().default(0),
	imageUrl: text('image_url'),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

// Warehouse orders
export const warehouseOrder = pgTable('warehouse_order', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	createdById: text('created_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	batchId: text('batch_id'),
	status: warehouseOrderStatusEnum('status').notNull().default('DRAFT'),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull(),
	phone: text('phone'),
	addressLine1: text('address_line_1').notNull(),
	addressLine2: text('address_line_2'),
	city: text('city').notNull(),
	stateProvince: text('state_province').notNull(),
	postalCode: text('postal_code'),
	country: text('country').notNull(),
	estimatedShippingCents: integer('estimated_shipping_cents'),
	estimatedServiceName: text('estimated_service_name'),
	estimatedPackageType: text('estimated_package_type'),
	estimatedTotalLengthIn: real('estimated_total_length_in'),
	estimatedTotalWidthIn: real('estimated_total_width_in'),
	estimatedTotalHeightIn: real('estimated_total_height_in'),
	estimatedTotalWeightGrams: real('estimated_total_weight_grams'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

// Warehouse order line items
export const warehouseOrderItem = pgTable('warehouse_order_item', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	orderId: text('order_id').notNull().references(() => warehouseOrder.id, { onDelete: 'cascade' }),
	warehouseItemId: text('warehouse_item_id').notNull().references(() => warehouseItem.id, { onDelete: 'restrict' }),
	quantity: integer('quantity').notNull().default(1),
	sizingChoice: text('sizing_choice')
});

// Warehouse order tags for filtering
export const warehouseOrderTag = pgTable('warehouse_order_tag', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	orderId: text('order_id').notNull().references(() => warehouseOrder.id, { onDelete: 'cascade' }),
	tag: text('tag').notNull()
}, (table) => [
	uniqueIndex('warehouse_order_tag_unique_idx').on(table.orderId, table.tag),
	index('warehouse_order_tag_tag_idx').on(table.tag)
]);

export const warehouseOrderRelations = relations(warehouseOrder, ({ one, many }) => ({
	createdBy: one(user, { fields: [warehouseOrder.createdById], references: [user.id] }),
	items: many(warehouseOrderItem),
	tags: many(warehouseOrderTag)
}));

export const warehouseOrderItemRelations = relations(warehouseOrderItem, ({ one }) => ({
	order: one(warehouseOrder, { fields: [warehouseOrderItem.orderId], references: [warehouseOrder.id] }),
	warehouseItem: one(warehouseItem, { fields: [warehouseOrderItem.warehouseItemId], references: [warehouseItem.id] })
}));

export const warehouseOrderTagRelations = relations(warehouseOrderTag, ({ one }) => ({
	order: one(warehouseOrder, { fields: [warehouseOrderTag.orderId], references: [warehouseOrder.id] })
}));

// Order templates
export const warehouseOrderTemplate = pgTable('warehouse_order_template', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	createdById: text('created_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	isPublic: boolean('is_public').notNull().default(false),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

export const warehouseOrderTemplateItem = pgTable('warehouse_order_template_item', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	templateId: text('template_id').notNull().references(() => warehouseOrderTemplate.id, { onDelete: 'cascade' }),
	warehouseItemId: text('warehouse_item_id').notNull().references(() => warehouseItem.id, { onDelete: 'restrict' }),
	quantity: integer('quantity').notNull().default(1)
});

export const warehouseOrderTemplateRelations = relations(warehouseOrderTemplate, ({ one, many }) => ({
	createdBy: one(user, { fields: [warehouseOrderTemplate.createdById], references: [user.id] }),
	items: many(warehouseOrderTemplateItem)
}));

export const warehouseOrderTemplateItemRelations = relations(warehouseOrderTemplateItem, ({ one }) => ({
	template: one(warehouseOrderTemplate, { fields: [warehouseOrderTemplateItem.templateId], references: [warehouseOrderTemplate.id] }),
	warehouseItem: one(warehouseItem, { fields: [warehouseOrderTemplateItem.warehouseItemId], references: [warehouseItem.id] })
}));

// Batches
export const warehouseBatch = pgTable('warehouse_batch', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	createdById: text('created_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	templateId: text('template_id').notNull().references(() => warehouseOrderTemplate.id, { onDelete: 'restrict' }),
	title: text('title'),
	status: warehouseBatchStatusEnum('status').notNull().default('AWAITING_MAPPING'),
	csvData: text('csv_data').notNull(),
	fieldMapping: text('field_mapping'),
	addressCount: integer('address_count').notNull().default(0),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

export const warehouseBatchTag = pgTable('warehouse_batch_tag', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	batchId: text('batch_id').notNull().references(() => warehouseBatch.id, { onDelete: 'cascade' }),
	tag: text('tag').notNull()
}, (table) => [
	uniqueIndex('warehouse_batch_tag_unique_idx').on(table.batchId, table.tag)
]);

export const warehouseBatchRelations = relations(warehouseBatch, ({ one, many }) => ({
	createdBy: one(user, { fields: [warehouseBatch.createdById], references: [user.id] }),
	template: one(warehouseOrderTemplate, { fields: [warehouseBatch.templateId], references: [warehouseOrderTemplate.id] }),
	tags: many(warehouseBatchTag)
}));

export const warehouseBatchTagRelations = relations(warehouseBatchTag, ({ one }) => ({
	batch: one(warehouseBatch, { fields: [warehouseBatchTag.batchId], references: [warehouseBatch.id] })
}));
