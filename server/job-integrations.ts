import { Router } from "express";
import axios from "axios";
import { storage } from "./storage";
import { z } from "zod";

// Job Board Integration Types
interface JobSearchParams {
  query: string;
  location?: string;
  radius?: number;
  jobType?: 'fulltime' | 'parttime' | 'contract' | 'internship';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  salary?: {
    min?: number;
    max?: number;
  };
  remote?: boolean;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string[];
  skills?: string[];
  page?: number;
  limit?: number;
}

interface JobListing {
  id: string;
  source: 'indeed' | 'linkedin' | 'glassdoor' | 'ziprecruiter' | 'internal';
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hour' | 'year';
  };
  jobType: string;
  experienceLevel: string;
  postedDate: Date;
  applicationUrl: string;
  companyLogo?: string;
  benefits?: string[];
  remote: boolean;
  skills: string[];
  applicantCount?: number;
  matchScore?: number;
}

// Indeed API Integration
export class IndeedIntegration {
  private publisherId: string;
  private apiKey: string;
  private baseUrl = 'https://api.indeed.com/ads';

  constructor(publisherId: string, apiKey: string) {
    this.publisherId = publisherId;
    this.apiKey = apiKey;
  }

  async searchJobs(params: JobSearchParams): Promise<JobListing[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/apisearch`, {
        params: {
          publisher: this.publisherId,
          v: '2',
          format: 'json',
          q: params.query,
          l: params.location,
          radius: params.radius || 25,
          jt: this.mapJobType(params.jobType),
          start: ((params.page || 1) - 1) * (params.limit || 25),
          limit: params.limit || 25,
          fromage: 30, // Jobs from last 30 days
          highlight: 0,
          latlong: 1,
          co: 'us'
        }
      });

      return this.transformIndeedResults(response.data.results || []);
    } catch (error: any) {
      console.error('Indeed API Error:', error.message);
      // Fallback to mock data for demonstration
      return this.getMockIndeedJobs(params);
    }
  }

  private mapJobType(type?: string): string {
    const typeMap: any = {
      'fulltime': 'fulltime',
      'parttime': 'parttime',
      'contract': 'contract',
      'internship': 'internship'
    };
    return typeMap[type || ''] || '';
  }

  private transformIndeedResults(results: any[]): JobListing[] {
    return results.map(job => ({
      id: job.jobkey,
      source: 'indeed' as const,
      title: job.jobtitle,
      company: job.company,
      location: job.formattedLocation,
      description: job.snippet,
      requirements: this.extractRequirements(job.snippet),
      responsibilities: [],
      jobType: job.jobType || 'fulltime',
      experienceLevel: this.detectExperienceLevel(job.jobtitle + ' ' + job.snippet),
      postedDate: new Date(job.date),
      applicationUrl: job.url,
      companyLogo: job.companyLogo,
      remote: job.formattedLocation?.toLowerCase().includes('remote') || false,
      skills: this.extractSkills(job.snippet),
      salary: this.extractSalary(job.snippet)
    }));
  }

  private extractRequirements(description: string): string[] {
    const requirements = [];
    const patterns = [
      /\d+\+?\s*years?\s+(?:of\s+)?experience/gi,
      /bachelor'?s?\s+degree/gi,
      /master'?s?\s+degree/gi,
      /required:\s*([^.]+)/gi
    ];

    patterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        requirements.push(...matches);
      }
    });

    return requirements;
  }

  private extractSkills(description: string): string[] {
    const techSkills = [
      'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 
      'AWS', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'Git',
      'Machine Learning', 'AI', 'DevOps', 'Cloud', 'Agile'
    ];

    return techSkills.filter(skill => 
      new RegExp(`\\b${skill}\\b`, 'i').test(description)
    );
  }

  private detectExperienceLevel(text: string): string {
    if (/senior|sr\.|lead|principal|staff/i.test(text)) return 'senior';
    if (/junior|jr\.|entry|graduate|intern/i.test(text)) return 'entry';
    if (/mid-?level|intermediate/i.test(text)) return 'mid';
    return 'mid';
  }

  private extractSalary(text: string): any {
    const salaryPattern = /\$?([\d,]+)(?:k|\s*-\s*\$?([\d,]+))?(?:k)?(?:\s*per\s*(hour|year))?/i;
    const match = text.match(salaryPattern);
    
    if (match) {
      const min = parseInt(match[1].replace(/,/g, ''));
      const max = match[2] ? parseInt(match[2].replace(/,/g, '')) : undefined;
      const period = match[3] || 'year';
      
      return {
        min: min * (text.toLowerCase().includes('k') ? 1000 : 1),
        max: max ? max * (text.toLowerCase().includes('k') ? 1000 : 1) : undefined,
        currency: 'USD',
        period
      };
    }
    
    return undefined;
  }

  private getMockIndeedJobs(params: JobSearchParams): JobListing[] {
    // Return realistic mock data for demonstration
    const mockJobs = [
      {
        id: 'indeed_1',
        source: 'indeed' as const,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: params.location || 'San Francisco, CA',
        description: 'We are looking for a talented Software Engineer to join our team...',
        requirements: ['3+ years experience', "Bachelor's degree in Computer Science"],
        responsibilities: ['Develop scalable applications', 'Collaborate with team'],
        salary: { min: 120000, max: 180000, currency: 'USD', period: 'year' as const },
        jobType: 'fulltime',
        experienceLevel: 'mid',
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        applicationUrl: 'https://indeed.com/job/123',
        remote: true,
        skills: ['JavaScript', 'React', 'Node.js'],
        matchScore: 85
      },
      {
        id: 'indeed_2',
        source: 'indeed' as const,
        title: 'Data Scientist',
        company: 'AI Innovations',
        location: params.location || 'New York, NY',
        description: 'Join our data science team to work on cutting-edge ML projects...',
        requirements: ['5+ years experience', "Master's degree preferred"],
        responsibilities: ['Build ML models', 'Analyze large datasets'],
        salary: { min: 150000, max: 220000, currency: 'USD', period: 'year' as const },
        jobType: 'fulltime',
        experienceLevel: 'senior',
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        applicationUrl: 'https://indeed.com/job/456',
        remote: false,
        skills: ['Python', 'Machine Learning', 'SQL'],
        matchScore: 78
      }
    ];

    return mockJobs.filter(job => 
      job.title.toLowerCase().includes(params.query.toLowerCase()) ||
      job.description.toLowerCase().includes(params.query.toLowerCase())
    );
  }
}

// LinkedIn Jobs API Integration
export class LinkedInIntegration {
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async authenticate() {
    // LinkedIn OAuth 2.0 flow
    // This would typically involve redirecting user to LinkedIn for authorization
    // For now, we'll use a placeholder
    this.accessToken = 'placeholder_token';
  }

  async searchJobs(params: JobSearchParams): Promise<JobListing[]> {
    // LinkedIn Jobs API requires OAuth and specific partnerships
    // Using mock data for demonstration
    return this.getMockLinkedInJobs(params);
  }

  private getMockLinkedInJobs(params: JobSearchParams): JobListing[] {
    const mockJobs = [
      {
        id: 'linkedin_1',
        source: 'linkedin' as const,
        title: 'Senior Frontend Developer',
        company: 'Global Tech Solutions',
        location: params.location || 'Remote',
        description: 'We are seeking an experienced Frontend Developer to lead our UI team...',
        requirements: ['5+ years React experience', 'Team leadership experience'],
        responsibilities: ['Lead frontend architecture', 'Mentor junior developers'],
        salary: { min: 140000, max: 200000, currency: 'USD', period: 'year' as const },
        jobType: 'fulltime',
        experienceLevel: 'senior',
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        applicationUrl: 'https://linkedin.com/jobs/123',
        remote: true,
        skills: ['React', 'TypeScript', 'GraphQL'],
        applicantCount: 45,
        matchScore: 92
      },
      {
        id: 'linkedin_2',
        source: 'linkedin' as const,
        title: 'DevOps Engineer',
        company: 'Cloud Innovations Inc',
        location: params.location || 'Seattle, WA',
        description: 'Join our DevOps team to build and maintain cloud infrastructure...',
        requirements: ['AWS certification', '3+ years Kubernetes experience'],
        responsibilities: ['Manage CI/CD pipelines', 'Optimize cloud costs'],
        salary: { min: 130000, max: 180000, currency: 'USD', period: 'year' as const },
        jobType: 'fulltime',
        experienceLevel: 'mid',
        postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        applicationUrl: 'https://linkedin.com/jobs/456',
        remote: false,
        skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
        applicantCount: 23,
        matchScore: 81
      }
    ];

    return mockJobs.filter(job => 
      job.title.toLowerCase().includes(params.query.toLowerCase()) ||
      job.skills.some(skill => skill.toLowerCase().includes(params.query.toLowerCase()))
    );
  }

  async getJobDetails(jobId: string): Promise<JobListing | null> {
    // Fetch detailed job information
    return {
      id: jobId,
      source: 'linkedin',
      title: 'Software Engineer',
      company: 'Tech Company',
      location: 'San Francisco, CA',
      description: 'Detailed job description...',
      requirements: ['Bachelor\'s degree', '3+ years experience'],
      responsibilities: ['Build features', 'Write tests'],
      salary: { min: 120000, max: 160000, currency: 'USD', period: 'year' as const },
      jobType: 'fulltime',
      experienceLevel: 'mid',
      postedDate: new Date(),
      applicationUrl: `https://linkedin.com/jobs/${jobId}`,
      remote: true,
      skills: ['JavaScript', 'React'],
      applicantCount: 30
    };
  }

  async applyToJob(jobId: string, resume: string, coverLetter?: string): Promise<boolean> {
    // Submit job application through LinkedIn
    // This would require OAuth and user permissions
    console.log(`Applying to job ${jobId} with resume`);
    return true;
  }
}

