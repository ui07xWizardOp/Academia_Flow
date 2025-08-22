import { useEffect, useRef } from "react";

interface SimpleCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export function SimpleCodeEditor({ value, onChange, language, height = "100%" }: SimpleCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    
    // Handle tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
    
    // Handle auto-indentation on Enter
    if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      
      // Add extra indent for certain characters
      const needsExtraIndent = /[{(\[]$/.test(currentLine.trim()) || 
                              /:\s*$/.test(currentLine.trim());
      const newIndent = needsExtraIndent ? indent + '  ' : indent;
      
      setTimeout(() => {
        const newStart = start + 1 + newIndent.length;
        onChange(
          value.substring(0, start) + '\n' + newIndent + value.substring(start)
        );
        textarea.selectionStart = textarea.selectionEnd = newStart;
      }, 0);
    }
  };

  const getLanguageComment = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return '# Python';
      case 'javascript':
        return '// JavaScript';
      case 'java':
        return '// Java';
      case 'cpp':
      case 'c++':
        return '// C++';
      default:
        return `// ${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    }
  };

  const getPlaceholder = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return 'def solution():\n    # Write your Python solution here\n    pass';
      case 'javascript':
        return 'function solution() {\n    // Write your JavaScript solution here\n}';
      case 'java':
        return 'public class Solution {\n    public void solution() {\n        // Write your Java solution here\n    }\n}';
      case 'cpp':
      case 'c++':
        return 'class Solution {\npublic:\n    void solution() {\n        // Write your C++ solution here\n    }\n};';
      default:
        return `Write your ${lang} solution here...`;
    }
  };

  return (
    <div 
      className="h-full bg-gray-900 text-gray-300 font-mono flex flex-col" 
      style={{ height }}
    >
      {/* Header with language indicator */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-green-400">
            {getLanguageComment(language)}
          </div>
          <div className="text-xs text-gray-500">
            Lines: {value.split('\n').length} | Characters: {value.length}
          </div>
        </div>
      </div>

      {/* Code editor area */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent border-0 outline-none resize-none text-sm leading-6 p-4 font-mono"
          placeholder={value ? undefined : getPlaceholder(language)}
          style={{
            minHeight: '100%',
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: '14px',
            lineHeight: '1.5',
            tabSize: 2,
          }}
          spellCheck={false}
          data-testid="code-editor"
        />
        
        {/* Line numbers overlay */}
        <div className="absolute left-0 top-0 w-12 h-full bg-gray-800 border-r border-gray-700 pointer-events-none">
          <div className="p-4 text-xs text-gray-500 select-none">
            {value.split('\n').map((_, index) => (
              <div key={index} className="h-6 leading-6 text-right pr-2">
                {index + 1}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content area with left margin for line numbers */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .code-editor textarea {
              padding-left: 3.5rem !important;
            }
          `
        }} />
      </div>

      {/* Footer with helpful shortcuts */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-1">
        <div className="text-xs text-gray-500">
          Tab: Indent | Ctrl+A: Select All | Ctrl+Enter: Run Code
        </div>
      </div>
    </div>
  );
}