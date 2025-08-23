import { Router } from "express";
import { storage } from "./storage";
import { Server as SocketServer } from "socket.io";
import { Server } from "http";

const router = Router();

// Virtual Study Rooms
const studyRooms = new Map<string, any>();
const activeCollaborations = new Map<string, any>();

export function initializeAdvancedCollaboration(httpServer: Server) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Virtual Study Room Management
  io.on("connection", (socket) => {
    console.log("User connected for collaboration:", socket.id);

    // Join study room
    socket.on("join-study-room", ({ roomId, userId, userName }) => {
      socket.join(roomId);
      
      if (!studyRooms.has(roomId)) {
        studyRooms.set(roomId, {
          id: roomId,
          participants: [],
          whiteboard: [],
          chat: [],
          createdAt: new Date()
        });
      }
      
      const room = studyRooms.get(roomId);
      room.participants.push({ userId, userName, socketId: socket.id });
      
      // Notify others in room
      socket.to(roomId).emit("user-joined", { userId, userName });
      
      // Send room state to new user
      socket.emit("room-state", room);
    });

    // Leave study room
    socket.on("leave-study-room", ({ roomId, userId }) => {
      socket.leave(roomId);
      
      if (studyRooms.has(roomId)) {
        const room = studyRooms.get(roomId);
        room.participants = room.participants.filter((p: any) => p.userId !== userId);
        
        if (room.participants.length === 0) {
          studyRooms.delete(roomId);
        } else {
          socket.to(roomId).emit("user-left", { userId });
        }
      }
    });

    // Whiteboard collaboration
    socket.on("whiteboard-draw", ({ roomId, drawData }) => {
      if (studyRooms.has(roomId)) {
        const room = studyRooms.get(roomId);
        room.whiteboard.push(drawData);
        socket.to(roomId).emit("whiteboard-update", drawData);
      }
    });

    // Chat in study room
    socket.on("study-room-chat", ({ roomId, message, userId, userName }) => {
      if (studyRooms.has(roomId)) {
        const room = studyRooms.get(roomId);
        const chatMessage = {
          userId,
          userName,
          message,
          timestamp: new Date()
        };
        room.chat.push(chatMessage);
        io.to(roomId).emit("new-chat-message", chatMessage);
      }
    });

    // Screen sharing
    socket.on("start-screen-share", ({ roomId, userId, streamId }) => {
      socket.to(roomId).emit("user-sharing-screen", { userId, streamId });
    });

    socket.on("stop-screen-share", ({ roomId, userId }) => {
      socket.to(roomId).emit("user-stopped-sharing", { userId });
    });

    // Peer programming
    socket.on("start-peer-programming", ({ roomId, problemId, userId }) => {
      const sessionId = `peer-${roomId}-${problemId}-${Date.now()}`;
      
      activeCollaborations.set(sessionId, {
        roomId,
        problemId,
        participants: [userId],
        code: "",
        language: "javascript",
        cursorPositions: new Map(),
        startedAt: new Date()
      });
      
      socket.join(sessionId);
      socket.emit("peer-session-started", { sessionId });
    });

    socket.on("join-peer-session", ({ sessionId, userId }) => {
      if (activeCollaborations.has(sessionId)) {
        const session = activeCollaborations.get(sessionId);
        session.participants.push(userId);
        socket.join(sessionId);
        socket.emit("peer-session-state", session);
      }
    });

    socket.on("code-change", ({ sessionId, code, userId }) => {
      if (activeCollaborations.has(sessionId)) {
        const session = activeCollaborations.get(sessionId);
        session.code = code;
        socket.to(sessionId).emit("code-updated", { code, userId });
      }
    });

    socket.on("cursor-position", ({ sessionId, position, userId }) => {
      if (activeCollaborations.has(sessionId)) {
        const session = activeCollaborations.get(sessionId);
        session.cursorPositions.set(userId, position);
        socket.to(sessionId).emit("cursor-moved", { position, userId });
      }
    });

    // Code review system
    socket.on("request-code-review", async ({ code, language, userId, problemId }) => {
      try {
        // Store review request
        const reviewId = `review-${userId}-${problemId}-${Date.now()}`;
        const review = {
          id: reviewId,
          code,
          language,
          userId,
          problemId,
          status: "pending",
          requestedAt: new Date()
        };
        
        // Notify available reviewers (professors and TAs)
        io.emit("new-review-request", review);
        
        socket.emit("review-requested", { reviewId });
      } catch (error) {
        socket.emit("review-error", { error: "Failed to request review" });
      }
    });

    socket.on("submit-review", ({ reviewId, feedback, suggestions, approved }) => {
      io.emit("review-completed", {
        reviewId,
        feedback,
        suggestions,
        approved,
        reviewedAt: new Date()
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from collaboration:", socket.id);
      
      // Clean up user from all rooms
      studyRooms.forEach((room, roomId) => {
        const participant = room.participants.find((p: any) => p.socketId === socket.id);
        if (participant) {
          room.participants = room.participants.filter((p: any) => p.socketId !== socket.id);
          socket.to(roomId).emit("user-disconnected", { userId: participant.userId });
          
          if (room.participants.length === 0) {
            studyRooms.delete(roomId);
          }
        }
      });
    });
  });

  return io;
}

// API Routes for Study Rooms
router.get("/api/collaboration/study-rooms", async (req, res) => {
  try {
    const rooms = Array.from(studyRooms.values()).map(room => ({
      id: room.id,
      participantCount: room.participants.length,
      createdAt: room.createdAt
    }));
    res.json(rooms);
  } catch (error) {
    console.error("Error fetching study rooms:", error);
    res.status(500).json({ error: "Failed to fetch study rooms" });
  }
});

router.post("/api/collaboration/study-rooms", async (req, res) => {
  try {
    const { name, description, maxParticipants } = req.body;
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    studyRooms.set(roomId, {
      id: roomId,
      name,
      description,
      maxParticipants: maxParticipants || 10,
      participants: [],
      whiteboard: [],
      chat: [],
      createdAt: new Date()
    });
    
    res.json({ roomId, joinUrl: `/study-room/${roomId}` });
  } catch (error) {
    console.error("Error creating study room:", error);
    res.status(500).json({ error: "Failed to create study room" });
  }
});

router.get("/api/collaboration/study-rooms/:roomId", async (req, res) => {
  try {
    const room = studyRooms.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ error: "Failed to fetch room" });
  }
});

