import React, { useState, useEffect } from 'react';
import { CheckCircle, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MigrationNotificationProps {
  onClose?: () => void;
}

const MigrationNotification: React.FC<MigrationNotificationProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const handleDocumentMigrated = (event: CustomEvent) => {
      setDocumentId(event.detail.documentId);
      setIsVisible(true);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        handleClose();
      }, 10000);
    };

    // Listen for document migration events
    window.addEventListener('document-migrated', handleDocumentMigrated as EventListener);

    return () => {
      window.removeEventListener('document-migrated', handleDocumentMigrated as EventListener);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Document Saved Successfully!
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Your guest document has been automatically saved to your account. 
              You can now access it from any device.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <FileText className="w-3 h-3" />
              <span>Document ID: {documentId?.slice(-8) || 'Unknown'}</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // Navigate to documents list or editor
                  window.location.href = '/generator';
                }}
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                View Document
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationNotification;