import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("student"), // student, professor, admin
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // easy, medium, hard
  topics: text("topics").array().notNull(), // array of topic strings
  starterCode: jsonb("starter_code"), // {python: "code", javascript: "code", etc}
  testCases: jsonb("test_cases"), // array of test case objects
  solution: jsonb("solution"), // optional reference solution
  // LeetCode integration fields
  leetcodeId: integer("leetcode_id"),
  companies: text("companies").array().default(sql`ARRAY[]::text[]`), // companies that ask this problem
  acceptanceRate: integer("acceptance_rate").default(0), // percentage acceptance rate
  premium: boolean("premium").default(false),
  examples: jsonb("examples"), // problem examples
  constraints: text("constraints").array(), // problem constraints
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  problemId: integer("problem_id").references(() => problems.id).notNull(),
  code: text("code").notNull(),
  language: varchar("language", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // accepted, wrong_answer, time_limit_exceeded, etc
  runtime: integer("runtime"), // in milliseconds
  memory: integer("memory"), // in KB
  testsPassed: integer("tests_passed").default(0),
  totalTests: integer("total_tests").default(0),
  submittedAt: timestamp("submitted_at").default(sql`now()`).notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  problemId: integer("problem_id").references(() => problems.id).notNull(),
  completed: boolean("completed").default(false),
  bestSubmissionId: integer("best_submission_id").references(() => submissions.id),
  attempts: integer("attempts").default(0),
  timeSpent: integer("time_spent").default(0), // in minutes
  lastAttemptAt: timestamp("last_attempt_at").default(sql`now()`),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // technical, behavioral
  status: varchar("status", { length: 20 }).notNull(), // in_progress, completed, cancelled
  score: integer("score"), // 0-100
  feedback: jsonb("feedback"), // AI-generated feedback
  duration: integer("duration"), // in minutes
  startedAt: timestamp("started_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  progress: many(userProgress),
  interviews: many(interviewSessions),
  createdProblems: many(problems),
}));

export const problemsRelations = relations(problems, ({ one, many }) => ({
  creator: one(users, {
    fields: [problems.createdBy],
    references: [users.id],
  }),
  submissions: many(submissions),
  progress: many(userProgress),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  problem: one(problems, {
    fields: [submissions.problemId],
    references: [problems.id],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
  problem: one(problems, {
    fields: [userProgress.problemId],
    references: [problems.id],
  }),
  bestSubmission: one(submissions, {
    fields: [userProgress.bestSubmissionId],
    references: [submissions.id],
  }),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one }) => ({
  user: one(users, {
    fields: [interviewSessions.userId],
    references: [users.id],
  }),
}));

// AI Interview Tables
export const aiInterviewSessions = pgTable("ai_interview_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  score: integer("score"),
  feedback: jsonb("feedback"),
  duration: integer("duration"),
  userContext: jsonb("user_context"),
  conversationStage: text("conversation_stage"),
  startedAt: timestamp("started_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const aiInterviewMessages = pgTable("ai_interview_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => aiInterviewSessions.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").default(sql`now()`).notNull(),
});

// Intelligent Tutoring Tables
export const intelligentTutoringSessions = pgTable("intelligent_tutoring_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  topic: text("topic").notNull(),
  topicBreakdown: jsonb("topic_breakdown"),
  currentSubtopic: integer("current_subtopic").default(0),
  status: text("status").notNull().default("active"),
  startedAt: timestamp("started_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
  feedback: text("feedback")
});

export const intelligentTutoringMessages = pgTable("intelligent_tutoring_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => intelligentTutoringSessions.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").default(sql`now()`).notNull()
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  lastAttemptAt: true,
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  startedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Problem = typeof problems.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