// Peer Programming Sessions
router.get("/api/collaboration/peer-sessions", async (req, res) => {
  try {
    const sessions = Array.from(activeCollaborations.values()).map(session => ({
      roomId: session.roomId,
      problemId: session.problemId,
      participantCount: session.participants.length,
      language: session.language,
      startedAt: session.startedAt
    }));
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching peer sessions:", error);
    res.status(500).json({ error: "Failed to fetch peer sessions" });
  }
});

router.post("/api/collaboration/peer-sessions", async (req: any, res) => {
  try {
    const { problemId, language } = req.body;
    const userId = req.user?.id || 1;
    const sessionId = `peer-${userId}-${problemId}-${Date.now()}`;
    
    activeCollaborations.set(sessionId, {
      sessionId,
      problemId,
      participants: [userId],
      code: "",
      language: language || "javascript",
      cursorPositions: new Map(),
      startedAt: new Date()
    });
    
    res.json({ sessionId, joinUrl: `/peer-programming/${sessionId}` });
  } catch (error) {
    console.error("Error creating peer session:", error);
    res.status(500).json({ error: "Failed to create peer session" });
  }
});

// Code Review Queue
router.get("/api/collaboration/review-queue", async (req, res) => {
  try {
    // In a real implementation, this would fetch from database
    const reviews = [
      {
        id: "review-1",
        studentName: "John Doe",
        problemTitle: "Binary Search Tree",
        language: "javascript",
        requestedAt: new Date(Date.now() - 3600000),
        status: "pending"
      },
      {
        id: "review-2",
        studentName: "Jane Smith",
        problemTitle: "Dynamic Programming",
        language: "python",
        requestedAt: new Date(Date.now() - 7200000),
        status: "in-progress"
      }
    ];
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching review queue:", error);
    res.status(500).json({ error: "Failed to fetch review queue" });
  }
});

