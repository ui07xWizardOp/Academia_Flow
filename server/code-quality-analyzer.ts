interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  duplicatedLines: number;
  commentRatio: number;
}

interface QualityIssue {
  type: 'error' | 'warning' | 'info' | 'style';
  severity: 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  column?: number;
  category: 'performance' | 'maintainability' | 'reliability' | 'security' | 'style';
  suggestion: string;
}

interface CodeQualityReport {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: CodeMetrics;
  issues: QualityIssue[];
  strengths: string[];
  recommendations: string[];
  comparison: {
    betterThan: number; // percentage of submissions
    similarTo: string[]; // common patterns
    improvementPotential: number; // estimated score improvement
  };
  bestPractices: {
    category: string;
    achieved: boolean;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }[];
}

export class CodeQualityAnalyzer {
  
  async analyzeCode(code: string, language: string, problemId?: number): Promise<CodeQualityReport> {
    const metrics = this.calculateMetrics(code, language);
    const issues = this.detectIssues(code, language);
    const bestPractices = this.evaluateBestPractices(code, language);
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(metrics, issues, bestPractices);
    const grade = this.assignGrade(overallScore);
    
    // Generate insights
    const strengths = this.identifyStrengths(metrics, issues, bestPractices);
    const recommendations = this.generateRecommendations(issues, metrics, bestPractices);
    
    // Comparison with other submissions (mock data)
    const comparison = await this.generateComparison(overallScore, language, problemId);

    return {
      overallScore,
      grade,
      metrics,
      issues,
      strengths,
      recommendations,
      comparison,
      bestPractices
    };
  }

  private calculateMetrics(code: string, language: string): CodeMetrics {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const commentLines = lines.filter(line => this.isComment(line, language));
    
    return {
      linesOfCode: nonEmptyLines.length,
      cyclomaticComplexity: this.calculateCyclomaticComplexity(code, language),
      cognitiveComplexity: this.calculateCognitiveComplexity(code, language),
      maintainabilityIndex: this.calculateMaintainabilityIndex(code, language),
      duplicatedLines: this.detectDuplicatedLines(lines),
      commentRatio: commentLines.length / Math.max(nonEmptyLines.length, 1) * 100
    };
  }

  private detectIssues(code: string, language: string): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const lines = code.split('\n');

    // Generic issues across languages
    issues.push(...this.detectGenericIssues(code, lines));

    // Language-specific issues
    switch (language.toLowerCase()) {
      case 'python':
        issues.push(...this.detectPythonIssues(code, lines));
        break;
      case 'javascript':
        issues.push(...this.detectJavaScriptIssues(code, lines));
        break;
      case 'java':
        issues.push(...this.detectJavaIssues(code, lines));
        break;
      case 'cpp':
      case 'c++':
        issues.push(...this.detectCppIssues(code, lines));
        break;
    }

