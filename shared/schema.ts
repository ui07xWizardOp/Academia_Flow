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

// Career Services Tables
export const jobListings = pgTable("job_listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // full-time, part-time, internship, contract
  description: text("description").notNull(),
  requirements: text("requirements").array(),
  salary: jsonb("salary"), // {min: number, max: number, currency: string}
  benefits: text("benefits").array(),
  applicationDeadline: timestamp("application_deadline"),
  postedDate: timestamp("posted_date").default(sql`now()`).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, closed, filled
  companyLogo: text("company_logo"),
  applicationUrl: text("application_url"),
  contactEmail: text("contact_email"),
  tags: text("tags").array(),
  experienceLevel: varchar("experience_level", { length: 50 }), // entry, mid, senior, executive
  createdBy: integer("created_by").references(() => users.id),
});

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobListings.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  resumeId: integer("resume_id").references(() => resumes.id),
  coverLetter: text("cover_letter"),
  status: varchar("status", { length: 50 }).default("submitted"), // submitted, reviewing, interviewed, offered, rejected, accepted
  appliedAt: timestamp("applied_at").default(sql`now()`).notNull(),
  notes: text("notes"),
  followUpDate: timestamp("follow_up_date"),
});

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  template: varchar("template", { length: 50 }).default("professional"), // professional, modern, creative, minimal
  content: jsonb("content").notNull(), // Structured resume data
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const careerCounseling = pgTable("career_counseling", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  counselorId: integer("counselor_id").references(() => users.id).notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(60), // minutes
  type: varchar("type", { length: 50 }).notNull(), // career-planning, resume-review, mock-interview, general
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, completed, cancelled, no-show
  notes: text("notes"),
  meetingUrl: text("meeting_url"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  size: varchar("size", { length: 50 }), // startup, small, medium, large, enterprise
  location: text("location"),
  website: text("website"),
  logo: text("logo"),
  description: text("description"),
  partnershipStatus: varchar("partnership_status", { length: 50 }).default("active"), // active, pending, inactive
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  hiringActive: boolean("hiring_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const careerEvents = pgTable("career_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // workshop, career-fair, info-session, networking
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration"), // minutes
  location: text("location"),
  isVirtual: boolean("is_virtual").default(false),
  meetingUrl: text("meeting_url"),
  maxAttendees: integer("max_attendees"),
  registrationDeadline: timestamp("registration_deadline"),
  presenter: text("presenter"),
  companyId: integer("company_id").references(() => companies.id),
  tags: text("tags").array(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => careerEvents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  registeredAt: timestamp("registered_at").default(sql`now()`).notNull(),
  attended: boolean("attended").default(false),
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5
});

export const alumniProfiles = pgTable("alumni_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  graduationYear: integer("graduation_year").notNull(),
  degree: text("degree").notNull(),
  major: text("major").notNull(),
  currentCompany: text("current_company"),
  currentPosition: text("current_position"),
  industry: text("industry"),
  location: text("location"),
  bio: text("bio"),
  linkedinUrl: text("linkedin_url"),
  willingToMentor: boolean("willing_to_mentor").default(false),
  areasOfExpertise: text("areas_of_expertise").array(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const mentorshipRequests = pgTable("mentorship_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  mentorId: integer("mentor_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, declined
  requestedAt: timestamp("requested_at").default(sql`now()`).notNull(),
  respondedAt: timestamp("responded_at"),
  responseMessage: text("response_message"),
});

export const internships = pgTable("internships", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").array(),
  duration: text("duration"), // e.g., "3 months", "Summer 2024"
  isPaid: boolean("is_paid").default(true),
  stipend: text("stipend"),
  location: text("location"),
  isRemote: boolean("is_remote").default(false),
  applicationDeadline: timestamp("application_deadline"),
  startDate: timestamp("start_date"),
  departments: text("departments").array(),
  status: varchar("status", { length: 20 }).default("open"), // open, closed, filled
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const skillsAssessments = pgTable("skills_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  assessmentType: varchar("assessment_type", { length: 50 }).notNull(), // technical, soft-skills, personality
  results: jsonb("results").notNull(), // Detailed assessment results
  strengths: text("strengths").array(),
  areasForImprovement: text("areas_for_improvement").array(),
  recommendations: text("recommendations").array(),
  completedAt: timestamp("completed_at").default(sql`now()`).notNull(),
});

export const careerPaths = pgTable("career_paths", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetRole: text("target_role").notNull(),
  currentLevel: varchar("current_level", { length: 50 }), // student, entry, mid, senior
  targetIndustry: text("target_industry"),
  timeline: text("timeline"), // e.g., "2 years", "5 years"
  requiredSkills: text("required_skills").array(),
  milestones: jsonb("milestones"), // Array of milestone objects
  progress: integer("progress").default(0), // percentage
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const careerResources = pgTable("career_resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // guide, template, video, article, tool
  category: varchar("category", { length: 50 }).notNull(), // resume, interview, networking, job-search
  description: text("description"),
  content: text("content"),
  fileUrl: text("file_url"),
  tags: text("tags").array(),
  views: integer("views").default(0),
  isPublic: boolean("is_public").default(true),
  createdBy: integer("created_by").references(() => users.id),
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

// Insert schemas for Career Services
export const insertJobListingSchema = createInsertSchema(jobListings).omit({
  id: true,
  postedDate: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  appliedAt: true,
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareerCounselingSchema = createInsertSchema(careerCounseling).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertCareerEventSchema = createInsertSchema(careerEvents).omit({
  id: true,
  createdAt: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  registeredAt: true,
});

export const insertAlumniProfileSchema = createInsertSchema(alumniProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertMentorshipRequestSchema = createInsertSchema(mentorshipRequests).omit({
  id: true,
  requestedAt: true,
});

export const insertInternshipSchema = createInsertSchema(internships).omit({
  id: true,
  createdAt: true,
});

export const insertSkillsAssessmentSchema = createInsertSchema(skillsAssessments).omit({
  id: true,
  completedAt: true,
});

export const insertCareerPathSchema = createInsertSchema(careerPaths).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareerResourceSchema = createInsertSchema(careerResources).omit({
  id: true,
  createdAt: true,
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

// Career Services Types
export type JobListing = typeof jobListings.$inferSelect;
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type Resume = typeof resumes.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type CareerCounseling = typeof careerCounseling.$inferSelect;
export type InsertCareerCounseling = z.infer<typeof insertCareerCounselingSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type CareerEvent = typeof careerEvents.$inferSelect;
export type InsertCareerEvent = z.infer<typeof insertCareerEventSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type AlumniProfile = typeof alumniProfiles.$inferSelect;
export type InsertAlumniProfile = z.infer<typeof insertAlumniProfileSchema>;
export type MentorshipRequest = typeof mentorshipRequests.$inferSelect;
export type InsertMentorshipRequest = z.infer<typeof insertMentorshipRequestSchema>;
export type Internship = typeof internships.$inferSelect;
export type InsertInternship = z.infer<typeof insertInternshipSchema>;
export type SkillsAssessment = typeof skillsAssessments.$inferSelect;
export type InsertSkillsAssessment = z.infer<typeof insertSkillsAssessmentSchema>;
export type CareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = z.infer<typeof insertCareerPathSchema>;
export type CareerResource = typeof careerResources.$inferSelect;
export type InsertCareerResource = z.infer<typeof insertCareerResourceSchema>;

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
