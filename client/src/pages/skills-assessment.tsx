import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Brain, Target, CheckCircle, AlertCircle, TrendingUp, Award, BarChart, FileText } from "lucide-react";
import { format } from "date-fns";

interface Question {
  id: number;
  text: string;
  options: string[];
  category: string;
}

interface AssessmentResult {
  category: string;
  score: number;
  level: string;
}

export default function SkillsAssessment() {
  const { toast } = useToast();
  const [currentAssessment, setCurrentAssessment] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const userId = JSON.parse(localStorage.getItem("user") || "{}").id || 1;

  // Fetch user's assessments
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: [`/api/career/assessments/user/${userId}`],
  });

  // Submit assessment mutation
  const submitAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/career/assessments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Assessment Complete",
        description: "Your assessment has been submitted successfully!",
      });
      setCurrentAssessment(null);
      setCurrentQuestionIndex(0);
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: [`/api/career/assessments/user/${userId}`] });
    },
  });

  // Mock assessment questions
  const technicalQuestions: Question[] = [
    {
      id: 1,
      text: "How would you rate your proficiency in data structures and algorithms?",
      options: ["Beginner", "Intermediate", "Advanced", "Expert"],
      category: "Problem Solving",
    },
    {
      id: 2,
      text: "Which programming paradigm are you most comfortable with?",
      options: ["Object-Oriented", "Functional", "Procedural", "All equally"],
      category: "Programming",
    },
    {
      id: 3,
      text: "How experienced are you with version control systems like Git?",
      options: ["Never used", "Basic commands", "Comfortable", "Advanced user"],
      category: "Tools",
    },
    {
      id: 4,
      text: "How would you rate your database design skills?",
      options: ["No experience", "Basic understanding", "Can design schemas", "Expert level"],
      category: "Database",
    },
    {
      id: 5,
      text: "What's your experience level with cloud platforms (AWS, Azure, GCP)?",
      options: ["No experience", "Basic knowledge", "Have deployed apps", "Certified/Expert"],
      category: "Cloud",
    },
  ];

  const softSkillsQuestions: Question[] = [
    {
      id: 1,
      text: "How comfortable are you presenting technical concepts to non-technical audiences?",
      options: ["Very uncomfortable", "Somewhat uncomfortable", "Comfortable", "Very comfortable"],
      category: "Communication",
    },
    {
      id: 2,
      text: "How do you typically approach team conflicts?",
      options: ["Avoid them", "Seek help from others", "Address directly", "Mediate and resolve"],
      category: "Teamwork",
    },
    {
      id: 3,
      text: "How would you describe your time management skills?",
      options: ["Need improvement", "Average", "Good", "Excellent"],
      category: "Organization",
    },
    {
      id: 4,
      text: "How comfortable are you with leading a project or team?",
      options: ["Not comfortable", "Somewhat comfortable", "Comfortable", "Very comfortable"],
      category: "Leadership",
    },
    {
      id: 5,
      text: "How do you handle feedback and criticism?",
      options: ["Take it personally", "Accept reluctantly", "Welcome it", "Actively seek it"],
      category: "Growth Mindset",
    },
  ];

  const personalityQuestions: Question[] = [
    {
      id: 1,
      text: "What type of work environment do you prefer?",
      options: ["Solo work", "Small team", "Large team", "Flexible/Hybrid"],
      category: "Work Style",
    },
    {
      id: 2,
      text: "How do you approach learning new technologies?",
      options: ["Structured courses", "Documentation", "Hands-on practice", "Mix of all"],
      category: "Learning Style",
    },
    {
      id: 3,
      text: "What motivates you most in your career?",
      options: ["Financial rewards", "Technical challenges", "Impact on society", "Work-life balance"],
      category: "Motivation",
    },
    {
      id: 4,
      text: "How do you handle stress and deadlines?",
      options: ["Get stressed easily", "Manage with effort", "Handle well", "Thrive under pressure"],
      category: "Stress Management",
    },
    {
      id: 5,
      text: "What's your preferred career path?",
      options: ["Technical specialist", "Management", "Entrepreneurship", "Consultant/Freelance"],
      category: "Career Goals",
    },
  ];

  const getQuestions = (type: string) => {
    switch (type) {
      case "technical":
        return technicalQuestions;
      case "soft-skills":
        return softSkillsQuestions;
      case "personality":
        return personalityQuestions;
      default:
        return [];
    }
  };

  const currentQuestions = currentAssessment ? getQuestions(currentAssessment) : [];
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const progress = currentAssessment ? ((currentQuestionIndex + 1) / currentQuestions.length) * 100 : 0;

  const handleNextQuestion = () => {
    if (selectedAnswer) {
      setAnswers({ ...answers, [currentQuestion.id]: selectedAnswer });
      
      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer("");
      } else {
        // Submit assessment
        submitAssessment();
      }
    }
  };

  const submitAssessment = () => {
    const results = calculateResults();
    submitAssessmentMutation.mutate({
      userId,
      assessmentType: currentAssessment,
      results,
      strengths: results.filter(r => r.score >= 75).map(r => r.category),
      areasForImprovement: results.filter(r => r.score < 50).map(r => r.category),
      recommendations: generateRecommendations(results),
    });
  };

  const calculateResults = (): AssessmentResult[] => {
    const categoryScores: Record<string, number[]> = {};
    
    currentQuestions.forEach((q) => {
      const answer = answers[q.id];
      const score = q.options.indexOf(answer) * (100 / (q.options.length - 1));
      if (!categoryScores[q.category]) {
        categoryScores[q.category] = [];
      }
      categoryScores[q.category].push(score);
    });

    return Object.entries(categoryScores).map(([category, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        category,
        score: Math.round(avgScore),
        level: avgScore >= 75 ? "Advanced" : avgScore >= 50 ? "Intermediate" : "Beginner",
      };
    });
  };

  const generateRecommendations = (results: AssessmentResult[]): string[] => {
    const recommendations: string[] = [];
    
    results.forEach((r) => {
      if (r.score < 50) {
        recommendations.push(`Focus on improving ${r.category} skills through courses and practice`);
      } else if (r.score < 75) {
        recommendations.push(`Continue developing ${r.category} to reach advanced level`);
      } else {
        recommendations.push(`Consider mentoring others in ${r.category}`);
      }
    });

    return recommendations;
  };

  const getAssessmentTypeIcon = (type: string) => {
    switch (type) {
      case "technical":
        return <Brain className="h-5 w-5" />;
      case "soft-skills":
        return <Target className="h-5 w-5" />;
      case "personality":
        return <Award className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4" data-testid="text-page-title">
            Skills Assessment
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Evaluate your skills and identify areas for growth</p>
        </div>

        {currentAssessment ? (
          // Assessment in progress
          <Card className="max-w-3xl mx-auto p-8">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold capitalize">
                  {currentAssessment.replace("-", " ")} Assessment
                </h2>
                <span className="text-sm text-gray-500">
                  Question {currentQuestionIndex + 1} of {currentQuestions.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">{currentQuestion?.text}</h3>
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {currentQuestion?.options.map((option, idx) => (
                  <div key={idx} className="flex items-center space-x-2 mb-3">
                    <RadioGroupItem value={option} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="cursor-pointer flex-1">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentAssessment(null);
                  setCurrentQuestionIndex(0);
                  setAnswers({});
                }}
                data-testid="button-cancel"
              >
                Cancel Assessment
              </Button>
              <Button
                onClick={handleNextQuestion}
                disabled={!selectedAnswer}
                data-testid="button-next"
              >
                {currentQuestionIndex < currentQuestions.length - 1 ? "Next Question" : "Submit Assessment"}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Assessment selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setCurrentAssessment("technical")}
                data-testid="card-technical-assessment"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Brain className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Technical Skills</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Assess your programming, problem-solving, and technical knowledge
                </p>
                <Button className="w-full">Start Assessment</Button>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setCurrentAssessment("soft-skills")}
                data-testid="card-soft-skills-assessment"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Soft Skills</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Evaluate communication, teamwork, and professional skills
                </p>
                <Button className="w-full">Start Assessment</Button>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setCurrentAssessment("personality")}
                data-testid="card-personality-assessment"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Career Personality</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Discover your work style, motivations, and career preferences
                </p>
                <Button className="w-full">Start Assessment</Button>
              </Card>
            </div>

            {/* Previous assessments */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Assessment History</h2>
              {isLoading ? (
                <p className="text-gray-500">Loading assessments...</p>
              ) : assessments.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">No assessments completed yet</p>
                  <p className="text-sm text-gray-400 mt-1">Take an assessment to see your results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment: any) => (
                    <Card key={assessment.id} className="p-4" data-testid={`card-assessment-${assessment.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getAssessmentTypeIcon(assessment.assessmentType)}
                            <h3 className="font-semibold capitalize">
                              {assessment.assessmentType.replace("-", " ")} Assessment
                            </h3>
                            <Badge variant="outline">
                              {format(new Date(assessment.completedAt), "MMM d, yyyy")}
                            </Badge>
                          </div>
                          
                          {assessment.results && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                              {(assessment.results as AssessmentResult[]).map((result, idx) => (
                                <div key={idx} className="text-center">
                                  <p className="text-xs text-gray-500 mb-1">{result.category}</p>
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-lg font-semibold">{result.score}%</span>
                                    <Badge
                                      variant={result.level === "Advanced" ? "default" : result.level === "Intermediate" ? "secondary" : "outline"}
                                      className="text-xs"
                                    >
                                      {result.level}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {assessment.strengths && assessment.strengths.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-1">Strengths:</p>
                              <div className="flex flex-wrap gap-1">
                                {assessment.strengths.map((strength: string, idx: number) => (
                                  <Badge key={idx} className="bg-green-100 text-green-700">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {strength}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {assessment.areasForImprovement && assessment.areasForImprovement.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-1">Areas for Improvement:</p>
                              <div className="flex flex-wrap gap-1">
                                {assessment.areasForImprovement.map((area: string, idx: number) => (
                                  <Badge key={idx} className="bg-orange-100 text-orange-700">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" data-testid={`button-view-${assessment.id}`}>
                          <TrendingUp className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}