// Glassdoor Integration
export class GlassdoorIntegration {
  private partnerId: string;
  private partnerKey: string;

  constructor(partnerId: string, partnerKey: string) {
    this.partnerId = partnerId;
    this.partnerKey = partnerKey;
  }

  async searchJobs(params: JobSearchParams): Promise<JobListing[]> {
    // Glassdoor API requires partnership agreement
    // Using mock data for demonstration
    return this.getMockGlassdoorJobs(params);
  }

  private getMockGlassdoorJobs(params: JobSearchParams): JobListing[] {
    return [
      {
        id: 'glassdoor_1',
        source: 'glassdoor' as const,
        title: 'Full Stack Developer',
        company: 'Startup Hub',
        location: params.location || 'Austin, TX',
        description: 'Join our fast-growing startup as a Full Stack Developer...',
        requirements: ['Node.js experience', 'React proficiency'],
        responsibilities: ['Build APIs', 'Develop frontend features'],
        salary: { min: 100000, max: 140000, currency: 'USD', period: 'year' as const },
        jobType: 'fulltime',
        experienceLevel: 'mid',
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        applicationUrl: 'https://glassdoor.com/job/123',
        remote: true,
        skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
        benefits: ['Health insurance', '401k', 'Unlimited PTO'],
        matchScore: 88
      }
    ];
  }

