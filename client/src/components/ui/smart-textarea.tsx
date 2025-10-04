import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoExpand?: boolean;
  minHeight?: number;
  maxHeight?: number;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  showWordCount?: boolean;
  showCharCount?: boolean;
}

export default function SmartTextarea({
  autoExpand = true,
  minHeight = 80,
  maxHeight = 400,
  suggestions = [],
  onSuggestionSelect,
  showWordCount = false,
  showCharCount = false,
  className,
  value,
  onChange,
  ...props
}: SmartTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textValue = value as string || '';
  const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;
  const charCount = textValue.length;

  // Auto-expand functionality
  useEffect(() => {
    if (autoExpand && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [textValue, autoExpand, minHeight, maxHeight]);

  // Handle suggestions
  useEffect(() => {
    if (suggestions.length === 0) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textValue;
    const cursorPos = textarea.selectionStart || 0;
    
    // Find the current word being typed
    const beforeCursor = text.substring(0, cursorPos);
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || '';

    if (currentWord.length >= 2) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(currentWord.toLowerCase())
      );
      
      if (filtered.length > 0) {
        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(-1);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [textValue, cursorPosition, suggestions]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.target.selectionStart || 0);
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          if (selectedSuggestionIndex >= 0) {
            e.preventDefault();
            selectSuggestion(filteredSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    }

    props.onKeyDown?.(e);
  };

  const selectSuggestion = (suggestion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textValue;
    const cursorPos = textarea.selectionStart || 0;
    
    // Find the current word being typed
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || '';
    
    // Replace the current word with the suggestion
    const beforeCurrentWord = beforeCursor.substring(0, beforeCursor.length - currentWord.length);
    const newText = beforeCurrentWord + suggestion + afterCursor;
    
    // Create a synthetic event
    const syntheticEvent = {
      target: { value: newText },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    onChange?.(syntheticEvent);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeCurrentWord.length + suggestion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200',
          autoExpand && 'overflow-hidden',
          className
        )}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: autoExpand ? `${maxHeight}px` : undefined,
        }}
        {...props}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors',
                index === selectedSuggestionIndex && 'bg-purple-100 text-purple-700'
              )}
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Word/Character Count */}
      {(showWordCount || showCharCount) && (
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
          <div className="flex gap-4">
            {showWordCount && (
              <span>{wordCount} words</span>
            )}
            {showCharCount && (
              <span>{charCount} characters</span>
            )}
          </div>
          
          {showSuggestions && (
            <span className="text-purple-600">
              Press ↑↓ to navigate, Enter to select
            </span>
          )}
        </div>
      )}
    </div>
  );
}