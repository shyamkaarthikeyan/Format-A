import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXEquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  equationNumber?: number;
}

export default function LaTeXEquationEditor({ 
  value, 
  onChange, 
  equationNumber 
}: LaTeXEquationEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Render LaTeX preview
  useEffect(() => {
    if (!previewRef.current || !value) {
      setError(null);
      return;
    }

    try {
      // Clear previous content
      previewRef.current.innerHTML = '';
      
      // Render LaTeX
      katex.render(value, previewRef.current, {
        displayMode: true,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false,
        trust: false,
        macros: {
          "\\f": "#1f(#2)"
        }
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid LaTeX syntax');
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-gray-600">
          Equation Content (LaTeX Format)
        </label>

        {/* LaTeX Input */}
        <Textarea
          rows={3}
          placeholder="Type LaTeX equation here. Example: E = mc^2 or \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          style={{ fontFamily: 'monospace' }}
        />

        {/* Help Text */}
        {equationNumber !== undefined && (
          <div className="text-xs text-gray-500">
            Will be numbered as ({equationNumber})
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className="border border-gray-300 rounded-md p-2 bg-white min-h-[60px]">
        <div className="text-xs font-medium text-gray-600 mb-1">Preview:</div>
        {value ? (
          <div className="flex items-center justify-center">
            <div 
              ref={previewRef} 
              className="text-center"
              style={{ fontSize: '1em' }}
            />
            {equationNumber !== undefined && (
              <span className="ml-3 text-gray-600 text-sm">({equationNumber})</span>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 text-xs italic">
            Type LaTeX to see preview
          </div>
        )}
        {error && (
          <div className="mt-1 text-xs text-red-600">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