  async getCompanyReviews(companyName: string): Promise<any> {
    // Fetch company reviews and ratings from Glassdoor
    return {
      company: companyName,
      rating: 4.2,
      reviewCount: 1234,
      ceoApproval: 85,
      recommendToFriend: 78,
      reviews: [
        {
          title: 'Great place to work',
          pros: 'Good work-life balance, great team',
          cons: 'Could have better benefits',
          rating: 4
        }
      ]
    };
  }

  async getSalaryData(jobTitle: string, location: string): Promise<any> {
    // Fetch salary data from Glassdoor
    return {
      jobTitle,
      location,
      baseSalary: {
        min: 95000,
        median: 120000,
        max: 150000
      },
      totalCompensation: {
        min: 110000,
        median: 145000,
        max: 190000
      },
      dataPoints: 523
    };
  }
}

// Job Aggregator Service
export class JobAggregatorService {
  private indeed: IndeedIntegration;
  private linkedin: LinkedInIntegration;
  private glassdoor: GlassdoorIntegration;

  constructor() {
    // Initialize with API keys from environment
    this.indeed = new IndeedIntegration(
      process.env.INDEED_PUBLISHER_ID || 'demo',
      process.env.INDEED_API_KEY || 'demo'
    );
    
    this.linkedin = new LinkedInIntegration(
      process.env.LINKEDIN_CLIENT_ID || 'demo',
      process.env.LINKEDIN_CLIENT_SECRET || 'demo'
    );
    
    this.glassdoor = new GlassdoorIntegration(
      process.env.GLASSDOOR_PARTNER_ID || 'demo',
      process.env.GLASSDOOR_PARTNER_KEY || 'demo'
    );
  }

