import type { Express } from "express";
import { createServer, type Server } from "http";
import { initializeCollaboration } from "./real-time-collaboration";
import { storage } from "./storage";
import { secureCodeExecutor } from "./code-executor-secure";
import { safeExecutor } from "./safe-executor";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertSubmissionSchema, insertInterviewSessionSchema } from "@shared/schema";
import careerRoutes from "./career-routes";
import lmsRoutes from "./lms-integrations";
import jobRoutes from "./job-integrations";

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
      console.error("Registration error:", error);
      res.status(400).json({ 
        message: "Invalid input data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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
      // Log for debugging
      console.log('Submission request body:', req.body);
      console.log('User ID:', req.user.id);
      
      const submissionData = {
        userId: req.user.id,
        problemId: req.body.problemId,
        code: req.body.code,
        language: req.body.language,
        status: "pending", // Will be updated after execution
        runtime: null,
        memory: null,
        testsPassed: 0,
        totalTests: 0,
      };

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
          let result;
          try {
            result = await secureCodeExecutor.executeCode({
              code: submissionData.code,
              language: submissionData.language,
              timeLimit: 10000, // 10 seconds for submission
              memoryLimit: 256 // 256 MB
            });
          } catch (execError: any) {
            // Fallback to safe executor for permission errors
            if (execError.message?.includes('EPERM') || execError.message?.includes('spawn')) {
              const safeResult = safeExecutor.execute(submissionData.language, submissionData.code, '');
              result = {
                stdout: safeResult.stdout,
                stderr: safeResult.stderr,
                exitCode: safeResult.exitCode,
                runtime: safeResult.runtime,
                memory: 0
              };
            } else {
              throw execError;
            }
          }
          
          executionResult = {
            status: result.exitCode === 0 ? "accepted" : "runtime_error",
            runtime: result.runtime,
            memory: result.memory,
            testsPassed: result.exitCode === 0 ? 1 : 0,
            totalTests: 1,
          };
        } else {
          // Execute with all test cases
          let result;
          try {
            result = await secureCodeExecutor.executeWithTestCases({
              code: submissionData.code,
              language: submissionData.language,
              testCases,
              timeLimit: 10000,
              memoryLimit: 256
            });
          } catch (execError: any) {
            // Fallback to safe executor for permission errors
            if (execError.message?.includes('EPERM') || execError.message?.includes('spawn')) {
              // Execute each test case using safe executor
              const results = [];
              let totalRuntime = 0;
              
              for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const safeResult = safeExecutor.execute(submissionData.language, submissionData.code, tc.input);
                const passed = safeResult.stdout.trim() === tc.expectedOutput.trim();
                
                results.push({
                  passed,
                  runtime: safeResult.runtime,
                  memory: 0,
                  error: safeResult.stderr || undefined
                });
                
                totalRuntime += safeResult.runtime;
              }
              
              result = {
                results,
                allPassed: results.every(r => r.passed),
                runtime: totalRuntime,
                memory: 0,
                score: Math.round((results.filter(r => r.passed).length / results.length) * 100)
              };
            } else {
              throw execError;
            }
          }

          executionResult = {
            status: result.allPassed ? "accepted" : 
                   result.results.some(r => r.error?.includes("Time limit")) ? "time_limit_exceeded" :
                   result.results.some(r => !r.passed && r.error) ? "runtime_error" : 
                   "wrong_answer",
            runtime: result.runtime,
            memory: result.memory,
            testsPassed: result.results.filter(r => r.passed).length,
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
      console.error('Submission error:', error);
      res.status(400).json({ message: "Invalid submission data", error: (error as any).message });
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

  // Intelligent Tutoring System Routes
  app.post("/api/tutoring/start", authenticateToken, async (req: any, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      const { intelligentTutor } = await import("./intelligent-tutor");
      const result = await intelligentTutor.startTutoringSession(req.user.id, topic);
      res.json(result);
    } catch (error) {
      console.error("Tutoring start error:", error);
      res.status(500).json({ message: "Failed to start tutoring session" });
    }
  });

  app.post("/api/tutoring/:sessionId/message", authenticateToken, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const { intelligentTutor } = await import("./intelligent-tutor");
      const response = await intelligentTutor.continueSession(sessionId, message);
      res.json(response);
    } catch (error) {
      console.error("Tutoring message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get("/api/tutoring/sessions", authenticateToken, async (req: any, res) => {
    try {
      const { intelligentTutor } = await import("./intelligent-tutor");
      const sessions = await intelligentTutor.getUserSessions(req.user.id);
      res.json(sessions);
    } catch (error) {
      console.error("Tutoring sessions error:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/tutoring/:sessionId/messages", authenticateToken, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { intelligentTutor } = await import("./intelligent-tutor");
      const messages = await intelligentTutor.getSessionMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Tutoring messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/tutoring/:sessionId/complete", authenticateToken, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { feedback } = req.body;
      
      const { intelligentTutor } = await import("./intelligent-tutor");
      await intelligentTutor.completeSession(sessionId, feedback);
      res.json({ success: true });
    } catch (error) {
      console.error("Tutoring complete error:", error);
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  // AI Interview System Routes
  app.post("/api/interviews/ai/start", authenticateToken, async (req: any, res) => {
    try {
      const { type } = req.body; // 'technical', 'behavioral', or 'mixed'
      const { aiInterviewer } = await import("./ai-interview");
      
      const session = await aiInterviewer.startInterview(req.user.id, type);
      res.json(session);
    } catch (error) {
      console.error('AI interview start error:', error);
      res.status(500).json({ message: "Failed to start AI interview" });
    }
  });

  app.post("/api/interviews/ai/:sessionId/question", authenticateToken, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { userResponse } = req.body;
      const { aiInterviewer } = await import("./ai-interview");
      
      const response = await aiInterviewer.getNextQuestion(sessionId, userResponse);
      res.json(response);
    } catch (error) {
      console.error('AI interview question error:', error);
      res.status(500).json({ message: "Failed to get next question" });
    }
  });

  app.post("/api/interviews/ai/:sessionId/complete", authenticateToken, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { finalResponse } = req.body;
      const { aiInterviewer } = await import("./ai-interview");
      
      const analysis = await aiInterviewer.completeInterview(sessionId, finalResponse);
      res.json(analysis);
    } catch (error) {
      console.error('AI interview completion error:', error);
      res.status(500).json({ message: "Failed to complete interview" });
    }
  });

  app.get("/api/interviews/ai/insights/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own insights unless they're professors/admins
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { aiInterviewer } = await import("./ai-interview");
      const insights = await aiInterviewer.getInterviewInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error('Interview insights error:', error);
      res.status(500).json({ message: "Failed to get interview insights" });
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

      // Execute code with secure executor, fallback to safe executor
      let result;
      try {
        result = await secureCodeExecutor.executeCode({
          code,
          language,
          testCases: testCases?.slice(0, 3), // Limit to first 3 test cases for "Run Code"
          timeLimit: 5000, // 5 seconds
          memoryLimit: 128 // 128 MB
        });
      } catch (execError: any) {
        // Fallback to safe executor for permission errors
        if (execError.message?.includes('EPERM') || execError.message?.includes('spawn') || execError.code === 'EPERM') {
          console.log('[Code Execution] Using safe executor due to permission issues');
          const safeResult = safeExecutor.execute(language, code, testCases?.[0]?.input || '');
          result = {
            stdout: safeResult.stdout,
            stderr: safeResult.stderr,
            exitCode: safeResult.exitCode,
            runtime: safeResult.runtime,
            memory: 0,
            testCaseResults: testCases?.slice(0, 3).map((tc: any, index: number) => ({
              testCaseId: index,
              passed: safeResult.stdout.trim() === tc.expectedOutput.trim(),
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: safeResult.stdout,
              runtime: safeResult.runtime,
              memory: 0,
              points: safeResult.stdout.trim() === tc.expectedOutput.trim() ? 1 : 0,
              maxPoints: 1
            }))
          };
        } else {
          throw execError;
        }
      }
      
      const result_final = result;

      res.json(result_final);
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

  // Advanced Analytics Routes
  app.get("/api/analytics/user/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own analytics unless they're professors/admins
      if (req.user.id !== userId && req.user.role === 'student') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { analyticsEngine } = await import("./analytics-engine");
      const analytics = await analyticsEngine.generateUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to generate analytics" });
    }
  });

  app.get("/api/analytics/class/:professorId", authenticateToken, async (req: any, res) => {
    try {
      const professorId = parseInt(req.params.professorId);
      
      // Only professors can view class insights
      if (req.user.role !== 'professor' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied - professors only" });
      }

      const { analyticsEngine } = await import("./analytics-engine");
      const insights = await analyticsEngine.generateClassInsights(professorId);
      res.json(insights);
    } catch (error) {
      console.error('Class insights error:', error);
      res.status(500).json({ message: "Failed to generate class insights" });
    }
  });

  // Code Quality Analysis Routes
  app.post("/api/code/analyze", authenticateToken, async (req: any, res) => {
    try {
      const { code, language, problemId } = req.body;
      const { codeQualityAnalyzer } = await import("./code-quality-analyzer");
      
      const report = await codeQualityAnalyzer.analyzeCode(code, language, problemId);
      res.json(report);
    } catch (error) {
      console.error('Code analysis error:', error);
      res.status(500).json({ message: "Failed to analyze code quality" });
    }
  });

  // AI Code Review Routes
  app.post("/api/ai/code-review", authenticateToken, async (req: any, res) => {
    try {
      const { code, language, problemContext, userLevel } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }
      
      const { AICodeReviewer } = await import("./ai-code-review");
      const reviewer = new AICodeReviewer();
      const review = await reviewer.reviewCode(code, language, problemContext, userLevel);
      
      res.json(review);
    } catch (error) {
      console.error("Code review error:", error);
      res.status(500).json({ message: "Failed to review code" });
    }
  });

  app.post("/api/ai/code-review/live", authenticateToken, async (req: any, res) => {
    try {
      const { code, language, changeContext } = req.body;
      
      const { AICodeReviewer } = await import("./ai-code-review");
      const reviewer = new AICodeReviewer();
      const feedback = await reviewer.provideLiveFeedback(code, language, changeContext);
      
      res.json(feedback);
    } catch (error) {
      console.error("Live feedback error:", error);
      res.status(500).json({ message: "Failed to provide feedback" });
    }
  });

  // AI Recommendations Routes
  app.get("/api/ai/recommendations/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const { AIRecommendationEngine } = await import("./ai-recommendations");
      const engine = new AIRecommendationEngine();
      const recommendations = await engine.generatePersonalizedRecommendations(userId);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // AI Content Generation Routes
  app.post("/api/ai/generate-problem", authenticateToken, async (req: any, res) => {
    try {
      const { topic, difficulty, concepts, style, company } = req.body;
      
      const { AIContentGenerator } = await import("./ai-content-generation");
      const generator = new AIContentGenerator();
      const content = await generator.generateProblem({
        topic,
        difficulty,
        concepts,
        style,
        company
      });
      
      res.json(content);
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({ message: "Failed to generate problem" });
    }
  });

  app.post("/api/ai/generate-problems-bulk", authenticateToken, async (req: any, res) => {
    try {
      const { count, options } = req.body;
      
      if (!count || count > 10) {
        return res.status(400).json({ message: "Count must be between 1 and 10" });
      }
      
      const { AIContentGenerator } = await import("./ai-content-generation");
      const generator = new AIContentGenerator();
      const problems = await generator.generateBulkProblems(count, options);
      
      res.json(problems);
    } catch (error) {
      console.error("Bulk generation error:", error);
      res.status(500).json({ message: "Failed to generate problems" });
    }
  });

  // AI Grading Routes
  app.post("/api/ai/grade-submission", authenticateToken, async (req: any, res) => {
    try {
      const { submissionId, rubric } = req.body;
      
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      const problem = await storage.getProblem(submission.problemId);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      
      const { AIAutomatedGrader } = await import("./ai-grading");
      const grader = new AIAutomatedGrader();
      const result = await grader.gradeSubmission(submission, problem, rubric);
      
      res.json(result);
    } catch (error) {
      console.error("Grading error:", error);
      res.status(500).json({ message: "Failed to grade submission" });
    }
  });

  app.post("/api/ai/grade-batch", authenticateToken, async (req: any, res) => {
    try {
      const { submissionIds, rubric } = req.body;
      
      if (!submissionIds || !Array.isArray(submissionIds)) {
        return res.status(400).json({ message: "Submission IDs array required" });
      }
      
      const submissionPromises = submissionIds.map((id: number) => storage.getSubmission(id));
      const submissionResults = await Promise.all(submissionPromises);
      const validSubmissions = submissionResults.filter((s): s is NonNullable<typeof s> => s !== undefined && s !== null);
      
      const problemMap = new Map();
      for (const sub of validSubmissions) {
        if (!problemMap.has(sub.problemId)) {
          const problem = await storage.getProblem(sub.problemId);
          if (problem) problemMap.set(sub.problemId, problem);
        }
      }
      
      const { AIAutomatedGrader } = await import("./ai-grading");
      const grader = new AIAutomatedGrader();
      const results = await grader.gradeBatch(
        validSubmissions,
        problemMap,
        rubric
      );
      
      res.json(results);
    } catch (error) {
      console.error("Batch grading error:", error);
      res.status(500).json({ message: "Failed to grade batch" });
    }
  });

  // AI Learning Assistant Routes
  app.post("/api/ai/assistant/start", authenticateToken, async (req: any, res) => {
    try {
      const { AILearningAssistant } = await import("./ai-learning-assistant");
      const assistant = AILearningAssistant.getInstance();
      const session = await assistant.startSession(req.user.id);
      
      res.json(session);
    } catch (error) {
      console.error("Assistant start error:", error);
      res.status(500).json({ message: "Failed to start assistant session" });
    }
  });

  app.post("/api/ai/assistant/:sessionId/message", authenticateToken, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const { AILearningAssistant } = await import("./ai-learning-assistant");
      const assistant = AILearningAssistant.getInstance();
      const response = await assistant.processMessage(sessionId, message);
      
      res.json(response);
    } catch (error) {
      console.error("Assistant message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get("/api/ai/assistant/sessions", authenticateToken, async (req: any, res) => {
    try {
      const { AILearningAssistant } = await import("./ai-learning-assistant");
      const assistant = AILearningAssistant.getInstance();
      const sessions = await assistant.getActiveSessions(req.user.id);
      
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  app.post("/api/ai/assistant/:sessionId/end", authenticateToken, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      
      const { AILearningAssistant } = await import("./ai-learning-assistant");
      const assistant = AILearningAssistant.getInstance();
      await assistant.endSession(sessionId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("End session error:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Collaboration Routes
  app.post("/api/collaboration/room", authenticateToken, async (req: any, res) => {
    try {
      const { problemId } = req.body;
      const roomId = `room-${problemId}-${Date.now()}`;
      
      res.json({
        roomId,
        problemId,
        joinUrl: `/collaborate?room=${roomId}&problem=${problemId}`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create collaboration room" });
    }
  });

  app.get("/api/collaboration/rooms/active", authenticateToken, async (req: any, res) => {
    try {
      const { getCollaboration } = await import("./real-time-collaboration");
      const collaboration = getCollaboration();
      
      if (collaboration) {
        const activeRooms = collaboration.getAllActiveRooms();
        res.json(activeRooms);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get active rooms" });
    }
  });

  // Admin Routes
  const adminRoutes = await import("./admin-routes");
  app.use(adminRoutes.default);
  
  // Career Services Routes
  app.use("/api/career", careerRoutes);
  
  // LMS Integration Routes
  app.use(lmsRoutes);
  
  // Job Board Integration Routes
  app.use(jobRoutes);
  
  // Course Management Routes
  const courseRoutes = await import("./course-management");
  app.use(courseRoutes.default);
  
  // Alumni and Mentorship Routes
  const alumniRoutes = await import("./alumni-mentorship");
  app.use(alumniRoutes.default);
  
  // Skills Assessment Routes
  const skillsRoutes = await import("./skills-assessment");
  app.use(skillsRoutes.default);
  
  // Institutional Analytics Routes
  const analyticsRoutes = await import("./institutional-analytics");
  app.use(analyticsRoutes.default);
  
  // Predictive Analytics Routes
  const { predictiveAnalytics } = await import("./predictive-analytics");
  
  app.get("/api/ai/student-predictions", authenticateToken, async (req: any, res) => {
    try {
      const predictions = await predictiveAnalytics.predictStudentPerformance(req.user.id);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get predictions" });
    }
  });
  
  app.get("/api/ai/course-analytics", authenticateToken, async (req: any, res) => {
    try {
      const courseId = parseInt(req.query.courseId || '1');
      const analytics = await predictiveAnalytics.analyzeCourse(courseId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get course analytics" });
    }
  });
  
  app.get("/api/ai/system-insights", authenticateToken, async (req: any, res) => {
    try {
      const insights = await predictiveAnalytics.generateInstitutionalInsights();
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to get system insights" });
    }
  });
  
  app.get("/api/ai/early-warnings", authenticateToken, async (req: any, res) => {
    try {
      const warnings = await predictiveAnalytics.generateEarlyWarnings();
      res.json(warnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get early warnings" });
    }
  });
  
  app.get("/api/ai/adaptive-learning-path/:userId", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const path = await predictiveAnalytics.generateAdaptiveLearningPath(userId);
      res.json(path);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate learning path" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize real-time collaboration
  initializeCollaboration(httpServer);
  
  // Initialize advanced collaboration features
  const { initializeAdvancedCollaboration } = await import("./advanced-collaboration");
  initializeAdvancedCollaboration(httpServer);
  
  // Advanced Collaboration Routes
  const advancedCollabRoutes = await import("./advanced-collaboration");
  app.use(advancedCollabRoutes.default);
  
  return httpServer;
}
