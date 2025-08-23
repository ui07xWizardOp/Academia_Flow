import { Router } from "express";
import { storage } from "./storage";
import { insertJobListingSchema, insertJobApplicationSchema, insertResumeSchema, insertCareerCounselingSchema, insertCompanySchema, insertCareerEventSchema, insertEventRegistrationSchema, insertAlumniProfileSchema, insertMentorshipRequestSchema, insertInternshipSchema, insertSkillsAssessmentSchema, insertCareerPathSchema, insertCareerResourceSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Job Listings Routes
router.get("/jobs", async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const jobs = activeOnly ? await storage.getActiveJobListings() : await storage.getAllJobListings();
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching job listings:", error);
    res.status(500).json({ error: "Failed to fetch job listings" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await storage.getJobListing(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ error: "Job listing not found" });
    }
    res.json(job);
  } catch (error) {
    console.error("Error fetching job listing:", error);
    res.status(500).json({ error: "Failed to fetch job listing" });
  }
});

router.post("/jobs", async (req, res) => {
  try {
    const validated = insertJobListingSchema.parse(req.body);
    const job = await storage.createJobListing(validated);
    res.json(job);
  } catch (error) {
    console.error("Error creating job listing:", error);
    res.status(500).json({ error: "Failed to create job listing" });
  }
});

router.patch("/jobs/:id", async (req, res) => {
  try {
    const job = await storage.updateJobListing(Number(req.params.id), req.body);
    res.json(job);
  } catch (error) {
    console.error("Error updating job listing:", error);
    res.status(500).json({ error: "Failed to update job listing" });
  }
});

