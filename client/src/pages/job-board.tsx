import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, MapPin, Clock, DollarSign, Calendar, Building2, Search, Filter, BookmarkIcon } from "lucide-react";
import { format } from "date-fns";

export default function JobBoard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  // Fetch job listings
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/career/jobs", { active: true }],
    queryFn: async () => {
      const response = await fetch("/api/career/jobs?active=true");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
  });

  // Fetch user's resumes
  const { data: resumes = [] } = useQuery({
    queryKey: [`/api/career/resumes/user/${userId}`],
  });

  // Fetch user's applications
  const { data: applications = [] } = useQuery({
    queryKey: [`/api/career/applications/user/${userId}`],
  });

  // Apply for job mutation
  const applyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/career/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to apply");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully!",
      });
      setApplyDialogOpen(false);
      setCoverLetter("");
      setSelectedResumeId(null);
      queryClient.invalidateQueries({ queryKey: [`/api/career/applications/user/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Application Failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter((job: any) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || job.type === filterType;
    const matchesLevel = filterLevel === "all" || job.experienceLevel === filterLevel;
    return matchesSearch && matchesType && matchesLevel;
  });

  const hasApplied = (jobId: number) => {
    return applications.some((app: any) => app.jobId === jobId);
  };

  const handleApply = () => {
    if (!selectedResumeId) {
      toast({
        title: "Resume Required",
        description: "Please select a resume to apply with.",
        variant: "destructive",
      });
      return;
    }

    applyMutation.mutate({
      jobId: selectedJob.id,
      userId,
      resumeId: selectedResumeId,
      coverLetter,
    });
  };

  const formatSalary = (salary: any) => {
    if (!salary) return "Not specified";
    return `${salary.currency || "$"}${salary.min?.toLocaleString()} - ${salary.max?.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4" data-testid="text-page-title">
            Job Board
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Discover opportunities that match your career goals</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs, companies, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]" data-testid="select-job-type">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[200px]" data-testid="select-experience-level">
                <SelectValue placeholder="Experience Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="mid">Mid Level</SelectItem>
                <SelectItem value="senior">Senior Level</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Job Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {jobsLoading ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">Loading job listings...</p>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No jobs found matching your criteria</p>
              </Card>
            ) : (
              filteredJobs.map((job: any) => (
                <Card
                  key={job.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                  data-testid={`card-job-${job.id}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {job.companyLogo ? (
                          <img src={job.companyLogo} alt={job.company} className="h-12 w-12 rounded" />
                        ) : (
                          <Building2 className="h-12 w-12 text-gray-400 p-2 bg-gray-100 rounded" />
                        )}
                        <div>
                          <h3 className="text-xl font-semibold" data-testid={`text-job-title-${job.id}`}>{job.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400" data-testid={`text-company-${job.id}`}>{job.company}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {job.type}
                        </Badge>
                        <Badge variant="secondary">
                          <MapPin className="h-3 w-3 mr-1" />
                          {job.location}
                        </Badge>
                        {job.experienceLevel && (
                          <Badge variant="secondary">
                            {job.experienceLevel}
                          </Badge>
                        )}
                        {job.salary && (
                          <Badge variant="secondary">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {formatSalary(job.salary)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-gray-500">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Posted {format(new Date(job.postedDate), "MMM d, yyyy")}
                        </span>
                        {hasApplied(job.id) && (
                          <Badge variant="default" className="bg-green-500">
                            Applied
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Job Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedJob ? (
              <Card className="p-6 sticky top-4">
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    {selectedJob.companyLogo ? (
                      <img src={selectedJob.companyLogo} alt={selectedJob.company} className="h-16 w-16 rounded" />
                    ) : (
                      <Building2 className="h-16 w-16 text-gray-400 p-3 bg-gray-100 rounded" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold" data-testid="text-selected-job-title">{selectedJob.title}</h2>
                      <p className="text-gray-600 dark:text-gray-400">{selectedJob.company}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedJob.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>{selectedJob.type}</span>
                    </div>
                    {selectedJob.salary && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span>{formatSalary(selectedJob.salary)}</span>
                      </div>
                    )}
                    {selectedJob.applicationDeadline && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>Apply by {format(new Date(selectedJob.applicationDeadline), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedJob.description}
                    </p>
                  </div>

                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Requirements</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        {selectedJob.requirements.map((req: string, idx: number) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Benefits</h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                        {selectedJob.benefits.map((benefit: string, idx: number) => (
                          <li key={idx}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedJob.tags && selectedJob.tags.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Skills & Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {hasApplied(selectedJob.id) ? (
                      <Button className="w-full" disabled>
                        Already Applied
                      </Button>
                    ) : (
                      <Button 
                        className="w-full"
                        onClick={() => setApplyDialogOpen(true)}
                        data-testid="button-apply"
                      >
                        Apply Now
                      </Button>
                    )}
                    <Button variant="outline" data-testid="button-save">
                      <BookmarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-500">Select a job to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Submit your application to {selectedJob?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Resume</label>
              <Select value={selectedResumeId?.toString()} onValueChange={(v) => setSelectedResumeId(Number(v))}>
                <SelectTrigger data-testid="select-resume">
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume: any) => (
                    <SelectItem key={resume.id} value={resume.id.toString()}>
                      {resume.title} {resume.isDefault && "(Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cover Letter (Optional)</label>
              <Textarea
                placeholder="Write a cover letter to introduce yourself..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={8}
                data-testid="textarea-cover-letter"
              />
            </div>
            <div className="flex gap-3">
              <Button
                className="w-full"
                onClick={handleApply}
                disabled={applyMutation.isPending}
                data-testid="button-submit-application"
              >
                {applyMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setApplyDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}