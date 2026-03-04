import { pgTable, text, timestamp, boolean, integer, real, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Enums
export const enrollmentRoleEnum = pgEnum('enrollment_role', ['PARTICIPANT', 'AMBASSADOR']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['ACTIVE', 'DROPPED', 'COMPLETED']);
export const pathwayEnum = pgEnum('pathway', ['PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING']);
export const difficultyEnum = pgEnum('difficulty', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export const shipStatusEnum = pgEnum('ship_status', ['PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MISSED']);
export const payoutStatusEnum = pgEnum('payout_status', ['DRAFT', 'PENDING', 'PAID', 'CANCELED']);

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
  reviewerAssignments: many(reviewerPathway)
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

// Reviewer pathway assignments - which pathways a reviewer can review
export const reviewerPathway = pgTable('reviewer_pathway', {
	id: text('id').primaryKey().$defaultFn(() => createId()),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	pathway: pathwayEnum('pathway').notNull(),
	assignedAt: timestamp('assigned_at', { mode: 'date' }).notNull().defaultNow(),
	assignedBy: text('assigned_by').notNull().references(() => user.id)
}, (table) => [
	uniqueIndex('reviewer_pathway_unique_idx').on(table.userId, table.pathway)
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

export const reviewerPathwayRelations = relations(reviewerPathway, ({ one }) => ({
	user: one(user, { fields: [reviewerPathway.userId], references: [user.id] }),
	assignedByUser: one(user, { fields: [reviewerPathway.assignedBy], references: [user.id] })
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