router.post("/api/collaboration/submit-review", async (req: any, res) => {
  try {
    const { reviewId, feedback, suggestions, score } = req.body;
    const reviewerId = req.user?.id || 1;
    
    // Store review in database
    const review = {
      reviewId,
      reviewerId,
      feedback,
      suggestions,
      score,
      completedAt: new Date()
    };
    
    // In real implementation, save to database
    res.json(review);
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

// Discussion Forums (already implemented in course-management.ts)
// These routes complement the basic discussion implementation with advanced features

router.get("/api/discussions/trending", async (req, res) => {
  try {
    const discussions = await storage.getAllDiscussions();
    
    // Calculate trending score based on recent activity
    const trending = discussions
      .map((d: any) => ({
        ...d,
        trendingScore: calculateTrendingScore(d)
      }))
      .sort((a: any, b: any) => b.trendingScore - a.trendingScore)
      .slice(0, 10);
    
    res.json(trending);
  } catch (error) {
    console.error("Error fetching trending discussions:", error);
    res.status(500).json({ error: "Failed to fetch trending discussions" });
  }
});

router.post("/api/discussions/:id/vote", async (req: any, res) => {
  try {
    const discussionId = parseInt(req.params.id);
    const { voteType } = req.body; // 'up' or 'down'
    const userId = req.user?.id || 1;
    
    // Update discussion votes
    const discussion = await storage.getDiscussion(discussionId);
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    
    const votes = discussion.votes || 0;
    const newVotes = voteType === 'up' ? votes + 1 : votes - 1;
    
    await storage.updateDiscussion(discussionId, { votes: newVotes });
    
    res.json({ votes: newVotes });
  } catch (error) {
    console.error("Error voting on discussion:", error);
    res.status(500).json({ error: "Failed to vote" });
  }
});

router.get("/api/discussions/user/:userId/reputation", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const discussions = await storage.getUserDiscussions(userId);
    
    // Calculate reputation based on discussion activity
    const reputation = {
      userId,
      posts: discussions.length,
      totalVotes: discussions.reduce((sum: number, d: any) => sum + (d.votes || 0), 0),
      helpfulAnswers: discussions.filter((d: any) => d.isAnswer).length,
      badges: calculateBadges(discussions),
      level: calculateLevel(discussions)
    };
    
    res.json(reputation);
  } catch (error) {
    console.error("Error calculating reputation:", error);
    res.status(500).json({ error: "Failed to calculate reputation" });
  }
});

// Helper functions
function calculateTrendingScore(discussion: any): number {
  const hoursSinceCreated = (Date.now() - new Date(discussion.createdAt).getTime()) / (1000 * 60 * 60);
  const votes = discussion.votes || 0;
  const replies = discussion.replyCount || 0;
  
  // Higher score for newer posts with more engagement
  return (votes * 2 + replies * 3) / Math.pow(hoursSinceCreated + 2, 1.5);
}

function calculateBadges(discussions: any[]): string[] {
  const badges = [];
  
  if (discussions.length >= 10) badges.push("Active Contributor");
  if (discussions.length >= 50) badges.push("Discussion Leader");
  if (discussions.filter((d: any) => d.votes > 10).length >= 5) badges.push("Helpful Member");
  if (discussions.filter((d: any) => d.isAnswer).length >= 10) badges.push("Problem Solver");
  
  return badges;
}

function calculateLevel(discussions: any[]): number {
  const points = discussions.length * 10 + 
                 discussions.reduce((sum: number, d: any) => sum + (d.votes || 0) * 5, 0);
  
  if (points < 100) return 1;
  if (points < 500) return 2;
  if (points < 1000) return 3;
  if (points < 5000) return 4;
  return 5;
}

export default router;