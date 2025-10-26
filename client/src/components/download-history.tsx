import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { DownloadRecord, PaginatedDownloads } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Calendar, 
  Mail, 
  AlertCircle, 
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { apiGet } from '@/lib/api-client';

interface DownloadHistoryProps {
  className?: string;
}

export default function DownloadHistory({ className }: DownloadHistoryProps) {
  const { user, isAuthenticated } = useAuth();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDownloads = async (page: number = 1) => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping download fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching downloads for page:', page);
      console.log('User authenticated:', isAuthenticated);
      console.log('User:', user);

      const result = await apiGet<PaginatedDownloads>(`/api/downloads/history?page=${page}&limit=10`);
      console.log('Download history result:', result);
      
      if (result.success && result.data) {
        setDownloads(result.data.downloads);
        setPagination(result.data.pagination);
        setCurrentPage(page);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch download history');
      }
    } catch (err) {
      console.error('Error fetching downloads:', err);
      setError(`Failed to load download history: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('DownloadHistory useEffect - isAuthenticated:', isAuthenticated, 'user:', user);
    if (isAuthenticated && user) {
      fetchDownloads(1);
    }
  }, [isAuthenticated, user]);

  const handleRedownload = async (download: DownloadRecord) => {
    try {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = `/api/downloads/${download.id}/redownload`;
      link.download = `${download.documentTitle}.${download.fileFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error re-downloading:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading download history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchDownloads(currentPage)} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (downloads.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No downloads yet</p>
            <p className="text-sm text-gray-400 mb-4">Your downloaded documents will appear here</p>
            

          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download History
          </div>
          <Button onClick={() => fetchDownloads(currentPage)} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                    <h3 className="font-medium text-gray-900 truncate">
                      {download.documentTitle}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {download.fileFormat.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(download.downloadedAt), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(download.status)}
                      <Badge className={`text-xs ${getStatusColor(download.status)}`}>
                        {download.status}
                      </Badge>
                    </div>
                    <span>{formatFileSize(download.fileSize)}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{download.documentMetadata.pageCount} pages</span>
                    <span>{download.documentMetadata.sectionCount} sections</span>
                    <span>{download.documentMetadata.referenceCount} references</span>
                    {download.emailSent && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Mail className="w-3 h-3" />
                        <span>Emailed</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {download.status === 'completed' && (
                    <Button
                      onClick={() => handleRedownload(download)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {downloads.length} of {pagination.totalItems} downloads
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => fetchDownloads(currentPage - 1)}
                disabled={!pagination.hasPrev}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                onClick={() => fetchDownloads(currentPage + 1)}
                disabled={!pagination.hasNext}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}