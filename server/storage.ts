import { 
  users, 
  problems, 
  submissions, 
  userProgress, 
  interviewSessions,
  type User, 
  type InsertUser,
  type Problem,
  type InsertProblem,
  type Submission,
  type InsertSubmission,
  type UserProgress,
  type InsertUserProgress,
  type InterviewSession,
  type InsertInterviewSession
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

  async updateInterviewSession(sessionId: number, updates: Partial<InsertInterviewSession>): Promise<InterviewSession> {
    const [updated] = await db
      .update(interviewSessions)
      .set(updates)
      .where(eq(interviewSessions.id, sessionId))
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

  async updateInterviewSession(id: number, updates: Partial<InsertInterviewSession>): Promise<InterviewSession> {
    const [updated] = await db
      .update(interviewSessions)
      .set(updates)
      .where(eq(interviewSessions.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
