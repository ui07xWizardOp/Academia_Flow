import { useEffect, useRef, useState } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export function CodeEditor({ value, onChange, language, height = "100%" }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    
    // Handle tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start === end) {
        // Single cursor - insert tab
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      } else {
        // Multiple lines selected - indent all
        const lines = value.split('\n');
        let lineStart = 0;
        let startLine = 0;
        let endLine = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const lineEnd = lineStart + lines[i].length;
          if (lineStart <= start && start <= lineEnd) startLine = i;
          if (lineStart <= end && end <= lineEnd) endLine = i;
          lineStart = lineEnd + 1;
        }
        
        if (e.shiftKey) {
          // Unindent
          for (let i = startLine; i <= endLine; i++) {
            lines[i] = lines[i].replace(/^  /, '');
          }
        } else {
          // Indent
          for (let i = startLine; i <= endLine; i++) {
            lines[i] = '  ' + lines[i];
          }
        }
        
        onChange(lines.join('\n'));
      }
    }
    
    // Handle auto-indentation on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      
      // Check if we need extra indent
      let needsExtraIndent = false;
      if (language === 'python' && currentLine.trim().endsWith(':')) {
        needsExtraIndent = true;
      } else if (['javascript', 'java', 'cpp'].includes(language)) {
        if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith('[')) {
          needsExtraIndent = true;
        }
      }
      
      const newIndent = needsExtraIndent ? indent + '  ' : indent;
      const newValue = value.substring(0, start) + '\n' + newIndent + value.substring(start);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
      }, 0);
    }
    
    // Handle bracket/quote auto-closing
    const autoCloseMap: { [key: string]: string } = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    };
    
    if (autoCloseMap[e.key]) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const closeChar = autoCloseMap[e.key];
      
      if (start === end) {
        // No selection - add pair
        const newValue = value.substring(0, start) + e.key + closeChar + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      } else {
        // Wrap selection
        const newValue = value.substring(0, start) + e.key + value.substring(start, end) + closeChar + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
        }, 0);
      }
    }
  };

  const getSyntaxHighlighting = () => {
    // Basic syntax highlighting styles based on language
    const keywords: { [key: string]: string[] } = {
      python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'pass', 'break', 'continue', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is'],
      javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'import', 'export', 'from', 'class', 'extends', 'new', 'this', 'true', 'false', 'null', 'undefined', 'async', 'await', 'try', 'catch', 'finally'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'if', 'else', 'for', 'while', 'return', 'import', 'package', 'new', 'this', 'static', 'final', 'void', 'int', 'String', 'boolean', 'true', 'false', 'null'],
      cpp: ['class', 'public', 'private', 'protected', 'if', 'else', 'for', 'while', 'return', 'include', 'using', 'namespace', 'std', 'int', 'void', 'bool', 'true', 'false', 'new', 'delete', 'this', 'const', 'static']
    };
    
    return keywords[language] || [];
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col" style={{ height }}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-green-400">
            {language.charAt(0).toUpperCase() + language.slice(1)}
          </div>
          <div className="text-xs text-gray-500">
            Ln {value.substring(0, textareaRef.current?.selectionStart || 0).split('\n').length}, 
            Col {(value.substring(0, textareaRef.current?.selectionStart || 0).split('\n').pop()?.length || 0) + 1}
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div 
          ref={lineNumbersRef}
          className="bg-gray-850 text-gray-500 text-right select-none overflow-hidden"
          style={{ 
            width: '50px',
            fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
            fontSize: '14px',
            lineHeight: '21px',
            paddingTop: '12px',
            paddingRight: '12px'
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ height: '21px' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            className="absolute inset-0 w-full h-full bg-transparent text-gray-100 outline-none resize-none"
            style={{
              fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
              fontSize: '14px',
              lineHeight: '21px',
              padding: '12px',
              tabSize: 2,
            }}
            placeholder={`Write your ${language} code here...`}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            data-testid="code-editor-textarea"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>UTF-8</div>
          <div className="flex items-center space-x-4">
            <span>Spaces: 2</span>
            <span>{language}</span>
          </div>
        </div>
      </div>
    </div>
  );
}