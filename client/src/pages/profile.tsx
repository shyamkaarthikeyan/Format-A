import React, { useState, useEffect } from 'react';
import { User, Settings, Download, Calendar, FileText, Mail, Shield } from 'lucide-react';
import { DownloadHistory } from '../components/download-history';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  createdAt: string;
  lastLoginAt: string;
  preferences: {
    emailNotifications: boolean;
    defaultExportFormat: 'pdf' | 'docx';
    theme: 'light' | 'dark';
  };
}

export function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'downloads' | 'settings'>('overview');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to load user profile');
      }

      setUser({
        ...data.user,
        preferences: data.user.preferences || {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light'
        }
      });
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Failed to load profile'}</p>
          <button 
            onClick={fetchUserProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-gray-600 flex items-center mt-1">
                  <Mail className="w-4 h-4 mr-2" />
                  {user.email}
                </p>
                <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Joined {formatDate(user.createdAt)}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Last login {formatDate(user.lastLoginAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('downloads')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'downloads'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download History
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500">User ID</p>
                          <p className="text-sm text-gray-900 font-mono">{user.id}</p>
                        </div>
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Default Export Format</p>
                          <p className="text-sm text-gray-900 uppercase">{user.preferences.defaultExportFormat}</p>
                        </div>
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600">
                      Welcome to Format-A! Your document generation and download history will be tracked here.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'downloads' && (
              <div>
                <DownloadHistory userId={user.id} limit={20} />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Settings className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 mb-1">⚙️ Account Settings</h4>
                          <p className="text-sm text-blue-700">
                            Your account settings are managed through your Google account. 
                            To update your name, email, or profile picture, please visit your Google Account settings.
                          </p>
                          <p className="text-sm text-blue-600 mt-2">
                            Default export format: <span className="font-medium uppercase">{user.preferences.defaultExportFormat}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Email Notification Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900 mb-1">📧 Automatic Email Notifications</h4>
                      <p className="text-sm text-green-700">
                        You'll automatically receive beautiful email notifications with document details 
                        every time you generate a document. Emails include download statistics, 
                        file information, and direct links to your download history.
                      </p>
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        ✅ Email notifications are automatically sent for ALL downloads
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        No configuration needed - emails are sent to: {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}