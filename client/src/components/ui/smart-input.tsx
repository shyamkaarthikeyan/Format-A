import React, { useState, useRef, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => string | null;
  };
  showValidation?: boolean;
  debounceMs?: number;
}

export default function SmartInput({
  suggestions = [],
  onSuggestionSelect,
  validation,
  showValidation = true,
  debounceMs = 300,
  className,
  value,
  onChange,
  onBlur,
  ...props
}: SmartInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  const inputValue = value as string || '';

  // Debounced validation
  useEffect(() => {
    if (!validation || !hasBeenTouched) return;

    const timeoutId = setTimeout(() => {
      validateInput(inputValue);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [inputValue, validation, hasBeenTouched, debounceMs]);

  // Handle suggestions
  useEffect(() => {
    if (suggestions.length === 0 || !inputValue) {
      setShowSuggestions(false);
      return;
    }

    const filtered = suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      suggestion.toLowerCase() !== inputValue.toLowerCase()
    );

    if (filtered.length > 0) {
      setFilteredSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions]);

  const validateInput = (val: string) => {
    if (!validation) {
      setIsValid(null);
      setValidationError(null);
      return;
    }

    // Required validation
    if (validation.required && !val.trim()) {
      setIsValid(false);
      setValidationError('This field is required');
      return;
    }

    // Min length validation
    if (validation.minLength && val.length < validation.minLength) {
      setIsValid(false);
      setValidationError(`Minimum ${validation.minLength} characters required`);
      return;
    }

    // Max length validation
    if (validation.maxLength && val.length > validation.maxLength) {
      setIsValid(false);
      setValidationError(`Maximum ${validation.maxLength} characters allowed`);
      return;
    }

    // Pattern validation
    if (validation.pattern && val && !validation.pattern.test(val)) {
      setIsValid(false);
      setValidationError('Invalid format');
      return;
    }

    // Custom validation
    if (validation.custom) {
      const customError = validation.custom(val);
      if (customError) {
        setIsValid(false);
        setValidationError(customError);
        return;
      }
    }

    // All validations passed
    setIsValid(true);
    setValidationError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasBeenTouched(true);
    setTimeout(() => setShowSuggestions(false), 150); // Delay to allow suggestion clicks
    onBlur?.(e);
  };

  const handleFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    const syntheticEvent = {
      target: { value: suggestion },
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange?.(syntheticEvent);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const getInputClassName = () => {
    let baseClass = cn(
      'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
      className
    );

    if (showValidation && hasBeenTouched) {
      if (isValid === true) {
        baseClass = cn(baseClass, 'border-green-500 focus-visible:ring-green-500');
      } else if (isValid === false) {
        baseClass = cn(baseClass, 'border-red-500 focus-visible:ring-red-500');
      }
    }

    return baseClass;
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={getInputClassName()}
          {...props}
        />

        {/* Validation Icons */}
        {showValidation && hasBeenTouched && isValid !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>

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
              onMouseDown={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Validation Error */}
      {showValidation && validationError && hasBeenTouched && (
        <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {validationError}
        </div>
      )}
    </div>
  );
}