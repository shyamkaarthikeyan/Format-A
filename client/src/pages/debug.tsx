import React from 'react';
import AuthDebug from '@/components/auth-debug';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function DebugPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button 
            onClick={() => setLocation('/')} 
            variant="outline" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Authentication Debug</h1>
          <p className="text-gray-600 mt-2">
            Use this page to debug authentication issues and test API endpoints.
          </p>
        </div>
        
        <AuthDebug />
      </div>
    </div>
  );
}