router.delete("/jobs/:id", async (req, res) => {
  try {
    await storage.deleteJobListing(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting job listing:", error);
    res.status(500).json({ error: "Failed to delete job listing" });
  }
});

// Job Applications Routes
router.get("/applications/user/:userId", async (req, res) => {
  try {
    const applications = await storage.getUserJobApplications(Number(req.params.userId));
    res.json(applications);
  } catch (error) {
    console.error("Error fetching user applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.get("/applications/job/:jobId", async (req, res) => {
  try {
    const applications = await storage.getJobApplicationsForListing(Number(req.params.jobId));
    res.json(applications);
  } catch (error) {
    console.error("Error fetching job applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.post("/applications", async (req, res) => {
  try {
    const validated = insertJobApplicationSchema.parse(req.body);
    const application = await storage.createJobApplication(validated);
    res.json(application);
  } catch (error) {
    console.error("Error creating application:", error);
    res.status(500).json({ error: "Failed to create application" });
  }
});

router.patch("/applications/:id", async (req, res) => {
  try {
    const application = await storage.updateJobApplication(Number(req.params.id), req.body);
    res.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({ error: "Failed to update application" });
  }
});

// Resume Routes
router.get("/resumes/user/:userId", async (req, res) => {
  try {
    const resumes = await storage.getUserResumes(Number(req.params.userId));
    res.json(resumes);
  } catch (error) {
    console.error("Error fetching resumes:", error);
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
});

router.get("/resumes/:id", async (req, res) => {
  try {
    const resume = await storage.getResume(Number(req.params.id));
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }
    res.json(resume);
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ error: "Failed to fetch resume" });
  }
});

router.post("/resumes", async (req, res) => {
  try {
    const validated = insertResumeSchema.parse(req.body);
    const resume = await storage.createResume(validated);
    res.json(resume);
  } catch (error) {
    console.error("Error creating resume:", error);
    res.status(500).json({ error: "Failed to create resume" });
  }
});

router.patch("/resumes/:id", async (req, res) => {
  try {
    const resume = await storage.updateResume(Number(req.params.id), req.body);
    res.json(resume);
  } catch (error) {
    console.error("Error updating resume:", error);
    res.status(500).json({ error: "Failed to update resume" });
  }
});

router.delete("/resumes/:id", async (req, res) => {
  try {
    await storage.deleteResume(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

router.post("/resumes/set-default", async (req, res) => {
  try {
    const { userId, resumeId } = req.body;
    await storage.setDefaultResume(userId, resumeId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error setting default resume:", error);
    res.status(500).json({ error: "Failed to set default resume" });
  }
});

// Career Counseling Routes
router.get("/counseling/user/:userId", async (req, res) => {
  try {
    const sessions = await storage.getUserCounselingSessions(Number(req.params.userId));
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching counseling sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.get("/counseling/counselor/:counselorId", async (req, res) => {
  try {
    const sessions = await storage.getCounselorSessions(Number(req.params.counselorId));
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching counselor sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.post("/counseling", async (req, res) => {
  try {
    const validated = insertCareerCounselingSchema.parse(req.body);
    const session = await storage.scheduleCareerCounseling(validated);
    res.json(session);
  } catch (error) {
    console.error("Error scheduling counseling:", error);
    res.status(500).json({ error: "Failed to schedule counseling" });
  }
});

router.patch("/counseling/:id", async (req, res) => {
  try {
    const session = await storage.updateCounselingSession(Number(req.params.id), req.body);
    res.json(session);
  } catch (error) {
    console.error("Error updating counseling session:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
});

// Companies Routes
router.get("/companies", async (req, res) => {
  try {
    const partnersOnly = req.query.partners === 'true';
    const companies = partnersOnly ? await storage.getActivePartners() : await storage.getAllCompanies();
    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.get("/companies/:id", async (req, res) => {
  try {
    const company = await storage.getCompany(Number(req.params.id));
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

router.post("/companies", async (req, res) => {
  try {
    const validated = insertCompanySchema.parse(req.body);
    const company = await storage.createCompany(validated);
    res.json(company);
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: "Failed to create company" });
  }
});

router.patch("/companies/:id", async (req, res) => {
  try {
    const company = await storage.updateCompany(Number(req.params.id), req.body);
    res.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ error: "Failed to update company" });
  }
});

// Career Events Routes
router.get("/events", async (req, res) => {
  try {
    const events = await storage.getUpcomingEvents();
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const event = await storage.getCareerEvent(Number(req.params.id));
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

router.post("/events", async (req, res) => {
  try {
    const validated = insertCareerEventSchema.parse(req.body);
    const event = await storage.createCareerEvent(validated);
    res.json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.get("/events/:eventId/registrations", async (req, res) => {
  try {
    const registrations = await storage.getEventRegistrations(Number(req.params.eventId));
    res.json(registrations);
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

router.get("/events/user/:userId/registrations", async (req, res) => {
  try {
    const registrations = await storage.getUserEventRegistrations(Number(req.params.userId));
    res.json(registrations);
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

router.post("/events/register", async (req, res) => {
  try {
    const validated = insertEventRegistrationSchema.parse(req.body);
    const registration = await storage.registerForEvent(validated);
    res.json(registration);
  } catch (error) {
    console.error("Error registering for event:", error);
    res.status(500).json({ error: "Failed to register for event" });
  }
});

// Alumni Network Routes
router.get("/alumni", async (req, res) => {
  try {
    const mentorsOnly = req.query.mentors === 'true';
    const profiles = mentorsOnly ? await storage.getMentorProfiles() : await storage.getAlumniProfiles();
    res.json(profiles);
  } catch (error) {
    console.error("Error fetching alumni profiles:", error);
    res.status(500).json({ error: "Failed to fetch alumni profiles" });
  }
});

router.get("/alumni/:id", async (req, res) => {
  try {
    const profile = await storage.getAlumniProfile(Number(req.params.id));
    if (!profile) {
      return res.status(404).json({ error: "Alumni profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching alumni profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/alumni", async (req, res) => {
  try {
    const validated = insertAlumniProfileSchema.parse(req.body);
    const profile = await storage.createAlumniProfile(validated);
    res.json(profile);
  } catch (error) {
    console.error("Error creating alumni profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

router.post("/mentorship/request", async (req, res) => {
  try {
    const validated = insertMentorshipRequestSchema.parse(req.body);
    const request = await storage.requestMentorship(validated);
    res.json(request);
  } catch (error) {
    console.error("Error requesting mentorship:", error);
    res.status(500).json({ error: "Failed to request mentorship" });
  }
});

router.get("/mentorship/requests/:mentorId", async (req, res) => {
  try {
    const requests = await storage.getMentorshipRequests(Number(req.params.mentorId));
    res.json(requests);
  } catch (error) {
    console.error("Error fetching mentorship requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.patch("/mentorship/requests/:id", async (req, res) => {
  try {
    const request = await storage.updateMentorshipRequest(Number(req.params.id), req.body);
    res.json(request);
  } catch (error) {
    console.error("Error updating mentorship request:", error);
    res.status(500).json({ error: "Failed to update request" });
  }
});

// Internships Routes
router.get("/internships", async (req, res) => {
  try {
    const internships = await storage.getActiveInternships();
    res.json(internships);
  } catch (error) {
    console.error("Error fetching internships:", error);
    res.status(500).json({ error: "Failed to fetch internships" });
  }
});

router.get("/internships/:id", async (req, res) => {
  try {
    const internship = await storage.getInternship(Number(req.params.id));
    if (!internship) {
      return res.status(404).json({ error: "Internship not found" });
    }
    res.json(internship);
  } catch (error) {
    console.error("Error fetching internship:", error);
    res.status(500).json({ error: "Failed to fetch internship" });
  }
});

router.get("/internships/company/:companyId", async (req, res) => {
  try {
    const internships = await storage.getCompanyInternships(Number(req.params.companyId));
    res.json(internships);
  } catch (error) {
    console.error("Error fetching company internships:", error);
    res.status(500).json({ error: "Failed to fetch internships" });
  }
});

router.post("/internships", async (req, res) => {
  try {
    const validated = insertInternshipSchema.parse(req.body);
    const internship = await storage.createInternship(validated);
    res.json(internship);
  } catch (error) {
    console.error("Error creating internship:", error);
    res.status(500).json({ error: "Failed to create internship" });
  }
});

router.patch("/internships/:id", async (req, res) => {
  try {
    const internship = await storage.updateInternship(Number(req.params.id), req.body);
    res.json(internship);
  } catch (error) {
    console.error("Error updating internship:", error);
    res.status(500).json({ error: "Failed to update internship" });
  }
});

// Skills Assessment Routes
router.get("/assessments/user/:userId", async (req, res) => {
  try {
    const assessments = await storage.getUserAssessments(Number(req.params.userId));
    res.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

router.get("/assessments/user/:userId/latest/:type", async (req, res) => {
  try {
    const assessment = await storage.getLatestAssessment(Number(req.params.userId), req.params.type);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    res.json(assessment);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
});

router.post("/assessments", async (req, res) => {
  try {
    const validated = insertSkillsAssessmentSchema.parse(req.body);
    const assessment = await storage.createSkillsAssessment(validated);
    res.json(assessment);
  } catch (error) {
    console.error("Error creating assessment:", error);
    res.status(500).json({ error: "Failed to create assessment" });
  }
});

// Career Paths Routes
router.get("/career-paths/user/:userId", async (req, res) => {
  try {
    const paths = await storage.getUserCareerPaths(Number(req.params.userId));
    res.json(paths);
  } catch (error) {
    console.error("Error fetching career paths:", error);
    res.status(500).json({ error: "Failed to fetch career paths" });
  }
});

router.post("/career-paths", async (req, res) => {
  try {
    const validated = insertCareerPathSchema.parse(req.body);
    const path = await storage.createCareerPath(validated);
    res.json(path);
  } catch (error) {
    console.error("Error creating career path:", error);
    res.status(500).json({ error: "Failed to create career path" });
  }
});

router.patch("/career-paths/:id", async (req, res) => {
  try {
    const path = await storage.updateCareerPath(Number(req.params.id), req.body);
    res.json(path);
  } catch (error) {
    console.error("Error updating career path:", error);
    res.status(500).json({ error: "Failed to update career path" });
  }
});

// Career Resources Routes
router.get("/resources", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const resources = await storage.getCareerResources(category);
    res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.get("/resources/:id", async (req, res) => {
  try {
    const resource = await storage.getCareerResource(Number(req.params.id));
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    await storage.incrementResourceViews(Number(req.params.id));
    res.json(resource);
  } catch (error) {
    console.error("Error fetching resource:", error);
    res.status(500).json({ error: "Failed to fetch resource" });
  }
});

router.post("/resources", async (req, res) => {
  try {
    const validated = insertCareerResourceSchema.parse(req.body);
    const resource = await storage.createCareerResource(validated);
    res.json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

export default router;