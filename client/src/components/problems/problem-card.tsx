import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";

interface ProblemCardProps {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  status?: "completed" | "attempted" | "not_attempted";
  onSolve: (id: number) => void;
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
};

const statusIcons = {
  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
  attempted: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  not_attempted: <Circle className="w-4 h-4 text-gray-300" />,
};

export function ProblemCard({ 
  id, 
  title, 
  description, 
  difficulty, 
  topics, 
  status = "not_attempted",
  onSolve 
}: ProblemCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-shrink-0">
              {statusIcons[status]}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900" data-testid={`problem-title-${id}`}>
                {title}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={difficultyColors[difficulty]} variant="secondary">
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Badge>
                <div className="flex flex-wrap gap-1">
                  {topics.slice(0, 3).map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {topics.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{topics.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => onSolve(id)}
            variant={status === "completed" ? "outline" : "default"}
            size="sm"
            data-testid={`button-solve-${id}`}
          >
            {status === "completed" ? "Review" : status === "attempted" ? "Continue" : "Solve"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
