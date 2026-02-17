'use client';

import { useState, useEffect } from 'react';
import { X, FolderPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';

const GENRES = [
  { id: 'fantasy', label: 'Fantasy', emoji: '🧙', description: 'Worldbuilding & magic' },
  { id: 'sci_fi', label: 'Sci-Fi', emoji: '🚀', description: 'Speculative & futuristic' },
  { id: 'romance', label: 'Romance', emoji: '❤️', description: 'Love & relationships' },
  { id: 'thriller', label: 'Thriller', emoji: '🔎', description: 'Suspense & mystery' },
  { id: 'horror', label: 'Horror', emoji: '👻', description: 'Dread & tension' },
  { id: 'literary', label: 'Literary', emoji: '✍️', description: 'Prose & themes' },
  { id: 'historical', label: 'Historical', emoji: '🏰', description: 'Period narratives' },
  { id: 'young_adult', label: 'YA', emoji: '🧑‍🎓', description: 'Coming-of-age' },
  { id: 'poetry', label: 'Poetry', emoji: '🪶', description: 'Verse & imagery' },
  { id: 'screenwriting', label: 'Screen', emoji: '🎬', description: 'Scripts & dialogue' },
  { id: 'general', label: 'General', emoji: '🌍', description: 'Mixed writing' },
];

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: { name: string; description?: string; settings?: { genre: string } }) => Promise<void>;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { errors, validateField, validateForm, clearAllErrors } = useFormValidation({
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/
    },
    description: {
      maxLength: 500
    }
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', description: '', genre: 'general' });
      setError(null);
      setSuccess(false);
      clearAllErrors();
    }
  }, [isOpen, clearAllErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm(formData);
    if (!isValid) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        settings: { genre: formData.genre }
      });

      setSuccess(true);

      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field !== 'genre') {
      validateField(field, value);
    }
    if (error) setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', description: '', genre: 'general' });
      setError(null);
      setSuccess(false);
      clearAllErrors();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
        {success ? (
          <div className="p-12 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Project Created!
            </h3>
            <p className="text-sm text-slate-500">
              &quot;{formData.name}&quot; has been successfully added to your workspace.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 text-primary rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    New Project
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create a new creative workspace
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto p-6">
              <form id="create-project-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., The Obsidian Nexus"
                    required
                    disabled={loading}
                    className={`input-field ${errors.name ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                    autoFocus
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="projectDesc" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Description <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="projectDesc"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="A brief summary of what this project is about..."
                    rows={3}
                    disabled={loading}
                    className={`input-field resize-none max-h-24 ${errors.description ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {errors.description ? (
                      <p className="text-xs text-red-500 font-medium">{errors.description}</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-slate-400">
                      {formData.description.length}/500
                    </p>
                  </div>
                </div>

                {/* Genre Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Writing Genre <span className="text-slate-400 font-normal">— AI model adapts to your genre</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre.id}
                        type="button"
                        disabled={loading}
                        onClick={() => handleInputChange('genre', genre.id)}
                        className={`relative flex flex-col items-center p-2.5 rounded-xl border-2 transition-all duration-150 text-center group
                          ${formData.genre === genre.id
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <span className="text-xl mb-1">{genre.emoji}</span>
                        <span className={`text-xs font-semibold leading-tight ${formData.genre === genre.id ? 'text-blue-700' : 'text-slate-700'
                          }`}>
                          {genre.label}
                        </span>
                        <span className={`text-[10px] leading-tight mt-0.5 ${formData.genre === genre.id ? 'text-blue-500' : 'text-slate-400'
                          }`}>
                          {genre.description}
                        </span>
                        {formData.genre === genre.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start">
                    <AlertCircle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-project-form"
                disabled={loading || Object.keys(errors).length > 0 || !formData.name.trim()}
                className="w-full sm:w-auto btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
