import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Download, 
  FileText, 
  Calendar
} from 'lucide-react';

interface DownloadRecord {
  id: string;
  title: string;
  downloadedAt: string;
  fileSize: number;
  pages: number;
}

interface DownloadHistoryProps {
  className?: string;
}

export default function DownloadHistory({ className }: DownloadHistoryProps) {
  const { user, isAuthenticated } = useAuth();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);

  // Load user's download history from localStorage
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const storageKey = `download_history_${user.id}`;
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setDownloads(parsedHistory);
        } catch (error) {
          console.error('Error parsing download history:', error);
          setDownloads([]);
        }
      } else {
        setDownloads([]);
      }
    }
  }, [isAuthenticated, user?.id]);

  // Function to add a new download to history (to be called when user downloads)
  const addDownload = (downloadData: Omit<DownloadRecord, 'id' | 'downloadedAt'>) => {
    if (!user?.id) return;

    const newDownload: DownloadRecord = {
      ...downloadData,
      id: Date.now().toString(),
      downloadedAt: new Date().toISOString()
    };

    const updatedDownloads = [newDownload, ...downloads];
    setDownloads(updatedDownloads);

    // Save to localStorage
    const storageKey = `download_history_${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedDownloads));
  };

  // Expose addDownload function globally for use when downloading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addToDownloadHistory = addDownload;
    }
  }, [downloads, user?.id]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Please sign in to view your download history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Download History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {downloads.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No downloads yet</p>
            <p className="text-sm text-gray-400">Your downloaded papers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {downloads.map((download) => (
            <div
              key={download.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">{download.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(download.downloadedAt)}
                    </div>
                    <span>{download.fileSize.toFixed(1)} MB</span>
                    <span>{download.pages} pages</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}