    return issues;
  }

  private detectGenericIssues(code: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Long functions
    if (lines.length > 50) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Function is too long and may be difficult to maintain',
        category: 'maintainability',
        suggestion: 'Consider breaking this function into smaller, more focused functions'
      });
    }

    // Magic numbers
    const magicNumberPattern = /\b(?!0|1)\d{2,}\b/g;
    lines.forEach((line, index) => {
      const matches = line.match(magicNumberPattern);
      if (matches && !this.isComment(line, 'generic')) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: `Magic number found: ${matches[0]}`,
          line: index + 1,
          category: 'maintainability',
          suggestion: 'Consider defining this as a named constant'
        });
      }
    });

    // Long lines
    lines.forEach((line, index) => {
      if (line.length > 100) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: 'Line is too long',
          line: index + 1,
          category: 'style',
          suggestion: 'Break long lines for better readability'
        });
      }
    });

    // TODO/FIXME comments
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes('todo') || line.toLowerCase().includes('fixme')) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: 'TODO/FIXME comment found',
          line: index + 1,
          category: 'maintainability',
          suggestion: 'Address TODO/FIXME comments before finalizing code'
        });
      }
    });

    return issues;
  }

  private detectPythonIssues(code: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // PEP 8 style issues
    lines.forEach((line, index) => {
      // Mixed tabs and spaces
      if (line.includes('\t') && line.includes('    ')) {
        issues.push({
          type: 'error',
          severity: 'high',
          message: 'Mixed tabs and spaces for indentation',
          line: index + 1,
          category: 'style',
          suggestion: 'Use consistent indentation (preferably 4 spaces)'
        });
      }

      // Missing space after comma
      if (/,\S/.test(line) && !this.isComment(line, 'python')) {
        issues.push({
          type: 'warning',
          severity: 'low',
          message: 'Missing space after comma',
          line: index + 1,
          category: 'style',
          suggestion: 'Add space after commas for better readability'
        });
      }
    });

    // Unused imports (basic detection)
    const importLines = lines.filter(line => line.trim().startsWith('import ') || line.trim().startsWith('from '));
    importLines.forEach((importLine, index) => {
      const module = importLine.match(/import (\w+)/)?.[1];
      if (module && !code.includes(module) && !importLine.includes('*')) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: `Unused import: ${module}`,
          category: 'maintainability',
          suggestion: 'Remove unused imports to clean up code'
        });
      }
    });

    // List comprehension opportunity
    if (/for .+ in .+:\s*\w+\.append/.test(code)) {
      issues.push({
        type: 'info',
        severity: 'low',
        message: 'Consider using list comprehension',
        category: 'performance',
        suggestion: 'List comprehensions are often more readable and performant'
      });
    }

    return issues;
  }

  private detectJavaScriptIssues(code: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // var instead of let/const
    lines.forEach((line, index) => {
      if (/\bvar\b/.test(line) && !this.isComment(line, 'javascript')) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: 'Use let or const instead of var',
          line: index + 1,
          category: 'reliability',
          suggestion: 'Use let for mutable variables and const for constants'
        });
      }
    });

    // == instead of ===
    lines.forEach((line, index) => {
      if (/[^=!]==(?!=)/.test(line) && !this.isComment(line, 'javascript')) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: 'Use strict equality (===) instead of loose equality (==)',
          line: index + 1,
          category: 'reliability',
          suggestion: 'Strict equality avoids type coercion issues'
        });
      }
    });

    // Console.log statements
    lines.forEach((line, index) => {
      if (/console\.log/.test(line) && !this.isComment(line, 'javascript')) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: 'Console.log statement found',
          line: index + 1,
          category: 'maintainability',
          suggestion: 'Remove console.log statements in production code'
        });
      }
    });

    return issues;
  }

  private detectJavaIssues(code: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Missing access modifiers
    lines.forEach((line, index) => {
      if (/^\s*(class|interface)\s+\w+/.test(line)) {
        if (!/(public|private|protected)/.test(line)) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            message: 'Consider explicit access modifier',
            line: index + 1,
            category: 'maintainability',
            suggestion: 'Use explicit access modifiers for better code clarity'
          });
        }
      }
    });

    // Raw types
    if (/(ArrayList|HashMap|HashSet)\s*[^<]/.test(code)) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Use of raw types detected',
        category: 'reliability',
        suggestion: 'Use generics for type safety'
      });
    }

    // String concatenation in loops
    if (/for.*\{[\s\S]*\+\s*=[\s\S]*String/.test(code)) {
      issues.push({
        type: 'warning',
        severity: 'high',
        message: 'String concatenation in loop detected',
        category: 'performance',
        suggestion: 'Use StringBuilder for efficient string concatenation in loops'
      });
    }

    return issues;
  }

  private detectCppIssues(code: string, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Memory management
    lines.forEach((line, index) => {
      if (/\bnew\b/.test(line) && !this.isComment(line, 'cpp')) {
        if (!code.includes('delete')) {
          issues.push({
            type: 'error',
            severity: 'high',
            message: 'Potential memory leak - new without delete',
            line: index + 1,
            category: 'reliability',
            suggestion: 'Ensure every new has a corresponding delete, or use smart pointers'
          });
        }
      }
    });

    // Using namespace std
    if (/using namespace std/.test(code)) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Avoid "using namespace std" in global scope',
        category: 'maintainability',
        suggestion: 'Use specific using declarations or std:: prefix'
      });
    }

    // C-style arrays
    lines.forEach((line, index) => {
      if (/\w+\s*\[\s*\d*\s*\]/.test(line) && !this.isComment(line, 'cpp')) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: 'Consider using std::array or std::vector instead of C-style arrays',
          line: index + 1,
          category: 'reliability',
          suggestion: 'STL containers provide better safety and functionality'
        });
      }
    });

    return issues;
  }

  private evaluateBestPractices(code: string, language: string): { category: string; achieved: boolean; description: string; impact: 'high' | 'medium' | 'low' }[] {
    const practices = [
      {
        category: 'Naming Conventions',
        achieved: this.hasGoodNaming(code, language),
        description: 'Uses clear, descriptive variable and function names',
        impact: 'high' as const
      },
      {
        category: 'Function Size',
        achieved: this.hasAppropriateFunction(code),
        description: 'Functions are appropriately sized (under 30 lines)',
        impact: 'medium' as const
      },
      {
        category: 'Comments',
        achieved: this.hasAppropriateComments(code, language),
        description: 'Code includes helpful comments where needed',
        impact: 'medium' as const
      },
      {
        category: 'Error Handling',
        achieved: this.hasErrorHandling(code, language),
        description: 'Includes appropriate error handling',
        impact: 'high' as const
      },
      {
        category: 'Code Reuse',
        achieved: this.avoidsCodeDuplication(code),
        description: 'Avoids code duplication through reusable functions',
        impact: 'medium' as const
      }
    ];

    return practices;
  }

  private calculateOverallScore(metrics: CodeMetrics, issues: QualityIssue[], bestPractices: { achieved: boolean; impact: string }[]): number {
    let score = 100;

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= issue.type === 'error' ? 15 : 10;
          break;
        case 'medium':
          score -= issue.type === 'error' ? 8 : 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Deduct points for poor metrics
    if (metrics.cyclomaticComplexity > 15) score -= 10;
    if (metrics.linesOfCode > 100) score -= 5;
    if (metrics.duplicatedLines > 0) score -= metrics.duplicatedLines * 2;

    // Deduct points for missing best practices
    bestPractices.forEach(practice => {
      if (!practice.achieved) {
        switch (practice.impact) {
          case 'high': score -= 8; break;
          case 'medium': score -= 5; break;
          case 'low': score -= 2; break;
        }
      }
    });

    return Math.max(0, Math.round(score));
  }

  private assignGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private identifyStrengths(metrics: CodeMetrics, issues: QualityIssue[], bestPractices: { category: string; achieved: boolean }[]): string[] {
    const strengths = [];

    if (metrics.linesOfCode <= 50) strengths.push('Concise and focused code');
    if (metrics.cyclomaticComplexity <= 10) strengths.push('Good code complexity management');
    if (metrics.commentRatio > 10) strengths.push('Well-documented code');
    if (issues.filter(i => i.severity === 'high').length === 0) strengths.push('No critical issues found');
    
    bestPractices.forEach(practice => {
      if (practice.achieved) {
        strengths.push(`Follows ${practice.category.toLowerCase()} best practices`);
      }
    });

    return strengths.slice(0, 5); // Limit to top 5 strengths
  }

  private generateRecommendations(issues: QualityIssue[], metrics: CodeMetrics, bestPractices: { category: string; achieved: boolean; description: string }[]): string[] {
    const recommendations = [];

    // Priority recommendations from high-severity issues
    const highSeverityIssues = issues.filter(i => i.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push(`Address ${highSeverityIssues.length} critical issue(s) immediately`);
    }

    // Metric-based recommendations
    if (metrics.cyclomaticComplexity > 15) {
      recommendations.push('Reduce function complexity by breaking into smaller functions');
    }
    if (metrics.commentRatio < 5) {
      recommendations.push('Add more comments to explain complex logic');
    }
    if (metrics.duplicatedLines > 0) {
      recommendations.push('Eliminate code duplication through refactoring');
    }

    // Best practice recommendations
    bestPractices.forEach(practice => {
      if (!practice.achieved) {
        recommendations.push(`Improve ${practice.category.toLowerCase()}: ${practice.description}`);
      }
    });

    return recommendations.slice(0, 6); // Limit to top 6 recommendations
  }

  private async generateComparison(score: number, language: string, problemId?: number) {
    // Mock comparison data - in real implementation, this would query actual submission data
    return {
      betterThan: Math.min(95, Math.max(5, score + Math.floor(Math.random() * 20) - 10)),
      similarTo: [
        'Clean variable naming patterns',
        'Appropriate use of functions',
        'Similar complexity level'
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      improvementPotential: Math.min(15, 100 - score)
    };
  }

  // Helper methods for analysis
  private isComment(line: string, language: string): boolean {
    const trimmed = line.trim();
    switch (language.toLowerCase()) {
      case 'python':
        return trimmed.startsWith('#');
      case 'javascript':
      case 'java':
      case 'cpp':
      case 'c++':
        return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.includes('*/');
      default:
        return trimmed.startsWith('#') || trimmed.startsWith('//');
    }
  }

  private calculateCyclomaticComplexity(code: string, language: string): number {
    // Simplified cyclomatic complexity calculation
    const controlStructures = ['if', 'else', 'for', 'while', 'case', 'catch', 'and', 'or'];
    let complexity = 1; // Base complexity

    controlStructures.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateCognitiveComplexity(code: string, language: string): number {
    // Simplified cognitive complexity - counts nesting levels
    let complexity = 0;
    let nestingLevel = 0;
    const lines = code.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Increase nesting for control structures
      if (/^\s*(if|for|while|try|catch|switch)\b/.test(trimmed)) {
        complexity += (nestingLevel + 1);
        nestingLevel++;
      }
      
      // Decrease nesting for closing braces
      if (trimmed === '}' || (language === 'python' && line.length - line.trimStart().length < nestingLevel * 4)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
    });

    return complexity;
  }

  private calculateMaintainabilityIndex(code: string, language: string): number {
    const loc = code.split('\n').filter(line => line.trim().length > 0).length;
    const complexity = this.calculateCyclomaticComplexity(code, language);
    
    // Simplified maintainability index formula
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(loc) - 0.23 * complexity - 16.2 * Math.log(loc/10));
    return Math.round(maintainabilityIndex);
  }

  private detectDuplicatedLines(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicates = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 10) { // Only check meaningful lines
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count === 1) duplicates++; // First duplicate occurrence
      }
    });

    return duplicates;
  }

  private hasGoodNaming(code: string, language: string): boolean {
    // Check for descriptive variable names (basic heuristic)
    const variables = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    const shortNames = variables.filter(v => v.length <= 2 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(v));
    return shortNames.length / Math.max(variables.length, 1) < 0.3;
  }

  private hasAppropriateFunction(code: string): boolean {
    const functionLines = code.split('\n');
    return functionLines.length <= 30;
  }

  private hasAppropriateComments(code: string, language: string): boolean {
    const lines = code.split('\n');
    const commentLines = lines.filter(line => this.isComment(line, language));
    const codeLines = lines.filter(line => line.trim().length > 0 && !this.isComment(line, language));
    
    // Appropriate comment ratio: 5-20%
    const commentRatio = commentLines.length / Math.max(codeLines.length, 1);
    return commentRatio >= 0.05 && commentRatio <= 0.5;
  }

  private hasErrorHandling(code: string, language: string): boolean {
    const errorKeywords = ['try', 'catch', 'except', 'finally', 'throw', 'raise', 'error'];
    return errorKeywords.some(keyword => code.toLowerCase().includes(keyword));
  }

  private avoidsCodeDuplication(code: string): boolean {
    return this.detectDuplicatedLines(code.split('\n')) < 3;
  }
}

export const codeQualityAnalyzer = new CodeQualityAnalyzer();