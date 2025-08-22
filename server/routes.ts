import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { codeExecutor } from "./code-executor";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertSubmissionSchema, insertInterviewSessionSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid input data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // User routes
  app.get("/api/users/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Problems routes
  app.get("/api/problems", authenticateToken, async (req: any, res) => {
    try {
      const problems = await storage.getAllProblems();
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/problems/:id", authenticateToken, async (req: any, res) => {
    try {
      const problem = await storage.getProblem(parseInt(req.params.id));
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Submissions routes
  app.post("/api/submissions", authenticateToken, async (req: any, res) => {
    try {
      const submissionData = insertSubmissionSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      // Execute code with all test cases for submission
      let executionResult: {
        status: string;
        runtime: number;
        memory: number;
        testsPassed: number;
        totalTests: number;
      } = {
        status: "runtime_error",
        runtime: 0,
        memory: 0,
        testsPassed: 0,
        totalTests: 0,
      };

      try {
        // Get problem for test cases
        const problem = await storage.getProblem(submissionData.problemId);
        if (!problem) {
          throw new Error("Problem not found");
        }

        const testCases = problem.testCases as any[] || [];
        
        if (testCases.length === 0) {
          // If no test cases, just execute the code
          const result = await codeExecutor.executeCode({
            code: submissionData.code,
            language: submissionData.language,
            timeLimit: 10000, // 10 seconds for submission
            memoryLimit: 256 // 256 MB
          });
          
          executionResult = {
            status: result.exitCode === 0 ? "accepted" : "runtime_error",
            runtime: result.runtime,
            memory: result.memory,
            testsPassed: result.exitCode === 0 ? 1 : 0,
            totalTests: 1,
          };
        } else {
          // Execute with all test cases
          const result = await codeExecutor.executeWithTestCases({
            code: submissionData.code,
            language: submissionData.language,
            testCases,
            timeLimit: 10000,
            memoryLimit: 256
          });

          executionResult = {
            status: result.allPassed ? "accepted" : 
                   result.results.some(r => r.error?.includes("Time limit")) ? "time_limit_exceeded" :
                   result.results.some(r => r.exitCode !== 0) ? "runtime_error" : 
                   "wrong_answer",
            runtime: Math.max(...result.results.map(r => r.runtime)),
            memory: Math.max(...result.results.map(r => r.memory)),
            testsPassed: result.results.filter(r => r.exitCode === 0 && !r.error).length,
            totalTests: result.results.length,
          };
        }
      } catch (error) {
        console.error('Submission execution error:', error);
        executionResult = {
          status: "compilation_error",
          runtime: 0,
          memory: 0,
          testsPassed: 0,
          totalTests: 0,
        };
      }

      const submission = await storage.createSubmission({
        ...submissionData,
        ...executionResult,
      });

      // Update user progress
      await storage.updateUserProgress(req.user.id, submissionData.problemId, {
        completed: executionResult.status === "accepted",
        attempts: 1, // This should increment existing attempts
      });

      res.json(submission);
    } catch (error) {
      res.status(400).json({ message: "Invalid submission data" });
    }
  });

  app.get("/api/submissions/user/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own submissions unless they're professors/admins
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const submissions = await storage.getUserSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Progress routes
  app.get("/api/progress/user/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Interview routes
  app.post("/api/interviews", authenticateToken, async (req: any, res) => {
    try {
      const sessionData = insertInterviewSessionSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const session = await storage.createInterviewSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid interview session data" });
    }
  });

  app.get("/api/interviews/user/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const interviews = await storage.getUserInterviews(userId);
      res.json(interviews);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/interviews/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const session = await storage.updateInterviewSession(id, updates);
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Code execution route
  app.post("/api/code/execute", authenticateToken, async (req: any, res) => {
    try {
      const { code, language, problemId } = req.body;
      
      // Get problem details for test cases if available
      let testCases: any[] | undefined;
      if (problemId) {
        const problem = await storage.getProblem(parseInt(problemId));
        if (problem && problem.testCases) {
          testCases = problem.testCases as any[];
        }
      }

      // Execute code with Docker
      const result = await codeExecutor.executeCode({
        code,
        language,
        testCases: testCases?.slice(0, 3), // Limit to first 3 test cases for "Run Code"
        timeLimit: 5000, // 5 seconds
        memoryLimit: 128 // 128 MB
      });

      res.json(result);
    } catch (error) {
      console.error('Code execution error:', error);
      res.status(500).json({ 
        message: "Code execution failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Enhanced progress tracking route
  app.get("/api/progress/user/:userId/detailed", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own detailed progress unless they're professors/admins
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { progressTracker } = await import("./progress-tracker");
      const detailedProgress = await progressTracker.calculateUserProgress(userId);
      const recommendations = await progressTracker.getRecommendations(userId);
      const ranking = await progressTracker.getUserRanking(userId);

      res.json({
        ...detailedProgress,
        recommendations,
        ranking
      });
    } catch (error) {
      console.error('Detailed progress error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
