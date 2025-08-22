import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export function CodeEditor({ value, onChange, language, height = "100%" }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  // Suppress ResizeObserver errors which are harmless but annoying
  useEffect(() => {
    const errorHandler = (e: ErrorEvent) => {
      if (e.message?.includes('ResizeObserver')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', errorHandler, true);
    
    return () => {
      window.removeEventListener('error', errorHandler, true);
    };
  }, []);

  // Map our language names to Monaco language identifiers
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: { [key: string]: string } = {
      'python': 'python',
      'javascript': 'javascript',
      'java': 'java',
      'cpp': 'cpp',
      'c++': 'cpp',
      'typescript': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'markdown': 'markdown'
    };
    return languageMap[lang.toLowerCase()] || 'plaintext';
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col border border-gray-700 rounded-lg overflow-hidden" style={{ height }}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-green-400 flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            {language.charAt(0).toUpperCase() + language.slice(1)}
          </div>
          <div className="text-xs text-gray-500 flex items-center space-x-3">
            <span>Monaco Editor</span>
            <span>UTF-8</span>
            <span>Ln {value.split('\n').length}</span>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-400">Loading Editor...</div>
            </div>
          }
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineHeight: 21,
            selectOnLineNumbers: true,
            readOnly: false,
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'advanced',
            formatOnPaste: false,
            formatOnType: false
          }}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span>UTF-8</span>
            <span>Monaco Editor</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Spaces: 2</span>
            <span>{getMonacoLanguage(language)}</span>
            <span className="text-green-400">● Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}