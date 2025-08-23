import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, Video, Building2, Ticket, Search, Filter, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function CareerEvents() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  // Fetch upcoming events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/career/events"],
  });

  // Fetch user's registrations
  const { data: registrations = [] } = useQuery({
    queryKey: [`/api/career/events/user/${userId}/registrations`],
  });

  // Register for event mutation
  const registerMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch("/api/career/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, userId }),
      });
      if (!response.ok) throw new Error("Failed to register");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "You've been registered for the event!",
      });
      setRegistrationDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/career/events/user/${userId}/registrations`] });
    },
    onError: () => {
      toast({
        title: "Registration Failed",
        description: "Failed to register for the event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter events
  const filteredEvents = events.filter((event: any) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.presenter?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || event.type === filterType;
    return matchesSearch && matchesType;
  });

  const isRegistered = (eventId: number) => {
    return registrations.some((reg: any) => reg.eventId === eventId);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "workshop":
        return "bg-blue-500";
      case "career-fair":
        return "bg-green-500";
      case "info-session":
        return "bg-purple-500";
      case "networking":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "workshop":
        return <Users className="h-4 w-4" />;
      case "career-fair":
        return <Building2 className="h-4 w-4" />;
      case "info-session":
        return <Video className="h-4 w-4" />;
      case "networking":
        return <Users className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const upcomingEvents = filteredEvents.filter((e: any) => new Date(e.date) >= new Date());
  const registeredEvents = events.filter((e: any) => isRegistered(e.id) && new Date(e.date) >= new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-purple-600 mb-4" data-testid="text-page-title">
            Career Events & Workshops
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Discover career fairs, workshops, and networking opportunities</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events, workshops, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
                data-testid="button-filter-all"
              >
                All Events
              </Button>
              <Button
                variant={filterType === "workshop" ? "default" : "outline"}
                onClick={() => setFilterType("workshop")}
                data-testid="button-filter-workshop"
              >
                Workshops
              </Button>
              <Button
                variant={filterType === "career-fair" ? "default" : "outline"}
                onClick={() => setFilterType("career-fair")}
                data-testid="button-filter-fair"
              >
                Career Fairs
              </Button>
              <Button
                variant={filterType === "networking" ? "default" : "outline"}
                onClick={() => setFilterType("networking")}
                data-testid="button-filter-networking"
              >
                Networking
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="registered">My Registrations</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsLoading ? (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-gray-500">Loading events...</p>
                </Card>
              ) : upcomingEvents.length === 0 ? (
                <Card className="col-span-full p-8 text-center">
                  <p className="text-gray-500">No upcoming events found</p>
                </Card>
              ) : (
                upcomingEvents.map((event: any) => (
                  <Card
                    key={event.id}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                    data-testid={`card-event-${event.id}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <Badge className={getEventTypeColor(event.type)}>
                        {getEventTypeIcon(event.type)}
                        <span className="ml-1 capitalize">{event.type.replace("-", " ")}</span>
                      </Badge>
                      {isRegistered(event.id) && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-2" data-testid={`text-event-title-${event.id}`}>
                      {event.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(event.date), "h:mm a")}</span>
                        {event.duration && <span>({event.duration} min)</span>}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                      {event.isVirtual && (
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          <span>Virtual Event</span>
                        </div>
                      )}
                      {event.maxAttendees && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Limited to {event.maxAttendees} attendees</span>
                        </div>
                      )}
                    </div>
                    {event.presenter && (
                      <p className="mt-3 text-sm font-medium">
                        Presented by: {event.presenter}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="registered" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registeredEvents.length === 0 ? (
                <Card className="col-span-full p-8 text-center">
                  <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">You haven't registered for any events yet</p>
                  <p className="text-sm text-gray-400 mt-1">Browse upcoming events to find opportunities</p>
                </Card>
              ) : (
                registeredEvents.map((event: any) => {
                  const registration = registrations.find((r: any) => r.eventId === event.id);
                  return (
                    <Card key={event.id} className="p-6" data-testid={`card-registered-${event.id}`}>
                      <div className="flex justify-between items-start mb-4">
                        <Badge className={getEventTypeColor(event.type)}>
                          {getEventTypeIcon(event.type)}
                          <span className="ml-1 capitalize">{event.type.replace("-", " ")}</span>
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Registered
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(event.date), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(event.date), "h:mm a")}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                      </div>
                      {event.isVirtual && event.meetingUrl && (
                        <Button size="sm" className="w-full mt-4" data-testid={`button-join-${event.id}`}>
                          <Video className="h-4 w-4 mr-2" />
                          Join Virtual Event
                        </Button>
                      )}
                      {registration?.attended && (
                        <Badge className="mt-3 bg-green-500">
                          Attended
                        </Badge>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent && !registrationDialogOpen} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              <Badge className={getEventTypeColor(selectedEvent?.type || "")}>
                {selectedEvent?.type.replace("-", " ")}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-4">
              <p className="text-gray-700 dark:text-gray-300">{selectedEvent.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span>{format(new Date(selectedEvent.date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span>{format(new Date(selectedEvent.date), "h:mm a")}</span>
                  {selectedEvent.duration && <span>({selectedEvent.duration} minutes)</span>}
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.isVirtual && (
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-gray-500" />
                    <span>This is a virtual event</span>
                  </div>
                )}
                {selectedEvent.presenter && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span>Presented by: {selectedEvent.presenter}</span>
                  </div>
                )}
                {selectedEvent.maxAttendees && (
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-gray-500" />
                    <span>Limited to {selectedEvent.maxAttendees} attendees</span>
                  </div>
                )}
              </div>

              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.registrationDeadline && new Date(selectedEvent.registrationDeadline) > new Date() && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Registration closes on {format(new Date(selectedEvent.registrationDeadline), "MMM d, yyyy")}
                </p>
              )}

              <div className="flex gap-3">
                {isRegistered(selectedEvent.id) ? (
                  <Button className="w-full" disabled>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Already Registered
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setRegistrationDialogOpen(true);
                    }}
                    data-testid="button-register"
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Register for Event
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                  data-testid="button-close"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registration Confirmation Dialog */}
      <Dialog open={registrationDialogOpen} onOpenChange={setRegistrationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Registration</DialogTitle>
            <DialogDescription>
              Are you sure you want to register for "{selectedEvent?.title}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              className="w-full"
              onClick={() => {
                if (selectedEvent) {
                  registerMutation.mutate(selectedEvent.id);
                }
              }}
              disabled={registerMutation.isPending}
              data-testid="button-confirm-registration"
            >
              {registerMutation.isPending ? "Registering..." : "Confirm Registration"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRegistrationDialogOpen(false)}
              data-testid="button-cancel-registration"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}