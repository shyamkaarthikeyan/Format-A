import React from 'react';
import { X, Download, Mail, Save, Users, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthPromptProps {
  isOpen: boolean;
  action: 'download' | 'email';
  onSignIn: () => void;
  onCancel: () => void;
}

const AuthPrompt: React.FC<AuthPromptProps> = ({ 
  isOpen, 
  action, 
  onSignIn, 
  onCancel 
}) => {
  if (!isOpen) return null;

  const actionText = action === 'download' ? 'download' : 'email';
  const ActionIcon = action === 'download' ? Download : Mail;

  const benefits = [
    {
      icon: ActionIcon,
      title: `${action === 'download' ? 'Download' : 'Email'} Documents`,
      description: `${action === 'download' ? 'Download your documents as PDF or DOCX files' : 'Email documents directly to yourself or collaborators'}`
    },
    {
      icon: Save,
      title: 'Save Document History',
      description: 'Access all your documents from any device, anytime'
    },
    {
      icon: Shield,
      title: 'Secure Cloud Storage',
      description: 'Your documents are safely stored and backed up'
    },
    {
      icon: Zap,
      title: 'Advanced Features',
      description: 'Access premium formatting options and templates'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
                <ActionIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Sign in to {actionText}
                </h2>
                <p className="text-sm text-gray-600">
                  Unlock full access to Format A
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Document Preservation Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Save className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Your work is safe
                </h3>
                <p className="text-sm text-blue-700">
                  We'll preserve your current document during sign-in and restore it afterwards.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits List */}
          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              What you'll get with an account:
            </h3>
            
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {benefit.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">
                  Join thousands of researchers
                </p>
                <p className="text-xs text-purple-700">
                  Already using Format A to create professional documents
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onSignIn}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Sign in with Google
            </Button>
            
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl"
            >
              Continue as guest
            </Button>
          </div>

          {/* Fine Print */}
          <p className="text-xs text-gray-500 text-center mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            Your document will be automatically saved to your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPrompt;