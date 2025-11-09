import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';

interface DownloadRecord {
  id: string;
  userId: string;
  documentId?: string;
  documentTitle: string;
  fileFormat: string;
  fileSize: number;
  downloadedAt: string;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  emailSent: boolean;
  documentMetadata?: any;
}

interface PaginatedDownloads {
  downloads: DownloadRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface DownloadHistoryProps {
  userId?: string;
  showUserInfo?: boolean;
  limit?: number;
}

export function DownloadHistory({ userId, showUserInfo = false, limit = 10 }: DownloadHistoryProps) {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDownloads = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const params = new URLSearchParams({
        action: 'history',
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/downloads?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch downloads: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch download history');
      }

      setDownloads(data.data.downloads);
      setPagination(data.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching downloads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load download history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads(1);
  }, [userId, limit]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchDownloads(page);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading download history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
        <button 
          onClick={() => fetchDownloads(currentPage)}
          className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Download className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Download History</h3>
          </div>
          <div className="text-sm text-gray-500">
            {pagination.totalItems} total downloads
          </div>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Download className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No downloads yet</p>
          <p className="text-sm">Your document downloads will appear here</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-200">
            {downloads.map((download) => (
              <div key={download.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(download.fileFormat)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {download.documentTitle}
                        </h4>
                        {getStatusBadge(download.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(download.downloadedAt)}
                        </div>
                        <div className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          {download.fileFormat.toUpperCase()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatFileSize(download.fileSize)}
                        </div>
                        {download.emailSent && (
                          <div className="flex items-center text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            Email sent
                          </div>
                        )}
                      </div>
                      {showUserInfo && download.userAgent && (
                        <div className="mt-2 text-xs text-gray-400 truncate">
                          <User className="w-3 h-3 inline mr-1" />
                          {download.userAgent.split(' ')[0]} • {download.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.totalItems)} of {pagination.totalItems} downloads
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    const isActive = page === currentPage;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          isActive 
                            ? 'bg-blue-600 text-white' 
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  {pagination.totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => handlePageChange(pagination.totalPages)}
                        className={`px-3 py-1 text-sm rounded ${
                          pagination.totalPages === currentPage 
                            ? 'bg-blue-600 text-white' 
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}