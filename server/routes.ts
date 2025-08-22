import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

      // TODO: Execute code in Docker container here
      // For now, we'll simulate execution results
      const simulatedResult = {
        status: "accepted",
        runtime: 52,
        memory: 14200,
        testsPassed: 2,
        totalTests: 2,
      };

      const submission = await storage.createSubmission({
        ...submissionData,
        ...simulatedResult,
      });

      // Update user progress
      await storage.updateUserProgress(req.user.id, submissionData.problemId, {
        completed: simulatedResult.status === "accepted",
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

  // Code execution route (stubbed for now)
  app.post("/api/code/execute", authenticateToken, async (req: any, res) => {
    try {
      const { code, language, problemId } = req.body;
      
      // TODO: Implement Docker-based code execution
      // For now, return simulated results
      const result = {
        stdout: "Test output",
        stderr: "",
        exitCode: 0,
        runtime: Math.floor(Math.random() * 100) + 20,
        memory: Math.floor(Math.random() * 5000) + 10000,
      };

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Code execution failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
