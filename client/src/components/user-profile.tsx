import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  Settings, 
  LogOut, 
  Download,
  Bell,
  Palette,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface UserProfileProps {
  className?: string;
}

export default function UserProfile({ className }: UserProfileProps) {
  const { user, signOut, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      
      // Call server sign-out endpoint
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('format-a-session')}`
        }
      });

      if (response.ok) {
        // Clear local auth state
        signOut();
        // Redirect to sign-in page
        setLocation('/signin');
      } else {
        console.error('Sign-out failed');
        // Still clear local state even if server call fails
        signOut();
        setLocation('/signin');
      }
    } catch (error) {
      console.error('Sign-out error:', error);
      // Clear local state on error
      signOut();
      setLocation('/signin');
    } finally {
      setSigningOut(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'dark':
        return '🌙';
      case 'light':
        return '☀️';
      default:
        return '🎨';
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please sign in to view your profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          User Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info Section */}
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user.picture} alt={user.name} />
            <AvatarFallback className="text-lg font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
            <div className="flex items-center gap-2 text-gray-600 mt-1">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 mt-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">
                Member since {format(new Date(user.createdAt), 'MMM yyyy')}
              </span>
            </div>
          </div>
          <Badge variant={user.isActive ? "default" : "secondary"} className="ml-auto">
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <Separator />

        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {format(new Date(user.lastLoginAt), 'MMM d')}
            </div>
            <div className="text-xs text-gray-500">Last Login</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              <Download className="w-6 h-6 mx-auto" />
            </div>
            <div className="text-xs text-gray-500">Downloads</div>
          </div>
        </div>

        <Separator />

        {/* Preferences Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-500" />
                <span>Email Notifications</span>
              </div>
              <Badge variant={user.preferences.emailNotifications ? "default" : "secondary"}>
                {user.preferences.emailNotifications ? 'On' : 'Off'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Default Export Format</span>
              </div>
              <Badge variant="outline">
                {user.preferences.defaultExportFormat.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                <span>Theme</span>
              </div>
              <Badge variant="outline">
                {getThemeIcon(user.preferences.theme)} {user.preferences.theme}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleSignOut}
            disabled={signingOut}
            variant="destructive"
            className="w-full"
          >
            {signingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Signing Out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </>
            )}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            Signing out will clear your session and redirect you to the sign-in page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}