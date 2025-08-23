import { Router } from "express";
import { storage } from "./storage";
import { z } from "zod";

const router = Router();

// Alumni Profile Management
router.get("/api/alumni", async (req, res) => {
  try {
    const alumni = await storage.getAllAlumni();
    res.json(alumni);
  } catch (error) {
    console.error("Error fetching alumni:", error);
    res.status(500).json({ error: "Failed to fetch alumni" });
  }
});

router.get("/api/alumni/:id", async (req, res) => {
  try {
    const alumni = await storage.getAlumniProfile(parseInt(req.params.id));
    if (!alumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }
    res.json(alumni);
  } catch (error) {
    console.error("Error fetching alumni:", error);
    res.status(500).json({ error: "Failed to fetch alumni" });
  }
});

router.post("/api/alumni", async (req, res) => {
  try {
    const alumni = await storage.createAlumniProfile(req.body);
    res.json(alumni);
  } catch (error) {
    console.error("Error creating alumni profile:", error);
    res.status(500).json({ error: "Failed to create alumni profile" });
  }
});

router.patch("/api/alumni/:id", async (req, res) => {
  try {
    const alumni = await storage.updateAlumniProfile(parseInt(req.params.id), req.body);
    res.json(alumni);
  } catch (error) {
    console.error("Error updating alumni:", error);
    res.status(500).json({ error: "Failed to update alumni" });
  }
});

// Mentorship Matching
router.get("/api/mentorship/matches/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const matches = await storage.findMentorshipMatches(userId);
    res.json(matches);
  } catch (error) {
    console.error("Error finding matches:", error);
    res.status(500).json({ error: "Failed to find mentorship matches" });
  }
});

router.post("/api/mentorship/request", async (req, res) => {
  try {
    const request = await storage.createMentorshipRequest(req.body);
    res.json(request);
  } catch (error) {
    console.error("Error creating mentorship request:", error);
    res.status(500).json({ error: "Failed to create mentorship request" });
  }
});

router.get("/api/mentorship/requests/mentor/:mentorId", async (req, res) => {
  try {
    const requests = await storage.getMentorRequests(parseInt(req.params.mentorId));
    res.json(requests);
  } catch (error) {
    console.error("Error fetching mentor requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.get("/api/mentorship/requests/mentee/:menteeId", async (req, res) => {
  try {
    const requests = await storage.getMenteeRequests(parseInt(req.params.menteeId));
    res.json(requests);
  } catch (error) {
    console.error("Error fetching mentee requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.patch("/api/mentorship/requests/:id", async (req, res) => {
  try {
    const request = await storage.updateMentorshipRequest(parseInt(req.params.id), req.body);
    res.json(request);
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ error: "Failed to update request" });
  }
});

// Mentorship Matching Algorithm
router.get("/api/mentorship/algorithm/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get user profile and skills
    const user = await storage.getUser(userId);
    const userSkills = await storage.getUserSkills(userId);
    
    // Get all potential mentors
    const alumni = await storage.getAllAlumni();
    
    // Score and rank matches
    const matches = alumni
      .filter((a: any) => a.willingToMentor && a.userId !== userId)
      .map((mentor: any) => {
        let score = 0;
        
        // Industry match
        if (mentor.currentCompany === user?.company) score += 20;
        if (mentor.industry === user?.industry) score += 15;
        
        // Skills match
        const mentorSkills = mentor.expertise || [];
        const commonSkills = userSkills.filter((s: any) => 
          mentorSkills.includes(s.name)
        );
        score += commonSkills.length * 10;
        
        // Experience level
        const yearsExperience = mentor.yearsExperience || 0;
        if (yearsExperience > 5) score += 10;
        if (yearsExperience > 10) score += 10;
        
        // Location match
        if (mentor.location === user?.location) score += 5;
        
        // Random factor for diversity
        score += Math.random() * 10;
        
        return {
          mentor,
          score,
          matchReasons: {
            industryMatch: mentor.industry === user?.industry,
            companyMatch: mentor.currentCompany === user?.company,
            skillsMatch: commonSkills.length,
            experienceYears: yearsExperience,
            locationMatch: mentor.location === user?.location
          }
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    res.json(matches);
  } catch (error) {
    console.error("Error in matching algorithm:", error);
    res.status(500).json({ error: "Failed to find matches" });
  }
});

// Alumni Events
router.get("/api/alumni/events", async (req, res) => {
  try {
    const events = await storage.getAlumniEvents();
    res.json(events);
  } catch (error) {
    console.error("Error fetching alumni events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/api/alumni/events", async (req, res) => {
  try {
    const event = await storage.createAlumniEvent(req.body);
    res.json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Success Stories
router.get("/api/alumni/success-stories", async (req, res) => {
  try {
    const stories = await storage.getSuccessStories();
    res.json(stories);
  } catch (error) {
    console.error("Error fetching success stories:", error);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

router.post("/api/alumni/success-stories", async (req, res) => {
  try {
    const story = await storage.createSuccessStory(req.body);
    res.json(story);
  } catch (error) {
    console.error("Error creating story:", error);
    res.status(500).json({ error: "Failed to create story" });
  }
});

// Networking Hub
router.get("/api/alumni/network/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get user's connections
    const connections = await storage.getUserConnections(userId);
    
    // Get suggested connections
    const suggestions = await storage.getSuggestedConnections(userId);
    
    // Get network stats
    const stats = {
      totalConnections: connections.length,
      newThisMonth: connections.filter((c: any) => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return new Date(c.connectedAt) > oneMonthAgo;
      }).length,
      industries: [...new Set(connections.map((c: any) => c.industry))].length,
      companies: [...new Set(connections.map((c: any) => c.company))].length
    };
    
    res.json({
      connections,
      suggestions,
      stats
    });
  } catch (error) {
    console.error("Error fetching network:", error);
    res.status(500).json({ error: "Failed to fetch network" });
  }
});

router.post("/api/alumni/connect", async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;
    const connection = await storage.createConnection(userId, targetUserId);
    res.json(connection);
  } catch (error) {
    console.error("Error creating connection:", error);
    res.status(500).json({ error: "Failed to create connection" });
  }
});

export default router;