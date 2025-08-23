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
  jobListings,
  jobApplications,
  resumes,
  careerCounseling,
  companies,
  careerEvents,
  eventRegistrations,
  alumniProfiles,
  mentorshipRequests,
  internships,
  skillsAssessments,
  careerPaths,
  careerResources,
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
  type InsertDiscussion,
  type JobListing,
  type InsertJobListing,
  type JobApplication,
  type InsertJobApplication,
  type Resume,
  type InsertResume,
  type CareerCounseling,
  type InsertCareerCounseling,
  type Company,
  type InsertCompany,
  type CareerEvent,
  type InsertCareerEvent,
  type EventRegistration,
  type InsertEventRegistration,
  type AlumniProfile,
  type InsertAlumniProfile,
  type MentorshipRequest,
  type InsertMentorshipRequest,
  type Internship,
  type InsertInternship,
  type SkillsAssessment,
  type InsertSkillsAssessment,
  type CareerPath,
  type InsertCareerPath,
  type CareerResource,
  type InsertCareerResource
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Problem methods
  getAllProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  getProblemsByDifficulty(difficulty: string): Promise<Problem[]>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  updateProblem(id: number, updates: Partial<Problem>): Promise<Problem>;
  updateProblemTestCases(id: number, testCases: any): Promise<void>;
  softDeleteProblem(id: number): Promise<void>;
  
  // Submission methods
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getUserSubmissions(userId: number): Promise<Submission[]>;
  getProblemSubmissions(problemId: number, userId: number): Promise<Submission[]>;
  getSubmissionsByProblem(problemId: number): Promise<Submission[]>;
  
  // Progress methods
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserProgressForProblem(userId: number, problemId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: number, problemId: number, progress: Partial<InsertUserProgress>): Promise<UserProgress>;
  getProgressByProblem(problemId: number): Promise<UserProgress[]>;
  
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
  
  // Career Services - Job Listings
  createJobListing(job: InsertJobListing): Promise<JobListing>;
  getJobListing(id: number): Promise<JobListing | undefined>;
  getAllJobListings(): Promise<JobListing[]>;
  getActiveJobListings(): Promise<JobListing[]>;
  updateJobListing(id: number, updates: Partial<InsertJobListing>): Promise<JobListing>;
  deleteJobListing(id: number): Promise<void>;
  
  // Career Services - Job Applications
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  getJobApplication(id: number): Promise<JobApplication | undefined>;
  getUserJobApplications(userId: number): Promise<JobApplication[]>;
  getJobApplicationsForListing(jobId: number): Promise<JobApplication[]>;
  updateJobApplication(id: number, updates: Partial<InsertJobApplication>): Promise<JobApplication>;
  
  // Career Services - Resumes
  createResume(resume: InsertResume): Promise<Resume>;
  getResume(id: number): Promise<Resume | undefined>;
  getUserResumes(userId: number): Promise<Resume[]>;
  updateResume(id: number, updates: Partial<InsertResume>): Promise<Resume>;
  deleteResume(id: number): Promise<void>;
  setDefaultResume(userId: number, resumeId: number): Promise<void>;
  
  // Career Services - Career Counseling
  scheduleCareerCounseling(session: InsertCareerCounseling): Promise<CareerCounseling>;
  getCareerCounselingSession(id: number): Promise<CareerCounseling | undefined>;
  getUserCounselingSessions(userId: number): Promise<CareerCounseling[]>;
  getCounselorSessions(counselorId: number): Promise<CareerCounseling[]>;
  updateCounselingSession(id: number, updates: Partial<InsertCareerCounseling>): Promise<CareerCounseling>;
  
  // Career Services - Companies
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: number): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  getActivePartners(): Promise<Company[]>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company>;
  
  // Career Services - Career Events
  createCareerEvent(event: InsertCareerEvent): Promise<CareerEvent>;
  getCareerEvent(id: number): Promise<CareerEvent | undefined>;
  getUpcomingEvents(): Promise<CareerEvent[]>;
  registerForEvent(registration: InsertEventRegistration): Promise<EventRegistration>;
  getEventRegistrations(eventId: number): Promise<EventRegistration[]>;
  getUserEventRegistrations(userId: number): Promise<EventRegistration[]>;
  
  // Career Services - Alumni Network
  createAlumniProfile(profile: InsertAlumniProfile): Promise<AlumniProfile>;
  getAlumniProfile(id: number): Promise<AlumniProfile | undefined>;
  getAlumniProfiles(): Promise<AlumniProfile[]>;
  getMentorProfiles(): Promise<AlumniProfile[]>;
  requestMentorship(request: InsertMentorshipRequest): Promise<MentorshipRequest>;
  getMentorshipRequests(mentorId: number): Promise<MentorshipRequest[]>;
  updateMentorshipRequest(id: number, updates: Partial<InsertMentorshipRequest>): Promise<MentorshipRequest>;
  
  // Career Services - Internships
  createInternship(internship: InsertInternship): Promise<Internship>;
  getInternship(id: number): Promise<Internship | undefined>;
  getActiveInternships(): Promise<Internship[]>;
  getCompanyInternships(companyId: number): Promise<Internship[]>;
  updateInternship(id: number, updates: Partial<InsertInternship>): Promise<Internship>;
  
  // Career Services - Skills Assessment
  createSkillsAssessment(assessment: InsertSkillsAssessment): Promise<SkillsAssessment>;
  getUserAssessments(userId: number): Promise<SkillsAssessment[]>;
  getLatestAssessment(userId: number, type: string): Promise<SkillsAssessment | undefined>;
  
  // Career Services - Career Paths
  createCareerPath(path: InsertCareerPath): Promise<CareerPath>;
  getUserCareerPaths(userId: number): Promise<CareerPath[]>;
  updateCareerPath(id: number, updates: Partial<InsertCareerPath>): Promise<CareerPath>;
  
  // Career Services - Career Resources
  createCareerResource(resource: InsertCareerResource): Promise<CareerResource>;
  getCareerResource(id: number): Promise<CareerResource | undefined>;
  getCareerResources(category?: string): Promise<CareerResource[]>;
  incrementResourceViews(id: number): Promise<void>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
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

  async updateProblem(id: number, updates: Partial<Problem>): Promise<Problem> {
    const [updated] = await db
      .update(problems)
      .set(updates)
      .where(eq(problems.id, id))
      .returning();
    return updated;
  }

  async updateProblemTestCases(id: number, testCases: any): Promise<void> {
    await db
      .update(problems)
      .set({ testCases })
      .where(eq(problems.id, id));
  }

  async softDeleteProblem(id: number): Promise<void> {
    // For now, actually delete the problem
    // In production, add a deleted_at column
    await db.delete(problems).where(eq(problems.id, id));
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

  async getSubmissionsByProblem(problemId: number): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.problemId, problemId))
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

  async getProgressByProblem(problemId: number): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.problemId, problemId));
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

  // Career Services - Job Listings Implementation
  async createJobListing(job: InsertJobListing): Promise<JobListing> {
    const [newJob] = await db
      .insert(jobListings)
      .values(job)
      .returning();
    return newJob;
  }

  async getJobListing(id: number): Promise<JobListing | undefined> {
    const [job] = await db.select().from(jobListings).where(eq(jobListings.id, id));
    return job || undefined;
  }

  async getAllJobListings(): Promise<JobListing[]> {
    return await db.select().from(jobListings).orderBy(desc(jobListings.postedDate));
  }

  async getActiveJobListings(): Promise<JobListing[]> {
    return await db
      .select()
      .from(jobListings)
      .where(eq(jobListings.status, 'active'))
      .orderBy(desc(jobListings.postedDate));
  }

  async updateJobListing(id: number, updates: Partial<InsertJobListing>): Promise<JobListing> {
    const [updated] = await db
      .update(jobListings)
      .set(updates)
      .where(eq(jobListings.id, id))
      .returning();
    return updated;
  }

  async deleteJobListing(id: number): Promise<void> {
    await db.delete(jobListings).where(eq(jobListings.id, id));
  }

  // Career Services - Job Applications Implementation
  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    const [newApplication] = await db
      .insert(jobApplications)
      .values(application)
      .returning();
    return newApplication;
  }

  async getJobApplication(id: number): Promise<JobApplication | undefined> {
    const [application] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
    return application || undefined;
  }

  async getUserJobApplications(userId: number): Promise<JobApplication[]> {
    return await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId))
      .orderBy(desc(jobApplications.appliedAt));
  }

  async getJobApplicationsForListing(jobId: number): Promise<JobApplication[]> {
    return await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.jobId, jobId))
      .orderBy(desc(jobApplications.appliedAt));
  }

  async updateJobApplication(id: number, updates: Partial<InsertJobApplication>): Promise<JobApplication> {
    const [updated] = await db
      .update(jobApplications)
      .set(updates)
      .where(eq(jobApplications.id, id))
      .returning();
    return updated;
  }

  // Career Services - Resumes Implementation
  async createResume(resume: InsertResume): Promise<Resume> {
    const [newResume] = await db
      .insert(resumes)
      .values(resume)
      .returning();
    return newResume;
  }

  async getResume(id: number): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume || undefined;
  }

  async getUserResumes(userId: number): Promise<Resume[]> {
    return await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.updatedAt));
  }

  async updateResume(id: number, updates: Partial<InsertResume>): Promise<Resume> {
    const [updated] = await db
      .update(resumes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resumes.id, id))
      .returning();
    return updated;
  }

  async deleteResume(id: number): Promise<void> {
    await db.delete(resumes).where(eq(resumes.id, id));
  }

  async setDefaultResume(userId: number, resumeId: number): Promise<void> {
    await db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.userId, userId));
    
    await db
      .update(resumes)
      .set({ isDefault: true })
      .where(eq(resumes.id, resumeId));
  }

  // Career Services - Career Counseling Implementation
  async scheduleCareerCounseling(session: InsertCareerCounseling): Promise<CareerCounseling> {
    const [newSession] = await db
      .insert(careerCounseling)
      .values(session)
      .returning();
    return newSession;
  }

  async getCareerCounselingSession(id: number): Promise<CareerCounseling | undefined> {
    const [session] = await db.select().from(careerCounseling).where(eq(careerCounseling.id, id));
    return session || undefined;
  }

  async getUserCounselingSessions(userId: number): Promise<CareerCounseling[]> {
    return await db
      .select()
      .from(careerCounseling)
      .where(eq(careerCounseling.studentId, userId))
      .orderBy(desc(careerCounseling.scheduledDate));
  }

  async getCounselorSessions(counselorId: number): Promise<CareerCounseling[]> {
    return await db
      .select()
      .from(careerCounseling)
      .where(eq(careerCounseling.counselorId, counselorId))
      .orderBy(careerCounseling.scheduledDate);
  }

  async updateCounselingSession(id: number, updates: Partial<InsertCareerCounseling>): Promise<CareerCounseling> {
    const [updated] = await db
      .update(careerCounseling)
      .set(updates)
      .where(eq(careerCounseling.id, id))
      .returning();
    return updated;
  }

  // Career Services - Companies Implementation
  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.name);
  }

  async getActivePartners(): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(eq(companies.partnershipStatus, 'active'))
      .orderBy(companies.name);
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  // Career Services - Career Events Implementation
  async createCareerEvent(event: InsertCareerEvent): Promise<CareerEvent> {
    const [newEvent] = await db
      .insert(careerEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getCareerEvent(id: number): Promise<CareerEvent | undefined> {
    const [event] = await db.select().from(careerEvents).where(eq(careerEvents.id, id));
    return event || undefined;
  }

  async getUpcomingEvents(): Promise<CareerEvent[]> {
    return await db
      .select()
      .from(careerEvents)
      .where(sql`${careerEvents.date} > now()`)
      .orderBy(careerEvents.date);
  }

  async registerForEvent(registration: InsertEventRegistration): Promise<EventRegistration> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId));
  }

  async getUserEventRegistrations(userId: number): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(desc(eventRegistrations.registeredAt));
  }

  // Career Services - Alumni Network Implementation
  async createAlumniProfile(profile: InsertAlumniProfile): Promise<AlumniProfile> {
    const [newProfile] = await db
      .insert(alumniProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async getAlumniProfile(id: number): Promise<AlumniProfile | undefined> {
    const [profile] = await db.select().from(alumniProfiles).where(eq(alumniProfiles.id, id));
    return profile || undefined;
  }

  async getAlumniProfiles(): Promise<AlumniProfile[]> {
    return await db.select().from(alumniProfiles).orderBy(desc(alumniProfiles.graduationYear));
  }

  async getMentorProfiles(): Promise<AlumniProfile[]> {
    return await db
      .select()
      .from(alumniProfiles)
      .where(eq(alumniProfiles.willingToMentor, true))
      .orderBy(desc(alumniProfiles.graduationYear));
  }

  async requestMentorship(request: InsertMentorshipRequest): Promise<MentorshipRequest> {
    const [newRequest] = await db
      .insert(mentorshipRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getMentorshipRequests(mentorId: number): Promise<MentorshipRequest[]> {
    return await db
      .select()
      .from(mentorshipRequests)
      .where(eq(mentorshipRequests.mentorId, mentorId))
      .orderBy(desc(mentorshipRequests.requestedAt));
  }

  async updateMentorshipRequest(id: number, updates: Partial<InsertMentorshipRequest>): Promise<MentorshipRequest> {
    const [updated] = await db
      .update(mentorshipRequests)
      .set({ ...updates, respondedAt: new Date() })
      .where(eq(mentorshipRequests.id, id))
      .returning();
    return updated;
  }

  // Career Services - Internships Implementation
  async createInternship(internship: InsertInternship): Promise<Internship> {
    const [newInternship] = await db
      .insert(internships)
      .values(internship)
      .returning();
    return newInternship;
  }

  async getInternship(id: number): Promise<Internship | undefined> {
    const [internship] = await db.select().from(internships).where(eq(internships.id, id));
    return internship || undefined;
  }

  async getActiveInternships(): Promise<Internship[]> {
    return await db
      .select()
      .from(internships)
      .where(eq(internships.status, 'open'))
      .orderBy(desc(internships.createdAt));
  }

  async getCompanyInternships(companyId: number): Promise<Internship[]> {
    return await db
      .select()
      .from(internships)
      .where(eq(internships.companyId, companyId))
      .orderBy(desc(internships.createdAt));
  }

  async updateInternship(id: number, updates: Partial<InsertInternship>): Promise<Internship> {
    const [updated] = await db
      .update(internships)
      .set(updates)
      .where(eq(internships.id, id))
      .returning();
    return updated;
  }

  // Career Services - Skills Assessment Implementation
  async createSkillsAssessment(assessment: InsertSkillsAssessment): Promise<SkillsAssessment> {
    const [newAssessment] = await db
      .insert(skillsAssessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async getUserAssessments(userId: number): Promise<SkillsAssessment[]> {
    return await db
      .select()
      .from(skillsAssessments)
      .where(eq(skillsAssessments.userId, userId))
      .orderBy(desc(skillsAssessments.completedAt));
  }

  async getLatestAssessment(userId: number, type: string): Promise<SkillsAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(skillsAssessments)
      .where(and(
        eq(skillsAssessments.userId, userId),
        eq(skillsAssessments.assessmentType, type)
      ))
      .orderBy(desc(skillsAssessments.completedAt))
      .limit(1);
    return assessment || undefined;
  }

  // Career Services - Career Paths Implementation
  async createCareerPath(path: InsertCareerPath): Promise<CareerPath> {
    const [newPath] = await db
      .insert(careerPaths)
      .values(path)
      .returning();
    return newPath;
  }

  async getUserCareerPaths(userId: number): Promise<CareerPath[]> {
    return await db
      .select()
      .from(careerPaths)
      .where(eq(careerPaths.userId, userId))
      .orderBy(desc(careerPaths.updatedAt));
  }

  async updateCareerPath(id: number, updates: Partial<InsertCareerPath>): Promise<CareerPath> {
    const [updated] = await db
      .update(careerPaths)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(careerPaths.id, id))
      .returning();
    return updated;
  }

  // Career Services - Career Resources Implementation
  async createCareerResource(resource: InsertCareerResource): Promise<CareerResource> {
    const [newResource] = await db
      .insert(careerResources)
      .values(resource)
      .returning();
    return newResource;
  }

  async getCareerResource(id: number): Promise<CareerResource | undefined> {
    const [resource] = await db.select().from(careerResources).where(eq(careerResources.id, id));
    return resource || undefined;
  }

  async getCareerResources(category?: string): Promise<CareerResource[]> {
    if (category) {
      return await db
        .select()
        .from(careerResources)
        .where(eq(careerResources.category, category))
        .orderBy(desc(careerResources.views));
    }
    return await db.select().from(careerResources).orderBy(desc(careerResources.views));
  }

  async incrementResourceViews(id: number): Promise<void> {
    await db
      .update(careerResources)
      .set({ views: sql`${careerResources.views} + 1` })
      .where(eq(careerResources.id, id));
  }
}

export const storage = new DatabaseStorage();
