'use client';

import { ProjectFile } from '@/types';
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Eye,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface FileProcessingStatusProps {
  files: ProjectFile[];
  onFileSelect?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

interface FileStatusItemProps {
  file: ProjectFile;
  onSelect?: () => void;
  onDelete?: () => Promise<void>;
}

function FileStatusItem({ file, onSelect, onDelete }: FileStatusItemProps) {
  const getStatusIcon = () => {
    switch (file.processing_status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (file.processing_status) {
      case 'completed':
        return 'Processed';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = () => {
    switch (file.processing_status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`border rounded-lg p-4 transition-all hover:shadow-sm ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-secondary-900 truncate">
              {file.filename}
            </h4>
            <p className="text-sm text-secondary-600">
              {formatFileSize(file.size)} • Uploaded {formatDate(file.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Processing Details */}
      {file.processing_status === 'processing' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-secondary-600 mb-1">
            <span>Processing content...</span>
            <span>Extracting entities</span>
          </div>
          <div className="w-full bg-secondary-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* File Metadata */}
      {file.metadata && (
        <div className="mb-3 text-sm text-secondary-600">
          <div className="flex items-center space-x-4">
            {file.metadata.word_count && (
              <span>{file.metadata.word_count.toLocaleString()} words</span>
            )}
            {file.metadata.chapter_count && (
              <span>{file.metadata.chapter_count} chapters</span>
            )}
            {file.metadata.language && (
              <span className="capitalize">{file.metadata.language}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {file.processing_status === 'error' && (
        <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
          Processing failed. The file may be corrupted or in an unsupported format.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {onSelect && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSelect}
              disabled={file.processing_status === 'error'}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            disabled={file.processing_status !== 'completed'}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function FileProcessingStatus({
  files,
  onFileSelect,
  onFileDelete,
  onRefresh
}: FileProcessingStatusProps) {
  const processingFiles = files.filter(f => f.processing_status === 'processing');
  const completedFiles = files.filter(f => f.processing_status === 'completed');
  const errorFiles = files.filter(f => f.processing_status === 'error');
  const pendingFiles = files.filter(f => f.processing_status === 'pending');

  const totalProcessed = completedFiles.length;
  const totalWords = completedFiles.reduce((sum, file) => 
    sum + (file.metadata?.word_count || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white border border-secondary-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900">Processing Status</h3>
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedFiles.length}</div>
            <div className="text-sm text-secondary-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{processingFiles.length}</div>
            <div className="text-sm text-secondary-600">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingFiles.length}</div>
            <div className="text-sm text-secondary-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorFiles.length}</div>
            <div className="text-sm text-secondary-600">Errors</div>
          </div>
        </div>

        {totalProcessed > 0 && (
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="flex items-center justify-between text-sm text-secondary-600">
              <span>Total processed content:</span>
              <span className="font-medium">{totalWords.toLocaleString()} words</span>
            </div>
          </div>
        )}
      </div>

      {/* Processing Files */}
      {processingFiles.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-secondary-900 mb-3">
            Currently Processing ({processingFiles.length})
          </h4>
          <div className="space-y-3">
            {processingFiles.map((file) => (
              <FileStatusItem
                key={file.id}
                file={file}
                onSelect={onFileSelect ? () => onFileSelect(file.id) : undefined}
                onDelete={onFileDelete ? () => onFileDelete(file.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Files */}
      {errorFiles.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-red-700 mb-3">
            Processing Errors ({errorFiles.length})
          </h4>
          <div className="space-y-3">
            {errorFiles.map((file) => (
              <FileStatusItem
                key={file.id}
                file={file}
                onSelect={onFileSelect ? () => onFileSelect(file.id) : undefined}
                onDelete={onFileDelete ? () => onFileDelete(file.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Files */}
      {completedFiles.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-secondary-900 mb-3">
            Completed ({completedFiles.length})
          </h4>
          <div className="space-y-3">
            {completedFiles.slice(0, 5).map((file) => (
              <FileStatusItem
                key={file.id}
                file={file}
                onSelect={onFileSelect ? () => onFileSelect(file.id) : undefined}
                onDelete={onFileDelete ? () => onFileDelete(file.id) : undefined}
              />
            ))}
            {completedFiles.length > 5 && (
              <div className="text-center py-4">
                <Button variant="outline" size="sm">
                  Show {completedFiles.length - 5} more files
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-12 bg-white border border-secondary-200 rounded-lg">
          <FileText className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">No files uploaded</h3>
          <p className="text-secondary-600">
            Upload your manuscript files to start processing and analysis.
          </p>
        </div>
      )}
    </div>
  );
}