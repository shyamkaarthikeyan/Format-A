import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter text content", 
  rows = 4,
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState({ bold: false, italic: false, underline: false });

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Update button states based on current selection
  const updateButtonStates = useCallback(() => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    setIsActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    });
  }, []);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    onChange(content);
    updateButtonStates();
  }, [onChange, updateButtonStates]);

  // Handle key events for button state updates
  const handleKeyUp = useCallback(() => {
    updateButtonStates();
  }, [updateButtonStates]);

  // Handle mouse events for button state updates
  const handleMouseUp = useCallback(() => {
    updateButtonStates();
  }, [updateButtonStates]);

  // Execute formatting commands
  const executeCommand = useCallback((command: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    document.execCommand(command, false, '');
    updateButtonStates();
    handleInput(); // Trigger onChange after formatting
  }, [handleInput, updateButtonStates]);

  // Handle paste events to clean up formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <Button
          type="button"
          variant={isActive.bold ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={isActive.italic ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant={isActive.underline ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand('underline')}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={`p-3 min-h-[${rows * 1.5}rem] max-h-40 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        style={{ minHeight: `${rows * 1.5}rem` }}
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />

      {/* Placeholder styling */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
        }
        [contenteditable]:focus:before {
          content: '';
        }
      `}</style>
    </div>
  );
}