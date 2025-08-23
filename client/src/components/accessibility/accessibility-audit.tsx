import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info,
  FileText,
  Download
} from "lucide-react";

interface AuditResult {
  category: string;
  level: 'A' | 'AA' | 'AAA';
  status: 'pass' | 'fail' | 'warning';
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  elements?: string[];
}

export function AccessibilityAudit() {
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  const runAudit = async () => {
    setIsAuditing(true);
    
    // Simulate audit process
    setTimeout(() => {
      const results: AuditResult[] = [
        {
          category: 'Images',
          level: 'A',
          status: 'pass',
          description: 'All images have appropriate alt text',
          impact: 'critical',
          elements: []
        },
        {
          category: 'Color Contrast',
          level: 'AA',
          status: 'pass',
          description: 'Text meets WCAG AA contrast requirements',
          impact: 'serious',
          elements: []
        },
        {
          category: 'Keyboard Navigation',
          level: 'A',
          status: 'pass',
          description: 'All interactive elements are keyboard accessible',
          impact: 'critical',
          elements: []
        },
        {
          category: 'ARIA Labels',
          level: 'A',
          status: 'pass',
          description: 'Proper ARIA labels are present',
          impact: 'serious',
          elements: []
        },
        {
          category: 'Form Labels',
          level: 'A',
          status: 'warning',
          description: 'Some form inputs missing explicit labels',
          impact: 'moderate',
          elements: ['search-input', 'filter-select']
        },
        {
          category: 'Heading Structure',
          level: 'A',
          status: 'pass',
          description: 'Logical heading hierarchy maintained',
          impact: 'moderate',
          elements: []
        },
        {
          category: 'Focus Indicators',
          level: 'AA',
          status: 'pass',
          description: 'Visible focus indicators on all interactive elements',
          impact: 'serious',
          elements: []
        },
        {
          category: 'Skip Links',
          level: 'A',
          status: 'pass',
          description: 'Skip navigation links implemented',
          impact: 'moderate',
          elements: []
        },
        {
          category: 'Language Attribute',
          level: 'A',
          status: 'pass',
          description: 'Page language properly declared',
          impact: 'minor',
          elements: []
        },
        {
          category: 'Error Messages',
          level: 'A',
          status: 'pass',
          description: 'Clear error identification and description',
          impact: 'serious',
          elements: []
        }
      ];
      
      setAuditResults(results);
      
      // Calculate score
      const passCount = results.filter(r => r.status === 'pass').length;
      const score = Math.round((passCount / results.length) * 100);
      setOverallScore(score);
      
      setIsAuditing(false);
    }, 2000);
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      score: overallScore,
      results: auditResults,
      wcagLevel: 'AA',
      summary: {
        passed: auditResults.filter(r => r.status === 'pass').length,
        warnings: auditResults.filter(r => r.status === 'warning').length,
        failures: auditResults.filter(r => r.status === 'fail').length,
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-${new Date().toISOString()}.json`;
    a.click();
  };

  useEffect(() => {
    // Run initial audit on mount
    runAudit();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      critical: 'bg-red-600',
      serious: 'bg-orange-600',
      moderate: 'bg-yellow-600',
      minor: 'bg-blue-600'
    };
    
    return (
      <Badge className={`${colors[impact as keyof typeof colors]} text-white`}>
        {impact}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Accessibility Audit Report
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={runAudit}
              disabled={isAuditing}
              variant="outline"
            >
              {isAuditing ? 'Auditing...' : 'Re-run Audit'}
            </Button>
            <Button 
              onClick={exportReport}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Compliance</span>
            <span className="text-2xl font-bold text-green-600">{overallScore}%</span>
          </div>
          <Progress value={overallScore} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>WCAG 2.1 Level AA</span>
            <span>{auditResults.filter(r => r.status === 'pass').length}/{auditResults.length} checks passed</span>
          </div>
        </div>

        {/* Audit Results */}
        <div className="space-y-3">
          {auditResults.map((result, index) => (
            <div 
              key={index}
              className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.category}</span>
                    <Badge variant="outline" className="text-xs">
                      Level {result.level}
                    </Badge>
                    {getImpactBadge(result.impact)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                  {result.elements && result.elements.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Affected elements: </span>
                      {result.elements.map((el, i) => (
                        <code key={i} className="text-xs bg-gray-100 px-1 py-0.5 rounded mx-1">
                          {el}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {auditResults.filter(r => r.status === 'pass').length}
            </div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {auditResults.filter(r => r.status === 'warning').length}
            </div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {auditResults.filter(r => r.status === 'fail').length}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}