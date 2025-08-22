import { useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export function MonacoEditor({ value, onChange, language, height = "100%" }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor settings
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
      theme: "vs-dark"
    });

    // Add custom keybindings for common actions
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // This could trigger code execution
      console.log("Ctrl/Cmd + Enter pressed - could trigger code execution");
    });

    // Set up auto-completion and IntelliSense based on language
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
    });
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
          fontLigatures: true,
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
          bracketPairColorization: { enabled: true },
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: true,
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          parameterHints: {
            enabled: true,
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
      />
    </div>
  );
}