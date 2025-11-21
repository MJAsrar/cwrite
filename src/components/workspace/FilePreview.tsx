'use client';

import { useState, useEffect } from 'react';
import { ProjectFile } from '@/types';
import { api } from '@/lib/api';
import ContentHighlighter from '@/components/search/ContentHighlighter';
import { 
  FileText, 
  Download, 
  Edit, 
  Search, 
  Eye, 
  EyeOff,
  Loader2,
  AlertCircle,
  BookOpen,
  Hash
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface FilePreviewProps {
  file: ProjectFile;
  onClose?: () => void;
}

interface FileContent {
  text: string;
  metadata?: {
    word_count: number;
    paragraph_count: number;
    character_count: number;
    estimated_reading_time: number;
  };
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [hasSearchHighlights, setHasSearchHighlights] = useState(false);

  useEffect(() => {
    loadFileContent();
  }, [file.id]);

  const loadFileContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would fetch the actual file content
      // For now, we'll simulate the API call
      const response = await api.get(`/api/v1/files/${file.id}/content`);
      setContent(response as FileContent);
      
    } catch (err: any) {
      console.error('Failed to load file content:', err);
      setError('Failed to load file content');
      
      // Fallback to mock content for demo
      setContent({
        text: `This is a preview of ${file.filename}.\n\nThe actual file content would be displayed here after being extracted and processed by the backend.\n\nThis preview component supports:\n- Full text display\n- Search and highlight functionality\n- Line numbers\n- Reading statistics\n- Download and edit options\n\nThe content shown here is extracted from the uploaded file and processed through our text extraction pipeline.`,
        metadata: {
          word_count: file.metadata?.word_count || 150,
          paragraph_count: 4,
          character_count: 750,
          estimated_reading_time: 1
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHighlightChange = (hasHighlights: boolean) => {
    setHasSearchHighlights(hasHighlights);
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadFile = () => {
    // In a real implementation, this would trigger a file download
    console.log('Downloading file:', file.filename);
  };

  const editFile = () => {
    // In a real implementation, this would open an editor
    console.log('Editing file:', file.filename);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-secondary-600">Loading file content...</p>
        </div>
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">Failed to load content</h3>
          <p className="text-secondary-600 mb-4">{error}</p>
          <Button onClick={loadFileContent}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-secondary-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">{file.filename}</h2>
              <p className="text-sm text-secondary-600">
                {formatFileSize(file.size)} • Uploaded {formatDate(file.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={downloadFile}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={editFile}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            {onClose && (
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Content Stats */}
        {content?.metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-secondary-400" />
              <span className="text-sm text-secondary-600">
                {content.metadata.word_count.toLocaleString()} words
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-secondary-400" />
              <span className="text-sm text-secondary-600">
                {content.metadata.paragraph_count} paragraphs
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-secondary-400" />
              <span className="text-sm text-secondary-600">
                {content.metadata.character_count.toLocaleString()} characters
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-secondary-400" />
              <span className="text-sm text-secondary-600">
                ~{content.metadata.estimated_reading_time} min read
              </span>
            </div>
          </div>
        )}

        {/* Search and Options */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search in file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${showLineNumbers 
                ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
              }
            `}
          >
            {showLineNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Line Numbers</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {content ? (
          <div className="p-6 relative">
            {showLineNumbers && (
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-secondary-50 border-r border-secondary-200 p-2">
                {content.text.split('\n').map((_, index) => (
                  <div key={index} className="text-xs text-secondary-400 text-right">
                    {index + 1}
                  </div>
                ))}
              </div>
            )}
            
            <ContentHighlighter
              content={content.text}
              onHighlightChange={handleHighlightChange}
              className={`font-mono text-sm leading-relaxed ${showLineNumbers ? 'pl-12' : ''}`}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">No content available</h3>
              <p className="text-secondary-600">
                The file content could not be loaded or is empty.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}