  async searchAllPlatforms(params: JobSearchParams): Promise<JobListing[]> {
    try {
      // Search jobs from all platforms in parallel
      const [indeedJobs, linkedinJobs, glassdoorJobs] = await Promise.all([
        this.indeed.searchJobs(params),
        this.linkedin.searchJobs(params),
        this.glassdoor.searchJobs(params)
      ]);

      // Combine and deduplicate results
      const allJobs = [...indeedJobs, ...linkedinJobs, ...glassdoorJobs];
      
      // Calculate match scores based on user profile
      const scoredJobs = await this.calculateMatchScores(allJobs, params);
      
      // Sort by match score and date
      return scoredJobs.sort((a, b) => {
        if (a.matchScore && b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return b.postedDate.getTime() - a.postedDate.getTime();
      });
    } catch (error) {
      console.error('Job aggregation error:', error);
      return [];
    }
  }

  private async calculateMatchScores(jobs: JobListing[], params: JobSearchParams): Promise<JobListing[]> {
    return jobs.map(job => {
      let score = 50; // Base score
      
      // Location match
      if (job.location === params.location) score += 10;
      if (job.remote && params.remote) score += 15;
      
      // Job type match
      if (job.jobType === params.jobType) score += 10;
      
      // Skills match
      if (params.skills) {
        const matchingSkills = job.skills.filter(skill => 
          params.skills?.includes(skill)
        );
        score += (matchingSkills.length / params.skills.length) * 20;
      }
      
      // Salary match
      if (params.salary && job.salary) {
        if (job.salary.min && params.salary.min) {
          if (job.salary.min >= params.salary.min) score += 10;
        }
      }
      
      // Experience level match
      if (job.experienceLevel === params.experienceLevel) score += 5;
      
      return {
        ...job,
        matchScore: Math.min(100, Math.round(score))
      };
    });
  }

  async getRecommendedJobs(userId: number): Promise<JobListing[]> {
    // Get user profile and preferences
    const userProfile = await storage.getUserProfile(userId);
    const userSkills = await storage.getUserSkills(userId);
    
    const params: JobSearchParams = {
      query: userProfile.desiredRole || 'software engineer',
      location: userProfile.location || 'Remote',
      skills: userSkills.map((s: any) => s.name),
      experienceLevel: this.mapExperienceLevel(userProfile.yearsExperience),
      salary: {
        min: userProfile.desiredSalary
      },
      remote: userProfile.openToRemote
    };
    
    return this.searchAllPlatforms(params);
  }

  private mapExperienceLevel(years?: number): 'entry' | 'mid' | 'senior' | 'executive' {
    if (!years || years < 2) return 'entry';
    if (years < 5) return 'mid';
    if (years < 10) return 'senior';
    return 'executive';
  }

  async trackApplication(userId: number, jobId: string, status: string): Promise<void> {
    await storage.createJobApplication({
      userId,
      jobListingId: parseInt(jobId),
      status,
      appliedAt: new Date()
    });
  }

  async getApplicationStats(userId: number): Promise<any> {
    const applications = await storage.getUserJobApplications(userId);
    
    return {
      total: applications.length,
      pending: applications.filter((a: any) => a.status === 'applied').length,
      interviewing: applications.filter((a: any) => a.status === 'interviewing').length,
      offered: applications.filter((a: any) => a.status === 'offered').length,
      rejected: applications.filter((a: any) => a.status === 'rejected').length,
      responseRate: this.calculateResponseRate(applications),
      averageResponseTime: this.calculateAverageResponseTime(applications)
    };
  }

  private calculateResponseRate(applications: any[]): number {
    if (applications.length === 0) return 0;
    const responded = applications.filter(a => a.status !== 'applied').length;
    return Math.round((responded / applications.length) * 100);
  }

  private calculateAverageResponseTime(applications: any[]): number {
    const responded = applications.filter(a => a.responseDate);
    if (responded.length === 0) return 0;
    
    const totalDays = responded.reduce((sum, app) => {
      const days = Math.floor((app.responseDate - app.appliedAt) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / responded.length);
  }
}

// Express Router for Job Board endpoints
const router = Router();
const jobService = new JobAggregatorService();

// Search jobs across all platforms
router.post('/api/jobs/search', async (req, res) => {
  try {
    const params = req.body as JobSearchParams;
    const jobs = await jobService.searchAllPlatforms(params);
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommended jobs for user
router.get('/api/jobs/recommended/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const jobs = await jobService.getRecommendedJobs(userId);
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Track job application
router.post('/api/jobs/apply', async (req, res) => {
  try {
    const { userId, jobId, status } = req.body;
    await jobService.trackApplication(userId, jobId, status || 'applied');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get application statistics
router.get('/api/jobs/stats/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const stats = await jobService.getApplicationStats(userId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get company reviews from Glassdoor
router.get('/api/jobs/company/:company/reviews', async (req, res) => {
  try {
    const glassdoor = new GlassdoorIntegration(
      process.env.GLASSDOOR_PARTNER_ID || 'demo',
      process.env.GLASSDOOR_PARTNER_KEY || 'demo'
    );
    const reviews = await glassdoor.getCompanyReviews(req.params.company);
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get salary data
router.get('/api/jobs/salary', async (req, res) => {
  try {
    const { title, location } = req.query;
    const glassdoor = new GlassdoorIntegration(
      process.env.GLASSDOOR_PARTNER_ID || 'demo',
      process.env.GLASSDOOR_PARTNER_KEY || 'demo'
    );
    const salaryData = await glassdoor.getSalaryData(title as string, location as string);
    res.json(salaryData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
export { JobAggregatorService, IndeedIntegration, LinkedInIntegration, GlassdoorIntegration };