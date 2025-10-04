import React, { useState } from 'react';
import { AlertTriangle, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from './enhanced-button';
import { EnhancedCard } from './enhanced-card';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requiresTyping?: string; // Text that must be typed to confirm
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  requiresTyping,
  isLoading = false,
}: ConfirmationDialogProps) {
  const [typedText, setTypedText] = useState('');

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <Save className="w-6 h-6 text-blue-600" />;
    }
  };

  const getColorClasses = () => {
    switch (variant) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          button: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const colors = getColorClasses();
  const canConfirm = requiresTyping ? typedText === requiresTyping : true;

  const handleConfirm = () => {
    if (canConfirm && !isLoading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setTypedText('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <EnhancedCard
        variant="elevated"
        className={cn(
          'relative w-full max-w-md mx-4 animate-in zoom-in-95 duration-200',
          colors.bg,
          colors.border
        )}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
              colors.bg
            )}>
              {getIcon()}
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            </div>
          </div>

          {/* Typing confirmation */}
          {requiresTyping && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type "{requiresTyping}" to confirm:
              </label>
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={requiresTyping}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <EnhancedButton
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
            >
              {cancelText}
            </EnhancedButton>
            
            <EnhancedButton
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              loading={isLoading}
              className={cn(
                'text-white',
                colors.button
              )}
            >
              {confirmText}
            </EnhancedButton>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
}

// Hook for easier usage
export function useConfirmation() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    props: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (props: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose' | 'onConfirm'>) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        props,
        resolve,
      });
    });
  };

  const handleClose = () => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  };

  const handleConfirm = () => {
    if (dialog) {
      dialog.resolve(true);
      setDialog(null);
    }
  };

  const ConfirmationComponent = dialog ? (
    <ConfirmationDialog
      {...dialog.props}
      isOpen={dialog.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
    />
  ) : null;

  return { confirm, ConfirmationComponent };
}