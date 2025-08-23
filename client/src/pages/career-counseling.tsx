import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, Video, Users, FileText, Star, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function CareerCounseling() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedType, setSelectedType] = useState("general");
  const [counselorId, setCounselorId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  // Fetch user's counseling sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: [`/api/career/counseling/user/${userId}`],
  });

  // Fetch available counselors (mock data for now)
  const counselors = [
    { id: 2, name: "Dr. Sarah Johnson", specialty: "Career Planning", rating: 4.8 },
    { id: 3, name: "Prof. Michael Chen", specialty: "Tech Industry", rating: 4.9 },
    { id: 4, name: "Ms. Emily Rodriguez", specialty: "Resume & Interview", rating: 4.7 },
    { id: 5, name: "Mr. David Kim", specialty: "Startup & Entrepreneurship", rating: 4.6 },
  ];

  // Schedule counseling mutation
  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/career/counseling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to schedule session");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Scheduled",
        description: "Your counseling session has been scheduled successfully!",
      });
      setScheduleDialogOpen(false);
      setNotes("");
      setCounselorId(null);
      queryClient.invalidateQueries({ queryKey: [`/api/career/counseling/user/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule your session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const response = await fetch(`/api/career/counseling/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update session");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Updated",
        description: "Your session has been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/career/counseling/user/${userId}`] });
    },
  });

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime || !counselorId) {
      toast({
        title: "Missing Information",
        description: "Please select date, time, and counselor.",
        variant: "destructive",
      });
      return;
    }

    const scheduledDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":");
    scheduledDate.setHours(parseInt(hours), parseInt(minutes));

    scheduleMutation.mutate({
      studentId: userId,
      counselorId,
      scheduledDate: scheduledDate.toISOString(),
      type: selectedType,
      duration: 60,
      notes,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "no-show":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "career-planning":
        return <FileText className="h-4 w-4" />;
      case "resume-review":
        return <FileText className="h-4 w-4" />;
      case "mock-interview":
        return <Video className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const upcomingSessions = sessions.filter(
    (s: any) => new Date(s.scheduledDate) >= new Date() && s.status === "scheduled"
  );
  const pastSessions = sessions.filter(
    (s: any) => new Date(s.scheduledDate) < new Date() || s.status !== "scheduled"
  );

  // Available time slots
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4" data-testid="text-page-title">
            Career Counseling
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Schedule one-on-one sessions with career advisors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">My Sessions</h2>
                <Button onClick={() => setScheduleDialogOpen(true)} data-testid="button-schedule-session">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Session
                </Button>
              </div>

              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past Sessions</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="space-y-4">
                  {isLoading ? (
                    <p className="text-center text-gray-500 py-8">Loading sessions...</p>
                  ) : upcomingSessions.length === 0 ? (
                    <Card className="p-8 text-center bg-gray-50 dark:bg-gray-800">
                      <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No upcoming sessions scheduled</p>
                      <p className="text-sm text-gray-400 mt-1">Book a session to get career guidance</p>
                    </Card>
                  ) : (
                    upcomingSessions.map((session: any) => {
                      const counselor = counselors.find(c => c.id === session.counselorId);
                      return (
                        <Card key={session.id} className="p-5" data-testid={`card-session-${session.id}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getSessionTypeIcon(session.type)}
                                <div>
                                  <h3 className="font-semibold capitalize">
                                    {session.type.replace("-", " ")} Session
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    with {counselor?.name || "Counselor"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(new Date(session.scheduledDate), "MMM d, yyyy")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(session.scheduledDate), "h:mm a")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {session.duration} min
                                </span>
                              </div>
                              {session.meetingUrl && (
                                <div className="mt-3">
                                  <Button size="sm" variant="outline" data-testid={`button-join-${session.id}`}>
                                    <Video className="h-3 w-3 mr-1" />
                                    Join Meeting
                                  </Button>
                                </div>
                              )}
                              {session.notes && (
                                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                  Notes: {session.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getStatusColor(session.status)}>
                                {session.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500"
                                onClick={() => updateSessionMutation.mutate({ id: session.id, status: "cancelled" })}
                                data-testid={`button-cancel-${session.id}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="past" className="space-y-4">
                  {pastSessions.length === 0 ? (
                    <Card className="p-8 text-center bg-gray-50 dark:bg-gray-800">
                      <p className="text-gray-500">No past sessions</p>
                    </Card>
                  ) : (
                    pastSessions.map((session: any) => {
                      const counselor = counselors.find(c => c.id === session.counselorId);
                      return (
                        <Card key={session.id} className="p-5">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getSessionTypeIcon(session.type)}
                                <div>
                                  <h3 className="font-semibold capitalize">
                                    {session.type.replace("-", " ")} Session
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    with {counselor?.name || "Counselor"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(new Date(session.scheduledDate), "MMM d, yyyy")}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(session.scheduledDate), "h:mm a")}
                                </span>
                              </div>
                              {session.feedback && (
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                  <p className="text-sm font-medium mb-1">Counselor Feedback:</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300">{session.feedback}</p>
                                </div>
                              )}
                            </div>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </Card>

            {/* Available Counselors */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Our Career Counselors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {counselors.map((counselor) => (
                  <Card key={counselor.id} className="p-4" data-testid={`card-counselor-${counselor.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{counselor.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{counselor.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{counselor.rating}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">Session Types</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">General Counseling</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Discuss your career goals and get personalized advice
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Resume Review</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get expert feedback on your resume and cover letter
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Mock Interview</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Practice interviews and receive constructive feedback
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Career Planning</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create a roadmap for your career progression
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Tips for Your Session</h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Prepare questions in advance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Bring your resume and portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Be specific about your goals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Take notes during the session</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Follow up on action items</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Career Counseling Session</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Session Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-session-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Counseling</SelectItem>
                    <SelectItem value="career-planning">Career Planning</SelectItem>
                    <SelectItem value="resume-review">Resume Review</SelectItem>
                    <SelectItem value="mock-interview">Mock Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Counselor</label>
                <Select value={counselorId?.toString()} onValueChange={(v) => setCounselorId(Number(v))}>
                  <SelectTrigger data-testid="select-counselor">
                    <SelectValue placeholder="Choose a counselor" />
                  </SelectTrigger>
                  <SelectContent>
                    {counselors.map((counselor) => (
                      <SelectItem key={counselor.id} value={counselor.id.toString()}>
                        {counselor.name} - {counselor.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Time</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger data-testid="select-time">
                    <SelectValue placeholder="Choose a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                <Textarea
                  placeholder="Any specific topics or questions you'd like to discuss..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              className="w-full"
              onClick={handleSchedule}
              disabled={scheduleMutation.isPending}
              data-testid="button-confirm-schedule"
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule Session"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              data-testid="button-cancel-schedule"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}