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

// [Relations section moved to after table definitions]

// Faculty Feature Tables
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description"),
  professorId: integer("professor_id").references(() => users.id).notNull(),
  semester: varchar("semester", { length: 50 }).notNull(),
  credits: integer("credits").default(3),
  schedule: jsonb("schedule"), // {days: [], time: "", room: ""}
  syllabus: text("syllabus"),
  maxStudents: integer("max_students").default(30),
  status: varchar("status", { length: 20 }).default("active"), // active, archived
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  enrolledAt: timestamp("enrolled_at").default(sql`now()`).notNull(),
  status: varchar("status", { length: 20 }).default("enrolled"), // enrolled, dropped, completed
  grade: varchar("grade", { length: 5 }), // A+, A, B+, etc.
  attendance: integer("attendance").default(0), // percentage
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // homework, quiz, exam, project
  points: integer("points").default(100),
  dueDate: timestamp("due_date").notNull(),
  instructions: text("instructions"),
  attachments: jsonb("attachments"), // array of file URLs
  rubric: jsonb("rubric"), // grading rubric
  allowLateSubmission: boolean("allow_late_submission").default(false),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignments.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  content: text("content"),
  attachments: jsonb("attachments"), // array of file URLs
  submittedAt: timestamp("submitted_at").default(sql`now()`).notNull(),
  grade: integer("grade"),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at"),
  gradedBy: integer("graded_by").references(() => users.id),
  status: varchar("status", { length: 20 }).default("submitted"), // submitted, graded, returned
});

export const lectures = pgTable("lectures", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  topics: text("topics").array(),
  materials: jsonb("materials"), // slides, recordings, notes
  recordingUrl: text("recording_url"),
  attendance: jsonb("attendance"), // array of student IDs who attended
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  expiresAt: timestamp("expires_at"),
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  assignmentId: integer("assignment_id").references(() => assignments.id),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  weight: integer("weight").default(100), // percentage weight
  category: varchar("category", { length: 50 }), // homework, quiz, exam, project, participation
  comments: text("comments"),
  gradedAt: timestamp("graded_at").default(sql`now()`).notNull(),
  gradedBy: integer("graded_by").references(() => users.id).notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  lectureId: integer("lecture_id").references(() => lectures.id),
  date: timestamp("date").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // present, absent, late, excused
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").default(sql`now()`).notNull(),
});

export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  parentId: integer("parent_id").references(() => discussions.id), // for replies
  upvotes: integer("upvotes").default(0),
  isPinned: boolean("is_pinned").default(false),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

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

// Relations (moved here after all table definitions)
export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  progress: many(userProgress),
  interviews: many(interviewSessions),
  createdProblems: many(problems),
  taughtCourses: many(courses),
  enrollments: many(enrollments),
  assignmentSubmissions: many(assignmentSubmissions),
  grades: many(grades),
  attendance: many(attendance),
  announcements: many(announcements),
  discussions: many(discussions),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  professor: one(users, {
    fields: [courses.professorId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  assignments: many(assignments),
  lectures: many(lectures),
  announcements: many(announcements),
  grades: many(grades),
  attendance: many(attendance),
  discussions: many(discussions),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  creator: one(users, {
    fields: [assignments.createdBy],
    references: [users.id],
  }),
  submissions: many(assignmentSubmissions),
  grades: many(grades),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(users, {
    fields: [assignmentSubmissions.studentId],
    references: [users.id],
  }),
  grader: one(users, {
    fields: [assignmentSubmissions.gradedBy],
    references: [users.id],
  }),
}));

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  course: one(courses, {
    fields: [lectures.courseId],
    references: [courses.id],
  }),
  attendance: many(attendance),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  course: one(courses, {
    fields: [announcements.courseId],
    references: [courses.id],
  }),
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  student: one(users, {
    fields: [grades.studentId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [grades.courseId],
    references: [courses.id],
  }),
  assignment: one(assignments, {
    fields: [grades.assignmentId],
    references: [assignments.id],
  }),
  grader: one(users, {
    fields: [grades.gradedBy],
    references: [users.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  course: one(courses, {
    fields: [attendance.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
  }),
  lecture: one(lectures, {
    fields: [attendance.lectureId],
    references: [lectures.id],
  }),
}));

export const discussionsRelations = relations(discussions, ({ one, many }) => ({
  course: one(courses, {
    fields: [discussions.courseId],
    references: [courses.id],
  }),
  author: one(users, {
    fields: [discussions.authorId],
    references: [users.id],
  }),
  parent: one(discussions, {
    fields: [discussions.parentId],
    references: [discussions.id],
  }),
  replies: many(discussions),
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

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions).omit({
  id: true,
  submittedAt: true,
});

export const insertLectureSchema = createInsertSchema(lectures).omit({
  id: true,
  createdAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  gradedAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  recordedAt: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  createdAt: true,
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
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type Lecture = typeof lectures.$inferSelect;
export type InsertLecture = z.infer<typeof insertLectureSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Discussion = typeof discussions.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
