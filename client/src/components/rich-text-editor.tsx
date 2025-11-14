import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered } from 'lucide-react';

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
  const [isActive, setIsActive] = useState({ 
    bold: false, 
    italic: false, 
    underline: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    bulletList: false,
    numberedList: false
  });

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
      underline: document.queryCommandState('underline'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      alignJustify: document.queryCommandState('justifyFull'),
      bulletList: document.queryCommandState('insertUnorderedList'),
      numberedList: document.queryCommandState('insertOrderedList')
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
  const executeCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    document.execCommand(command, false, value || '');
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
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
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

        {/* Alignment */}
        <div className="flex items-center gap-1 px-2 border-r border-gray-300">
          <Button
            type="button"
            variant={isActive.alignLeft ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeCommand('justifyLeft')}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant={isActive.alignCenter ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeCommand('justifyCenter')}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant={isActive.alignRight ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeCommand('justifyRight')}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant={isActive.alignJustify ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeCommand('justifyFull')}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 pl-2">
          <Button
            type="button"
            variant={isActive.bulletList ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeCommand('insertUnorderedList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant={isActive.numberedList ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => executeCommand('insertOrderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
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