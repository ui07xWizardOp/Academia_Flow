import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Briefcase, MapPin, Calendar, Clock, DollarSign, Building2, Globe, CheckCircle, Star } from "lucide-react";
import { format } from "date-fns";

export default function Internships() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRemote, setFilterRemote] = useState("all");
  const [filterPaid, setFilterPaid] = useState("all");
  const [selectedInternship, setSelectedInternship] = useState<any>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  // Fetch internships
  const { data: internships = [], isLoading } = useQuery({
    queryKey: ["/api/career/internships"],
  });

  // Fetch companies
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/career/companies"],
  });

  // Fetch user's applications
  const { data: applications = [] } = useQuery({
    queryKey: [`/api/career/applications/user/${userId}`],
  });

  // Apply for internship mutation
  const applyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/career/applications", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your internship application has been submitted!",
      });
      setApplyDialogOpen(false);
      setCoverLetter("");
      queryClient.invalidateQueries({ queryKey: [`/api/career/applications/user/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Application Failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Enhanced internships with company data
  const enhancedInternships = internships.map((internship: any) => {
    const company = companies.find((c: any) => c.id === internship.companyId);
    return {
      ...internship,
      company: company || { name: "Unknown Company", industry: "Technology" },
    };
  });

  // Filter internships
  const filteredInternships = enhancedInternships.filter((internship: any) => {
    const matchesSearch = 
      internship.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      internship.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      internship.company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRemote = 
      filterRemote === "all" ||
      (filterRemote === "remote" && internship.isRemote) ||
      (filterRemote === "onsite" && !internship.isRemote);
    const matchesPaid = 
      filterPaid === "all" ||
      (filterPaid === "paid" && internship.isPaid) ||
      (filterPaid === "unpaid" && !internship.isPaid);
    return matchesSearch && matchesRemote && matchesPaid;
  });

  const hasApplied = (internshipId: number) => {
    // Since internships are stored as job listings, check if applied
    return applications.some((app: any) => app.jobId === internshipId);
  };

  const handleApply = () => {
    if (!coverLetter.trim()) {
      toast({
        title: "Cover Letter Required",
        description: "Please write a cover letter for your application.",
        variant: "destructive",
      });
      return;
    }

    // Apply as a job application
    applyMutation.mutate({
      jobId: selectedInternship.id,
      userId,
      coverLetter,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 mb-4" data-testid="text-page-title">
            Internship Opportunities
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Find internships to gain real-world experience</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search internships, companies, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterRemote === "all" ? "default" : "outline"}
                onClick={() => setFilterRemote("all")}
                size="sm"
                data-testid="button-filter-all"
              >
                All Locations
              </Button>
              <Button
                variant={filterRemote === "remote" ? "default" : "outline"}
                onClick={() => setFilterRemote("remote")}
                size="sm"
                data-testid="button-filter-remote"
              >
                Remote
              </Button>
              <Button
                variant={filterRemote === "onsite" ? "default" : "outline"}
                onClick={() => setFilterRemote("onsite")}
                size="sm"
                data-testid="button-filter-onsite"
              >
                On-site
              </Button>
              <Button
                variant={filterPaid === "paid" ? "default" : "outline"}
                onClick={() => setFilterPaid(filterPaid === "paid" ? "all" : "paid")}
                size="sm"
                data-testid="button-filter-paid"
              >
                Paid Only
              </Button>
            </div>
          </div>
        </Card>

        {/* Featured Companies */}
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Partner Companies Offering Internships</h2>
          <div className="flex gap-4 overflow-x-auto">
            {companies.slice(0, 6).map((company: any) => (
              <Card key={company.id} className="p-4 min-w-[150px] text-center" data-testid={`card-company-${company.id}`}>
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-12 w-12 mx-auto mb-2" />
                ) : (
                  <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                )}
                <p className="font-medium text-sm">{company.name}</p>
                <p className="text-xs text-gray-500">{company.industry}</p>
              </Card>
            ))}
          </div>
        </Card>

        {/* Internship Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4">
              {isLoading ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">Loading internships...</p>
                </Card>
              ) : filteredInternships.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500">No internships found matching your criteria</p>
                </Card>
              ) : (
                filteredInternships.map((internship: any) => (
                  <Card
                    key={internship.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedInternship(internship)}
                    data-testid={`card-internship-${internship.id}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1" data-testid={`text-title-${internship.id}`}>
                          {internship.title}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Building2 className="h-4 w-4" />
                          <span>{internship.company.name}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {internship.isPaid ? (
                          <Badge className="bg-green-500">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unpaid</Badge>
                        )}
                        {internship.isRemote && (
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            Remote
                          </Badge>
                        )}
                        {hasApplied(internship.id) && (
                          <Badge className="bg-blue-500">Applied</Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                      {internship.description}
                    </p>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                      {internship.location && !internship.isRemote && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {internship.location}
                        </span>
                      )}
                      {internship.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {internship.duration}
                        </span>
                      )}
                      {internship.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Starts {format(new Date(internship.startDate), "MMM yyyy")}
                        </span>
                      )}
                      {internship.applicationDeadline && (
                        <span className="text-orange-600 dark:text-orange-400">
                          Apply by {format(new Date(internship.applicationDeadline), "MMM d")}
                        </span>
                      )}
                    </div>

                    {internship.departments && internship.departments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {internship.departments.map((dept: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {dept}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {selectedInternship ? (
              <Card className="p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">{selectedInternship.title}</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span>{selectedInternship.company.name}</span>
                  </div>
                  {selectedInternship.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{selectedInternship.location}</span>
                    </div>
                  )}
                  {selectedInternship.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{selectedInternship.duration}</span>
                    </div>
                  )}
                  {selectedInternship.stipend && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>{selectedInternship.stipend}</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {selectedInternship.description}
                  </p>
                </div>

                {selectedInternship.requirements && selectedInternship.requirements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Requirements</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {selectedInternship.requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedInternship.departments && selectedInternship.departments.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Departments</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedInternship.departments.map((dept: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{dept}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {hasApplied(selectedInternship.id) ? (
                  <Button className="w-full" disabled>
                    <CheckCircle className="h-4 w-4 mr-2" />
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
              </Card>
            ) : (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Tips for Landing an Internship</h3>
                <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Tailor your resume for each application</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Write a compelling cover letter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Highlight relevant coursework and projects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Apply early - don't wait for deadlines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Follow up after submitting your application</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>Network with alumni in your field</span>
                  </li>
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply for {selectedInternship?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Why are you interested in this internship?
              </label>
              <Textarea
                placeholder="Explain your interest in this role and what you hope to learn..."
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
                data-testid="button-submit"
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