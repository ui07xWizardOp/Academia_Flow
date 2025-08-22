import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['student', 'professor', 'admin']),
  university: z.string().optional(),
  department: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;

// Problem schema
export const problemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string(),
  tags: z.array(z.string()),
  starterCode: z.record(z.string(), z.string()), // language -> code
  solution: z.record(z.string(), z.string()), // language -> solution
  timeLimit: z.number().default(10), // seconds
  memoryLimit: z.number().default(128), // MB
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertProblemSchema = problemSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = z.infer<typeof problemSchema>;

// Test case schema
export const testCaseSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid(),
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean().default(false),
  explanation: z.string().optional(),
});

export const insertTestCaseSchema = testCaseSchema.omit({ id: true });
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;

// Submission schema
export const submissionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  problemId: z.string().uuid(),
  language: z.enum(['python', 'javascript', 'java']),
  code: z.string(),
  status: z.enum(['pending', 'running', 'passed', 'failed', 'error', 'timeout']),
  score: z.number().min(0).max(100).optional(),
  executionTime: z.number().optional(), // milliseconds
  memoryUsage: z.number().optional(), // MB
  output: z.string().optional(),
  error: z.string().optional(),
  testResults: z.array(z.object({
    passed: z.boolean(),
    input: z.string(),
    expectedOutput: z.string(),
    actualOutput: z.string(),
    executionTime: z.number(),
  })).optional(),
  submittedAt: z.date(),
});

export const insertSubmissionSchema = submissionSchema.omit({ id: true, submittedAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = z.infer<typeof submissionSchema>;

// Progress schema
export const progressSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  problemId: z.string().uuid(),
  status: z.enum(['not_started', 'attempted', 'solved']),
  bestScore: z.number().min(0).max(100).optional(),
  attempts: z.number().default(0),
  timeSpent: z.number().default(0), // minutes
  lastAttemptAt: z.date().optional(),
  solvedAt: z.date().optional(),
});

export const insertProgressSchema = progressSchema.omit({ id: true });
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type Progress = z.infer<typeof progressSchema>;

// API Response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Code execution types
export type ExecutionRequest = {
  language: 'python' | 'javascript' | 'java';
  code: string;
  input?: string;
  timeLimit?: number;
  memoryLimit?: number;
};

export type ExecutionResult = {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number; // milliseconds
  memoryUsage: number; // MB
  exitCode: number;
};