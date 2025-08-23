import { 
  users, 
  problems, 
  submissions, 
  userProgress, 
  interviewSessions,
  courses,
  enrollments,
  assignments,
  assignmentSubmissions,
  lectures,
  announcements,
  grades,
  attendance,
  discussions,
  type User, 
  type InsertUser,
  type Problem,
  type InsertProblem,
  type Submission,
  type InsertSubmission,
  type UserProgress,
  type InsertUserProgress,
  type InterviewSession,
  type InsertInterviewSession,
  type Course,
  type InsertCourse,
  type Enrollment,
  type InsertEnrollment,
  type Assignment,
  type InsertAssignment,
  type AssignmentSubmission,
  type InsertAssignmentSubmission,
  type Lecture,
  type InsertLecture,
  type Announcement,
  type InsertAnnouncement,
  type Grade,
  type InsertGrade,
  type Attendance,
  type InsertAttendance,
  type Discussion,
  type InsertDiscussion
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Problem methods
  getAllProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  getProblemsByDifficulty(difficulty: string): Promise<Problem[]>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  
  // Submission methods
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getUserSubmissions(userId: number): Promise<Submission[]>;
  getProblemSubmissions(problemId: number, userId: number): Promise<Submission[]>;
  
  // Progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserProgressForProblem(userId: number, problemId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: number, problemId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;
  
  // Interview methods
  createInterviewSession(session: InsertInterviewSession): Promise<InterviewSession>;
  getUserInterviews(userId: number): Promise<InterviewSession[]>;
  updateInterviewSession(id: number, updates: Partial<InsertInterviewSession>): Promise<InterviewSession>;
  
  // Course methods
  createCourse(course: InsertCourse): Promise<Course>;
  getCourse(id: number): Promise<Course | undefined>;
  getProfessorCourses(professorId: number): Promise<Course[]>;
  getAllCourses(): Promise<Course[]>;
  updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: number): Promise<void>;
  
  // Enrollment methods
  enrollStudent(enrollment: InsertEnrollment): Promise<Enrollment>;
  unenrollStudent(courseId: number, studentId: number): Promise<void>;
  getCourseEnrollments(courseId: number): Promise<Enrollment[]>;
  getStudentEnrollments(studentId: number): Promise<Enrollment[]>;
  updateEnrollment(id: number, updates: Partial<InsertEnrollment>): Promise<Enrollment>;
  
  // Assignment methods
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getCourseAssignments(courseId: number): Promise<Assignment[]>;
  updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: number): Promise<void>;
  
  // Assignment Submission methods
  submitAssignment(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission>;
  getAssignmentSubmissions(assignmentId: number): Promise<AssignmentSubmission[]>;
  getStudentAssignmentSubmission(assignmentId: number, studentId: number): Promise<AssignmentSubmission | undefined>;
  gradeAssignmentSubmission(id: number, grade: number, feedback: string, gradedBy: number): Promise<AssignmentSubmission>;
  
  // Lecture methods
  createLecture(lecture: InsertLecture): Promise<Lecture>;
  getCourseLectures(courseId: number): Promise<Lecture[]>;
  updateLecture(id: number, updates: Partial<InsertLecture>): Promise<Lecture>;
  deleteLecture(id: number): Promise<void>;
  
  // Announcement methods
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getCourseAnnouncements(courseId: number): Promise<Announcement[]>;
  updateAnnouncement(id: number, updates: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;
  
  // Grade methods
  createGrade(grade: InsertGrade): Promise<Grade>;
  getStudentCourseGrades(studentId: number, courseId: number): Promise<Grade[]>;
  getCourseGrades(courseId: number): Promise<Grade[]>;
  updateGrade(id: number, updates: Partial<InsertGrade>): Promise<Grade>;
  
  // Attendance methods
  recordAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getStudentCourseAttendance(studentId: number, courseId: number): Promise<Attendance[]>;
  getLectureAttendance(lectureId: number): Promise<Attendance[]>;
  updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance>;
  
  // Discussion methods
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  getCourseDiscussions(courseId: number): Promise<Discussion[]>;
  getDiscussionReplies(parentId: number): Promise<Discussion[]>;
  updateDiscussion(id: number, updates: Partial<InsertDiscussion>): Promise<Discussion>;
  deleteDiscussion(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllProblems(): Promise<Problem[]> {
    return await db.select().from(problems).orderBy(problems.id);
  }

  async getProblem(id: number): Promise<Problem | undefined> {
    const [problem] = await db.select().from(problems).where(eq(problems.id, id));
    return problem || undefined;
  }

  async getProblemsByDifficulty(difficulty: string): Promise<Problem[]> {
    return await db.select().from(problems).where(eq(problems.difficulty, difficulty));
  }

  async createProblem(problem: InsertProblem): Promise<Problem> {
    const [newProblem] = await db
      .insert(problems)
      .values(problem)
      .returning();
    return newProblem;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db
      .insert(submissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
    return submission || undefined;
  }

  async getUserSubmissions(userId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getProblemSubmissions(problemId: number, userId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.problemId, problemId), eq(submissions.userId, userId)))
      .orderBy(desc(submissions.submittedAt));
  }

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
  }

  async getUserProgressForProblem(userId: number, problemId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.problemId, problemId)));
    return progress || undefined;
  }

  async updateUserProgress(userId: number, problemId: number, progressUpdate: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existing = await this.getUserProgressForProblem(userId, problemId);
    
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set(progressUpdate)
        .where(and(eq(userProgress.userId, userId), eq(userProgress.problemId, problemId)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userProgress)
        .values({ userId, problemId, ...progressUpdate })
        .returning();
      return created;
    }
  }

  async createInterviewSession(session: InsertInterviewSession): Promise<InterviewSession> {
    const [newSession] = await db
      .insert(interviewSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getInterviewSession(sessionId: number): Promise<InterviewSession | undefined> {
    const [session] = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.id, sessionId));
    return session || undefined;
  }

  async updateInterviewSession(id: number, updates: Partial<InsertInterviewSession>): Promise<InterviewSession> {
    const [updated] = await db
      .update(interviewSessions)
      .set(updates)
      .where(eq(interviewSessions.id, id))
      .returning();
    return updated;
  }

  async getUserInterviews(userId: number): Promise<InterviewSession[]> {
    return await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, userId))
      .orderBy(desc(interviewSessions.startedAt));
  }

  // Course methods implementation
  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async getProfessorCourses(professorId: number): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.professorId, professorId))
      .orderBy(desc(courses.createdAt));
  }

  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course> {
    const [updated] = await db
      .update(courses)
      .set(updates)
      .where(eq(courses.id, id))
      .returning();
    return updated;
  }

  async deleteCourse(id: number): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Enrollment methods implementation
  async enrollStudent(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db
      .insert(enrollments)
      .values(enrollment)
      .returning();
    return newEnrollment;
  }

  async unenrollStudent(courseId: number, studentId: number): Promise<void> {
    await db
      .delete(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.studentId, studentId)));
  }

  async getCourseEnrollments(courseId: number): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId));
  }

  async getStudentEnrollments(studentId: number): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));
  }

  async updateEnrollment(id: number, updates: Partial<InsertEnrollment>): Promise<Enrollment> {
    const [updated] = await db
      .update(enrollments)
      .set(updates)
      .where(eq(enrollments.id, id))
      .returning();
    return updated;
  }

  // Assignment methods implementation
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db
      .insert(assignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment || undefined;
  }

  async getCourseAssignments(courseId: number): Promise<Assignment[]> {
    return await db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(assignments.dueDate);
  }

  async updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment> {
    const [updated] = await db
      .update(assignments)
      .set(updates)
      .where(eq(assignments.id, id))
      .returning();
    return updated;
  }

  async deleteAssignment(id: number): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  // Assignment Submission methods implementation
  async submitAssignment(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission> {
    const [newSubmission] = await db
      .insert(assignmentSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
    return await db
      .select()
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, assignmentId))
      .orderBy(desc(assignmentSubmissions.submittedAt));
  }

  async getStudentAssignmentSubmission(assignmentId: number, studentId: number): Promise<AssignmentSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(assignmentSubmissions)
      .where(and(
        eq(assignmentSubmissions.assignmentId, assignmentId),
        eq(assignmentSubmissions.studentId, studentId)
      ));
    return submission || undefined;
  }

  async gradeAssignmentSubmission(id: number, grade: number, feedback: string, gradedBy: number): Promise<AssignmentSubmission> {
    const [graded] = await db
      .update(assignmentSubmissions)
      .set({
        grade,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'graded'
      })
      .where(eq(assignmentSubmissions.id, id))
      .returning();
    return graded;
  }

  // Lecture methods implementation
  async createLecture(lecture: InsertLecture): Promise<Lecture> {
    const [newLecture] = await db
      .insert(lectures)
      .values(lecture)
      .returning();
    return newLecture;
  }

  async getCourseLectures(courseId: number): Promise<Lecture[]> {
    return await db
      .select()
      .from(lectures)
      .where(eq(lectures.courseId, courseId))
      .orderBy(lectures.date);
  }

  async updateLecture(id: number, updates: Partial<InsertLecture>): Promise<Lecture> {
    const [updated] = await db
      .update(lectures)
      .set(updates)
      .where(eq(lectures.id, id))
      .returning();
    return updated;
  }

  async deleteLecture(id: number): Promise<void> {
    await db.delete(lectures).where(eq(lectures.id, id));
  }

  // Announcement methods implementation
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getCourseAnnouncements(courseId: number): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.courseId, courseId))
      .orderBy(desc(announcements.createdAt));
  }

  async updateAnnouncement(id: number, updates: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // Grade methods implementation
  async createGrade(grade: InsertGrade): Promise<Grade> {
    const [newGrade] = await db
      .insert(grades)
      .values(grade)
      .returning();
    return newGrade;
  }

  async getStudentCourseGrades(studentId: number, courseId: number): Promise<Grade[]> {
    return await db
      .select()
      .from(grades)
      .where(and(eq(grades.studentId, studentId), eq(grades.courseId, courseId)))
      .orderBy(desc(grades.gradedAt));
  }

  async getCourseGrades(courseId: number): Promise<Grade[]> {
    return await db
      .select()
      .from(grades)
      .where(eq(grades.courseId, courseId))
      .orderBy(desc(grades.gradedAt));
  }

  async updateGrade(id: number, updates: Partial<InsertGrade>): Promise<Grade> {
    const [updated] = await db
      .update(grades)
      .set(updates)
      .where(eq(grades.id, id))
      .returning();
    return updated;
  }

  // Attendance methods implementation
  async recordAttendance(attendanceRecord: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db
      .insert(attendance)
      .values(attendanceRecord)
      .returning();
    return newAttendance;
  }

  async getStudentCourseAttendance(studentId: number, courseId: number): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.studentId, studentId), eq(attendance.courseId, courseId)))
      .orderBy(desc(attendance.date));
  }

  async getLectureAttendance(lectureId: number): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(eq(attendance.lectureId, lectureId));
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance> {
    const [updated] = await db
      .update(attendance)
      .set(updates)
      .where(eq(attendance.id, id))
      .returning();
    return updated;
  }

  // Discussion methods implementation
  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const [newDiscussion] = await db
      .insert(discussions)
      .values(discussion)
      .returning();
    return newDiscussion;
  }

  async getCourseDiscussions(courseId: number): Promise<Discussion[]> {
    return await db
      .select()
      .from(discussions)
      .where(eq(discussions.courseId, courseId))
      .orderBy(desc(discussions.createdAt));
  }

  async getDiscussionReplies(parentId: number): Promise<Discussion[]> {
    return await db
      .select()
      .from(discussions)
      .where(eq(discussions.parentId, parentId))
      .orderBy(discussions.createdAt);
  }

  async updateDiscussion(id: number, updates: Partial<InsertDiscussion>): Promise<Discussion> {
    const [updated] = await db
      .update(discussions)
      .set(updates)
      .where(eq(discussions.id, id))
      .returning();
    return updated;
  }

  async deleteDiscussion(id: number): Promise<void> {
    await db.delete(discussions).where(eq(discussions.id, id));
  }
}

export const storage = new DatabaseStorage();
