import { useEffect, useRef, useState } from "react";
import Editor, { OnMount, loader } from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export function MonacoEditor({ value, onChange, language, height = "100%" }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  useEffect(() => {
    // Configure Monaco loader to prevent potential loading issues
    loader.config({
      "vs/nls": {
        availableLanguages: {
          "*": "en",
        },
      },
    });
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    try {
      editorRef.current = editor;
      setIsEditorReady(true);

      // Configure editor settings with error handling
      editor.updateOptions({
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: "on",
        lineNumbers: "on",
        renderLineHighlight: "line",
        selectOnLineNumbers: true,
        matchBrackets: "always",
      });

      // Add custom keybindings with error handling
      try {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          console.log("Ctrl/Cmd + Enter pressed");
        });
      } catch (error) {
        console.warn("Could not add key binding:", error);
      }

      // Set up TypeScript/JavaScript IntelliSense only for JS/TS files
      try {
        if (language === 'javascript' || language === 'typescript') {
          monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
          });

          monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
          });
        }
      } catch (error) {
        console.warn("Could not configure TypeScript defaults:", error);
      }
    } catch (error) {
      console.error("Error during editor mount:", error);
      setIsEditorReady(true); // Still allow editor to function
    }
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  // Map language names to Monaco Editor language identifiers
  const getMonacoLanguage = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "javascript":
        return "javascript";
      case "python":
        return "python";
      case "java":
        return "java";
      case "cpp":
      case "c++":
        return "cpp";
      case "typescript":
        return "typescript";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "sql":
        return "sql";
      default:
        return "plaintext";
    }
  };

  // Fallback to textarea if Monaco fails to load
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <div className="h-full bg-gray-900 text-gray-300 font-mono" style={{ height }}>
        <div className="h-full p-4">
          <div className="text-green-400 text-sm mb-2">
            # {language.charAt(0).toUpperCase() + language.slice(1)} (Fallback Editor)
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-5/6 bg-transparent border border-gray-600 rounded outline-none resize-none text-sm leading-6 p-2"
            placeholder={`Write your ${language} solution here...`}
            data-testid="code-editor"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full" style={{ height }}>
      <Editor
        height={height}
        defaultLanguage="python"
        language={getMonacoLanguage(language)}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "line",
          selectOnLineNumbers: true,
          matchBrackets: "always",
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: false, // Disable to prevent potential issues
          bracketPairColorization: { enabled: true },
          suggest: {
            showKeywords: true,
            showSnippets: false, // Disable to prevent potential issues
          },
          quickSuggestions: false, // Disable to prevent potential issues
          parameterHints: {
            enabled: false, // Disable to prevent potential issues
          },
          hover: {
            enabled: true,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-300">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <p className="mt-2 text-sm">Loading editor...</p>
            </div>
          </div>
        }
        onValidate={(markers) => {
          // Handle validation errors gracefully
          if (markers.length > 0) {
            console.log("Editor validation markers:", markers);
          }
        }}
      />
    </div>
  );
}