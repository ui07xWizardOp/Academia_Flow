import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Briefcase, MapPin, GraduationCap, Linkedin, Mail, Star, Send, Filter, Building2 } from "lucide-react";

export default function AlumniNetwork() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterGradYear, setFilterGradYear] = useState("all");
  const [selectedAlumni, setSelectedAlumni] = useState<any>(null);
  const [mentorshipDialogOpen, setMentorshipDialogOpen] = useState(false);
  const [mentorshipMessage, setMentorshipMessage] = useState("");
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  // Fetch alumni profiles
  const { data: alumni = [], isLoading: alumniLoading } = useQuery({
    queryKey: ["/api/career/alumni"],
  });

  // Fetch mentors only
  const { data: mentors = [] } = useQuery({
    queryKey: ["/api/career/alumni", { mentors: true }],
    queryFn: async () => {
      const response = await fetch("/api/career/alumni?mentors=true");
      if (!response.ok) throw new Error("Failed to fetch mentors");
      return response.json();
    },
  });

  // Fetch mentorship requests
  const { data: mentorshipRequests = [] } = useQuery({
    queryKey: [`/api/career/mentorship/requests/${userId}`],
  });

  // Request mentorship mutation
  const requestMentorshipMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/career/mentorship/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Sent",
        description: "Your mentorship request has been sent successfully!",
      });
      setMentorshipDialogOpen(false);
      setMentorshipMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/career/mentorship/requests/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to send mentorship request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mock data enhancement (in real app, this would come from the database)
  const enhancedAlumni = alumni.map((alum: any) => ({
    ...alum,
    graduationYear: alum.graduationYear || 2020 + Math.floor(Math.random() * 5),
    degree: alum.degree || "B.S. Computer Science",
    major: alum.major || "Computer Science",
    currentCompany: alum.currentCompany || ["Google", "Microsoft", "Apple", "Amazon", "Meta"][Math.floor(Math.random() * 5)],
    currentPosition: alum.currentPosition || ["Software Engineer", "Product Manager", "Data Scientist", "UX Designer"][Math.floor(Math.random() * 4)],
    industry: alum.industry || ["Technology", "Finance", "Healthcare", "Education"][Math.floor(Math.random() * 4)],
    location: alum.location || ["San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX"][Math.floor(Math.random() * 4)],
    bio: alum.bio || "Passionate about technology and innovation. Happy to help current students navigate their career journey.",
    linkedinUrl: alum.linkedinUrl || "linkedin.com/in/alumniprofile",
    willingToMentor: alum.willingToMentor !== undefined ? alum.willingToMentor : Math.random() > 0.5,
    areasOfExpertise: alum.areasOfExpertise || ["Software Development", "Career Advice", "Interview Prep"],
  }));

  // Filter alumni
  const filteredAlumni = enhancedAlumni.filter((alum: any) => {
    const matchesSearch = 
      alum.currentCompany?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alum.currentPosition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alum.major?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alum.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = filterIndustry === "all" || alum.industry === filterIndustry;
    const matchesYear = filterGradYear === "all" || 
      (filterGradYear === "recent" && alum.graduationYear >= 2022) ||
      (filterGradYear === "experienced" && alum.graduationYear < 2022);
    return matchesSearch && matchesIndustry && matchesYear;
  });

  const handleMentorshipRequest = () => {
    if (!mentorshipMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please write a message for your mentorship request.",
        variant: "destructive",
      });
      return;
    }

    requestMentorshipMutation.mutate({
      studentId: userId,
      mentorId: selectedAlumni.userId || selectedAlumni.id,
      message: mentorshipMessage,
    });
  };

  const hasRequestedMentorship = (mentorId: number) => {
    return mentorshipRequests.some((req: any) => req.mentorId === mentorId && req.status === "pending");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4" data-testid="text-page-title">
            Alumni Network
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Connect with alumni for mentorship, advice, and career opportunities</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by company, position, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterIndustry === "all" ? "default" : "outline"}
                onClick={() => setFilterIndustry("all")}
                size="sm"
                data-testid="button-filter-all"
              >
                All Industries
              </Button>
              <Button
                variant={filterIndustry === "Technology" ? "default" : "outline"}
                onClick={() => setFilterIndustry("Technology")}
                size="sm"
                data-testid="button-filter-tech"
              >
                Technology
              </Button>
              <Button
                variant={filterIndustry === "Finance" ? "default" : "outline"}
                onClick={() => setFilterIndustry("Finance")}
                size="sm"
                data-testid="button-filter-finance"
              >
                Finance
              </Button>
              <Button
                variant={filterGradYear === "recent" ? "default" : "outline"}
                onClick={() => setFilterGradYear(filterGradYear === "recent" ? "all" : "recent")}
                size="sm"
                data-testid="button-filter-recent"
              >
                Recent Grads
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Alumni</TabsTrigger>
            <TabsTrigger value="mentors">Available Mentors</TabsTrigger>
            <TabsTrigger value="connections">My Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alumniLoading ? (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-gray-500">Loading alumni profiles...</p>
                </Card>
              ) : filteredAlumni.length === 0 ? (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-gray-500">No alumni found matching your criteria</p>
                </Card>
              ) : (
                filteredAlumni.map((alum: any, idx: number) => (
                  <Card
                    key={alum.id || idx}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedAlumni(alum)}
                    data-testid={`card-alumni-${alum.id || idx}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {alum.currentPosition?.[0] || "A"}
                        </div>
                        <div>
                          <h3 className="font-semibold">Alumni {idx + 1}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Class of {alum.graduationYear}
                          </p>
                        </div>
                      </div>
                      {alum.willingToMentor && (
                        <Badge className="bg-green-500">
                          <Star className="h-3 w-3 mr-1" />
                          Mentor
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <span>{alum.currentPosition}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span>{alum.currentCompany}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{alum.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        <span>{alum.degree}</span>
                      </div>
                    </div>

                    {alum.areasOfExpertise && alum.areasOfExpertise.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        {alum.areasOfExpertise.slice(0, 3).map((area: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="mentors" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlumni.filter((a: any) => a.willingToMentor).length === 0 ? (
                <Card className="col-span-full p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No mentors available at the moment</p>
                </Card>
              ) : (
                filteredAlumni
                  .filter((a: any) => a.willingToMentor)
                  .map((mentor: any, idx: number) => (
                    <Card key={mentor.id || idx} className="p-6" data-testid={`card-mentor-${mentor.id || idx}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                          M
                        </div>
                        <div>
                          <h3 className="font-semibold">Mentor {idx + 1}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {mentor.currentPosition}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                        {mentor.bio}
                      </p>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span>{mentor.currentCompany}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{mentor.location}</span>
                        </div>
                      </div>

                      {mentor.areasOfExpertise && (
                        <div className="mb-4">
                          <p className="text-xs font-medium mb-2">Areas of Expertise:</p>
                          <div className="flex flex-wrap gap-1">
                            {mentor.areasOfExpertise.map((area: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {hasRequestedMentorship(mentor.userId || mentor.id) ? (
                        <Button className="w-full" disabled size="sm">
                          Request Pending
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAlumni(mentor);
                            setMentorshipDialogOpen(true);
                          }}
                          data-testid={`button-request-${mentor.id || idx}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Request Mentorship
                        </Button>
                      )}
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="mt-6">
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Your connections will appear here</p>
              <p className="text-sm text-gray-400 mt-1">Connect with alumni to build your network</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Alumni Profile Dialog */}
      <Dialog open={!!selectedAlumni && !mentorshipDialogOpen} onOpenChange={(open) => !open && setSelectedAlumni(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alumni Profile</DialogTitle>
          </DialogHeader>
          {selectedAlumni && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                  {selectedAlumni.currentPosition?.[0] || "A"}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedAlumni.currentPosition}</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedAlumni.currentCompany} • Class of {selectedAlumni.graduationYear}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-1">About</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedAlumni.bio}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Education</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedAlumni.degree} in {selectedAlumni.major}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Location</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedAlumni.location}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Industry</h4>
                  <p className="text-gray-700 dark:text-gray-300">{selectedAlumni.industry}</p>
                </div>

                {selectedAlumni.areasOfExpertise && selectedAlumni.areasOfExpertise.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Areas of Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlumni.areasOfExpertise.map((area: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {selectedAlumni.linkedinUrl && (
                  <Button variant="outline" className="flex-1" data-testid="button-linkedin">
                    <Linkedin className="h-4 w-4 mr-2" />
                    View LinkedIn
                  </Button>
                )}
                {selectedAlumni.willingToMentor && (
                  <Button
                    className="flex-1"
                    onClick={() => setMentorshipDialogOpen(true)}
                    data-testid="button-request-mentorship"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Request Mentorship
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlumni(null)}
                  data-testid="button-close"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mentorship Request Dialog */}
      <Dialog open={mentorshipDialogOpen} onOpenChange={setMentorshipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Mentorship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Send a mentorship request to this alumni member
            </p>
            <Textarea
              placeholder="Introduce yourself and explain why you'd like mentorship..."
              value={mentorshipMessage}
              onChange={(e) => setMentorshipMessage(e.target.value)}
              rows={6}
              data-testid="textarea-message"
            />
            <div className="flex gap-3">
              <Button
                className="w-full"
                onClick={handleMentorshipRequest}
                disabled={requestMentorshipMutation.isPending}
                data-testid="button-send-request"
              >
                {requestMentorshipMutation.isPending ? "Sending..." : "Send Request"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMentorshipDialogOpen(false);
                  setMentorshipMessage("");
                }}
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