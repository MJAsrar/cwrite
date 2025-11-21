'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  File
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface FileUploadZoneProps {
  onFileUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  autoUpload?: boolean; // Auto-upload when files are selected
}

interface UploadFile extends File {
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export default function FileUploadZone({
  onFileUpload,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['.txt', '.md', '.docx'],
  disabled = false,
  autoUpload = true // Auto-upload when files are selected
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    console.log('🟡 FileUploadZone: processFiles called with', files.length, 'files');
    const fileArray = Array.from(files);
    
    // Check total file count
    if (uploadFiles.length + fileArray.length > maxFiles) {
      console.log('🟡 Too many files:', uploadFiles.length + fileArray.length, '>', maxFiles);
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newUploadFiles: UploadFile[] = fileArray.map(file => {
      console.log('🟡 Processing file:', file.name, file.type, file.size);
      const error = validateFile(file);
      if (error) {
        console.log('🟡 File validation error:', error);
      }
      return Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        status: error ? 'error' as const : 'pending' as const,
        progress: 0,
        error: error || undefined
      });
    });

    console.log('🟡 Adding', newUploadFiles.length, 'files to upload queue');
    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, [uploadFiles.length, maxFiles, maxFileSize, acceptedTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    processFiles(files);
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔴 File input changed, files:', e.target.files?.length || 0);
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadAllFiles = useCallback(async () => {
    console.log('🟢 FileUploadZone: uploadAllFiles called');
    const validFiles = uploadFiles.filter(f => f.status === 'pending');
    console.log(`🟢 Valid files to upload: ${validFiles.length}`);
    
    if (validFiles.length === 0) {
      console.log('🟢 No valid files, aborting');
      return;
    }

    setUploading(true);
    
    try {
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
      ));

      // Simulate progress updates (in real implementation, this would come from the upload API)
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => 
          f.status === 'uploading' 
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        ));
      }, 200);

      console.log('🟢 Calling onFileUpload handler...');
      // Perform actual upload
      await onFileUpload(validFiles);

      clearInterval(progressInterval);

      console.log('🟢 Upload handler completed');

      // Mark as completed
      setUploadFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'completed' as const, progress: 100 }
          : f
      ));

      // Clear completed files after a delay
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.status !== 'completed'));
      }, 2000);

    } catch (error) {
      console.error('🟢 Upload error:', error);
      // Mark as error
      setUploadFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'error' as const, error: 'Upload failed' }
          : f
      ));
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, onFileUpload]);

  // Auto-upload effect
  useEffect(() => {
    if (autoUpload && uploadFiles.length > 0 && !uploading) {
      const hasPendingFiles = uploadFiles.some(f => f.status === 'pending');
      if (hasPendingFiles) {
        console.log('🟣 Auto-uploading pending files...');
        // Small delay to show files in UI first
        uploadTimeoutRef.current = setTimeout(() => {
          uploadAllFiles();
        }, 500);
      }
    }
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, [uploadFiles, uploading, autoUpload, uploadAllFiles]);

  const clearAll = () => {
    setUploadFiles([]);
  };

  const getFileIcon = (fileName: string | undefined) => {
    if (!fileName) return <File className="w-5 h-5 text-secondary-400" />;
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'txt':
      case 'md':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'docx':
        return <File className="w-5 h-5 text-blue-600" />;
      case 'pdf':
        return <File className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-secondary-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  console.log('🟣 FileUploadZone render, uploadFiles:', uploadFiles.length);

  return (
    <div className="space-y-4">
      {/* Enhanced Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${dragOver 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border hover:border-primary/50 hover:bg-accent/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className={`
          w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all
          ${dragOver ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'}
        `}>
          <Upload className="w-8 h-8" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {dragOver ? 'Drop files here' : 'Upload your files'}
        </h3>
        <p className="text-muted-foreground mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-sm text-muted-foreground">
          Supports: {acceptedTypes.join(', ')} • Max {Math.round(maxFileSize / (1024 * 1024))}MB per file
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Enhanced File List */}
      {uploadFiles.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">
              Files to Upload ({uploadFiles.length})
            </h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearAll}
                disabled={uploading}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={uploadAllFiles}
                disabled={uploading || uploadFiles.every(f => f.status !== 'pending')}
                loading={uploading}
              >
                Upload Files
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {uploadFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                <div className="flex-shrink-0">
                  {getFileIcon(file.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploading... {file.progress}%
                      </p>
                    </div>
                  )}
                  
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {file.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  {file.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}