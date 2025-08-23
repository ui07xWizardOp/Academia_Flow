import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Edit, Trash2, Plus, Star, Eye, Copy, Save, Mail, Phone, Globe, Linkedin, Github, MapPin } from "lucide-react";
import { format } from "date-fns";

interface ResumeContent {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
    github?: string;
    summary: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    location: string;
    graduationDate: string;
    gpa?: string;
    relevantCourses?: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  achievements: string[];
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const [selectedResume, setSelectedResume] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("professional");
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  const [resumeContent, setResumeContent] = useState<ResumeContent>({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      github: "",
      summary: "",
    },
    experience: [],
    education: [],
    skills: {
      technical: [],
      soft: [],
      languages: [],
    },
    projects: [],
    certifications: [],
    achievements: [],
  });

  // Fetch user's resumes
  const { data: resumes = [], isLoading } = useQuery({
    queryKey: [`/api/career/resumes/user/${userId}`],
  });

  // Create resume mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/career/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create resume");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resume Created",
        description: "Your resume has been created successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/career/resumes/user/${userId}`] });
    },
  });

  // Update resume mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const response = await fetch(`/api/career/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update resume");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resume Updated",
        description: "Your resume has been updated successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [`/api/career/resumes/user/${userId}`] });
    },
  });

  // Delete resume mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/career/resumes/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete resume");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resume Deleted",
        description: "Your resume has been deleted successfully!",
      });
      setSelectedResume(null);
      queryClient.invalidateQueries({ queryKey: [`/api/career/resumes/user/${userId}`] });
    },
  });

  // Set default resume mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (resumeId: number) => {
      const response = await fetch("/api/career/resumes/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resumeId }),
      });
      if (!response.ok) throw new Error("Failed to set default resume");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Default Resume Set",
        description: "Your default resume has been updated!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/career/resumes/user/${userId}`] });
    },
  });

  useEffect(() => {
    if (selectedResume) {
      setResumeContent(selectedResume.content);
      setSelectedTemplate(selectedResume.template);
    }
  }, [selectedResume]);

  const handleSave = () => {
    const data = {
      userId,
      title: resumeContent.personalInfo.name + " - Resume",
      template: selectedTemplate,
      content: resumeContent,
    };

    if (selectedResume) {
      updateMutation.mutate({ id: selectedResume.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addExperience = () => {
    setResumeContent({
      ...resumeContent,
      experience: [
        ...resumeContent.experience,
        {
          title: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          description: "",
        },
      ],
    });
  };

  const addEducation = () => {
    setResumeContent({
      ...resumeContent,
      education: [
        ...resumeContent.education,
        {
          degree: "",
          school: "",
          location: "",
          graduationDate: "",
          gpa: "",
          relevantCourses: "",
        },
      ],
    });
  };

  const addProject = () => {
    setResumeContent({
      ...resumeContent,
      projects: [
        ...resumeContent.projects,
        {
          name: "",
          description: "",
          technologies: [],
          link: "",
        },
      ],
    });
  };

  const downloadResume = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(resumeContent, null, 2)], { type: "application/json" });
    element.href = URL.createObjectURL(file);
    element.download = `${resumeContent.personalInfo.name}_resume.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const ResumePreview = () => (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b pb-4 mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {resumeContent.personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
          {resumeContent.personalInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {resumeContent.personalInfo.email}
            </span>
          )}
          {resumeContent.personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {resumeContent.personalInfo.phone}
            </span>
          )}
          {resumeContent.personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {resumeContent.personalInfo.location}
            </span>
          )}
          {resumeContent.personalInfo.linkedin && (
            <span className="flex items-center gap-1">
              <Linkedin className="h-3 w-3" />
              {resumeContent.personalInfo.linkedin}
            </span>
          )}
          {resumeContent.personalInfo.github && (
            <span className="flex items-center gap-1">
              <Github className="h-3 w-3" />
              {resumeContent.personalInfo.github}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {resumeContent.personalInfo.summary && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Professional Summary</h2>
          <p className="text-gray-700 dark:text-gray-300">{resumeContent.personalInfo.summary}</p>
        </div>
      )}

      {/* Experience */}
      {resumeContent.experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Experience</h2>
          {resumeContent.experience.map((exp, idx) => (
            <div key={idx} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-medium">{exp.title} at {exp.company}</h3>
                <span className="text-sm text-gray-500">
                  {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{exp.location}</p>
              <p className="mt-1 text-gray-700 dark:text-gray-300">{exp.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {resumeContent.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Education</h2>
          {resumeContent.education.map((edu, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between">
                <h3 className="font-medium">{edu.degree}</h3>
                <span className="text-sm text-gray-500">{edu.graduationDate}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{edu.school}, {edu.location}</p>
              {edu.gpa && <p className="text-sm">GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {(resumeContent.skills.technical.length > 0 || 
        resumeContent.skills.soft.length > 0 || 
        resumeContent.skills.languages.length > 0) && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Skills</h2>
          {resumeContent.skills.technical.length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Technical: </span>
              {resumeContent.skills.technical.join(", ")}
            </div>
          )}
          {resumeContent.skills.soft.length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Soft Skills: </span>
              {resumeContent.skills.soft.join(", ")}
            </div>
          )}
          {resumeContent.skills.languages.length > 0 && (
            <div>
              <span className="font-medium">Languages: </span>
              {resumeContent.skills.languages.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Projects */}
      {resumeContent.projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Projects</h2>
          {resumeContent.projects.map((project, idx) => (
            <div key={idx} className="mb-3">
              <h3 className="font-medium">{project.name}</h3>
              <p className="text-gray-700 dark:text-gray-300">{project.description}</p>
              {project.technologies.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Technologies: {project.technologies.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4" data-testid="text-page-title">
            Resume Builder
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Create professional resumes with our easy-to-use builder</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resume List */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">My Resumes</h2>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedResume(null);
                    setIsEditing(true);
                    setResumeContent({
                      personalInfo: {
                        name: "",
                        email: "",
                        phone: "",
                        location: "",
                        website: "",
                        linkedin: "",
                        github: "",
                        summary: "",
                      },
                      experience: [],
                      education: [],
                      skills: {
                        technical: [],
                        soft: [],
                        languages: [],
                      },
                      projects: [],
                      certifications: [],
                      achievements: [],
                    });
                  }}
                  data-testid="button-new-resume"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Resume
                </Button>
              </div>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-gray-500">Loading resumes...</p>
                ) : resumes.length === 0 ? (
                  <p className="text-gray-500">No resumes yet. Create your first one!</p>
                ) : (
                  resumes.map((resume: any) => (
                    <Card
                      key={resume.id}
                      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                        selectedResume?.id === resume.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedResume(resume)}
                      data-testid={`card-resume-${resume.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{resume.title}</h3>
                          <p className="text-sm text-gray-500">
                            {format(new Date(resume.updatedAt), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Template: {resume.template}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {resume.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Resume Editor/Preview */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Edit Resume</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} data-testid="button-save-resume">
                      <Save className="h-4 w-4 mr-1" />
                      Save Resume
                    </Button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger data-testid="select-template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <Input
                          value={resumeContent.personalInfo.name}
                          onChange={(e) =>
                            setResumeContent({
                              ...resumeContent,
                              personalInfo: { ...resumeContent.personalInfo, name: e.target.value },
                            })
                          }
                          placeholder="John Doe"
                          data-testid="input-name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <Input
                          value={resumeContent.personalInfo.email}
                          onChange={(e) =>
                            setResumeContent({
                              ...resumeContent,
                              personalInfo: { ...resumeContent.personalInfo, email: e.target.value },
                            })
                          }
                          placeholder="john@example.com"
                          data-testid="input-email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <Input
                          value={resumeContent.personalInfo.phone}
                          onChange={(e) =>
                            setResumeContent({
                              ...resumeContent,
                              personalInfo: { ...resumeContent.personalInfo, phone: e.target.value },
                            })
                          }
                          placeholder="+1 (555) 123-4567"
                          data-testid="input-phone"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <Input
                          value={resumeContent.personalInfo.location}
                          onChange={(e) =>
                            setResumeContent({
                              ...resumeContent,
                              personalInfo: { ...resumeContent.personalInfo, location: e.target.value },
                            })
                          }
                          placeholder="New York, NY"
                          data-testid="input-location"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">LinkedIn</label>
                        <Input
                          value={resumeContent.personalInfo.linkedin}
                          onChange={(e) =>
                            setResumeContent({
                              ...resumeContent,
                              personalInfo: { ...resumeContent.personalInfo, linkedin: e.target.value },
                            })
                          }
                          placeholder="linkedin.com/in/johndoe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">GitHub</label>
                        <Input
                          value={resumeContent.personalInfo.github}
                          onChange={(e) =>
                            setResumeContent({
                              ...resumeContent,
                              personalInfo: { ...resumeContent.personalInfo, github: e.target.value },
                            })
                          }
                          placeholder="github.com/johndoe"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Professional Summary</label>
                      <Textarea
                        value={resumeContent.personalInfo.summary}
                        onChange={(e) =>
                          setResumeContent({
                            ...resumeContent,
                            personalInfo: { ...resumeContent.personalInfo, summary: e.target.value },
                          })
                        }
                        placeholder="Brief summary of your professional background and goals..."
                        rows={4}
                        data-testid="textarea-summary"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="experience" className="space-y-4">
                    <Button onClick={addExperience} variant="outline" className="w-full" data-testid="button-add-experience">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Experience
                    </Button>
                    {resumeContent.experience.map((exp, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Job Title</label>
                            <Input
                              value={exp.title}
                              onChange={(e) => {
                                const newExp = [...resumeContent.experience];
                                newExp[idx].title = e.target.value;
                                setResumeContent({ ...resumeContent, experience: newExp });
                              }}
                              placeholder="Software Engineer"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Company</label>
                            <Input
                              value={exp.company}
                              onChange={(e) => {
                                const newExp = [...resumeContent.experience];
                                newExp[idx].company = e.target.value;
                                setResumeContent({ ...resumeContent, experience: newExp });
                              }}
                              placeholder="Tech Company"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <Textarea
                            value={exp.description}
                            onChange={(e) => {
                              const newExp = [...resumeContent.experience];
                              newExp[idx].description = e.target.value;
                              setResumeContent({ ...resumeContent, experience: newExp });
                            }}
                            placeholder="Describe your responsibilities and achievements..."
                            rows={3}
                          />
                        </div>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="education" className="space-y-4">
                    <Button onClick={addEducation} variant="outline" className="w-full" data-testid="button-add-education">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Education
                    </Button>
                    {resumeContent.education.map((edu, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Degree</label>
                            <Input
                              value={edu.degree}
                              onChange={(e) => {
                                const newEdu = [...resumeContent.education];
                                newEdu[idx].degree = e.target.value;
                                setResumeContent({ ...resumeContent, education: newEdu });
                              }}
                              placeholder="Bachelor of Science in Computer Science"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">School</label>
                            <Input
                              value={edu.school}
                              onChange={(e) => {
                                const newEdu = [...resumeContent.education];
                                newEdu[idx].school = e.target.value;
                                setResumeContent({ ...resumeContent, education: newEdu });
                              }}
                              placeholder="University Name"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="skills" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Technical Skills</label>
                      <Input
                        value={resumeContent.skills.technical.join(", ")}
                        onChange={(e) =>
                          setResumeContent({
                            ...resumeContent,
                            skills: {
                              ...resumeContent.skills,
                              technical: e.target.value.split(",").map(s => s.trim()).filter(s => s),
                            },
                          })
                        }
                        placeholder="JavaScript, React, Node.js, Python..."
                        data-testid="input-technical-skills"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Soft Skills</label>
                      <Input
                        value={resumeContent.skills.soft.join(", ")}
                        onChange={(e) =>
                          setResumeContent({
                            ...resumeContent,
                            skills: {
                              ...resumeContent.skills,
                              soft: e.target.value.split(",").map(s => s.trim()).filter(s => s),
                            },
                          })
                        }
                        placeholder="Leadership, Communication, Problem Solving..."
                        data-testid="input-soft-skills"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Languages</label>
                      <Input
                        value={resumeContent.skills.languages.join(", ")}
                        onChange={(e) =>
                          setResumeContent({
                            ...resumeContent,
                            skills: {
                              ...resumeContent.skills,
                              languages: e.target.value.split(",").map(s => s.trim()).filter(s => s),
                            },
                          })
                        }
                        placeholder="English (Native), Spanish (Fluent)..."
                        data-testid="input-languages"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="projects" className="space-y-4">
                    <Button onClick={addProject} variant="outline" className="w-full" data-testid="button-add-project">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Project
                    </Button>
                    {resumeContent.projects.map((project, idx) => (
                      <Card key={idx} className="p-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Project Name</label>
                          <Input
                            value={project.name}
                            onChange={(e) => {
                              const newProjects = [...resumeContent.projects];
                              newProjects[idx].name = e.target.value;
                              setResumeContent({ ...resumeContent, projects: newProjects });
                            }}
                            placeholder="E-commerce Platform"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <Textarea
                            value={project.description}
                            onChange={(e) => {
                              const newProjects = [...resumeContent.projects];
                              newProjects[idx].description = e.target.value;
                              setResumeContent({ ...resumeContent, projects: newProjects });
                            }}
                            placeholder="Describe the project and your contributions..."
                            rows={3}
                          />
                        </div>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </Card>
            ) : selectedResume ? (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Resume Preview</h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDefaultMutation.mutate(selectedResume.id)}
                      data-testid="button-set-default"
                    >
                      <Star className={`h-4 w-4 mr-1 ${selectedResume.isDefault ? "fill-current" : ""}`} />
                      Set Default
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadResume}
                      data-testid="button-download"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteMutation.mutate(selectedResume.id)}
                      className="text-red-500"
                      data-testid="button-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
                <ResumePreview />
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Resume Selected</h2>
                <p className="text-gray-500 mb-4">Select a resume from the list or create a new one to get started.</p>
                <Button onClick={() => setIsEditing(true)} data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Your First Resume
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}