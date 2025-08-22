import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export function CodeEditor({ value, onChange, language, height = "100%" }: CodeEditorProps) {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef<any>(null);

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

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Configure editor settings
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, 'Courier New', monospace",
      lineHeight: 21,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: false,
      renderLineHighlight: 'line',
      renderWhitespace: 'boundary',
      bracketPairColorization: { enabled: true },
      guides: {
        indentation: true,
        bracketPairs: true
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showIssues: true,
        showUsers: true,
        showWords: true
      }
    });

    // Configure theme
    monaco.editor.defineTheme('vscode-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'namespace', foreground: '4EC9B0' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'struct', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'interface', foreground: '4EC9B0' },
        { token: 'enum', foreground: '4EC9B0' },
        { token: 'typeParameter', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'method', foreground: 'DCDCAA' },
        { token: 'decorator', foreground: 'C586C0' },
        { token: 'macro', foreground: 'C586C0' }
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#2a2d30'
      }
    });

    monaco.editor.setTheme('vscode-dark-custom');

    // Focus the editor
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
        {!isEditorReady && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
              <div className="text-sm text-gray-400">Loading Editor...</div>
            </div>
          </div>
        )}
        
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          loading={<div />}
          theme="vscode-dark-custom"
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            glyphMargin: false,
            folding: true,
            lineNumbers: 'on',
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              arrowSize: 30,
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 14,
              horizontalScrollbarSize: 14
            },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorMergeOverlapping: true,
            wordBasedSuggestions: true,
            wordBasedSuggestionsOnlySameLanguage: false,
            acceptSuggestionOnEnter: 'on',
            acceptSuggestionOnCommitCharacter: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false
            },
            quickSuggestionsDelay: 100,
            parameterHints: {
              enabled: true
            },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'advanced',
            formatOnPaste: true,
            formatOnType: true
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