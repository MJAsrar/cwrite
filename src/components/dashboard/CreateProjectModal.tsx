'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: { name: string; description?: string }) => Promise<void>;
}

export default function CreateProjectModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
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
      setFormData({ name: '', description: '' });
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
        description: formData.description.trim() || undefined
      });
      
      setSuccess(true);
      
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.message || 'FAILED TO CREATE PROJECT');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
    if (error) setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', description: '' });
      setError(null);
      setSuccess(false);
      clearAllErrors();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/80"
        onClick={handleClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative border-4 border-white bg-white max-w-md w-full">
          {success ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 border-4 border-[#39FF14] bg-[#39FF14]/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-[#39FF14]" />
              </div>
              <h3 className="text-2xl font-black uppercase text-[#0A0A0A] mb-2">
                PROJECT CREATED!
              </h3>
              <p className="font-mono text-sm text-gray-600 uppercase">
                "{formData.name}" CREATED SUCCESSFULLY
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b-4 border-[#0A0A0A]">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#39FF14] border-4 border-[#0A0A0A] flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase text-[#0A0A0A]">
                      CREATE NEW PROJECT
                    </h2>
                    <p className="font-mono text-xs text-gray-600 uppercase">
                      START YOUR NEXT ADVENTURE
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="p-2 text-[#0A0A0A] hover:text-[#FF073A] transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                      PROJECT NAME *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="MY AMAZING STORY"
                      required
                      disabled={loading}
                      className={`w-full border-4 ${errors.name ? 'border-[#FF073A]' : 'border-[#0A0A0A]'} bg-white px-4 py-3 font-mono text-sm text-[#0A0A0A] uppercase placeholder:text-gray-400 focus:outline-none focus:border-[#39FF14] transition-colors disabled:opacity-50`}
                    />
                    {errors.name && (
                      <p className="mt-1 font-mono text-xs text-[#FF073A] uppercase">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                      DESCRIPTION (OPTIONAL)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="A BRIEF DESCRIPTION..."
                      rows={3}
                      disabled={loading}
                      className={`w-full border-4 ${errors.description ? 'border-[#FF073A]' : 'border-[#0A0A0A]'} bg-white px-4 py-3 font-mono text-sm text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#39FF14] transition-colors disabled:opacity-50 resize-none`}
                    />
                    {errors.description && (
                      <p className="mt-1 font-mono text-xs text-[#FF073A] uppercase">{errors.description}</p>
                    )}
                    <p className="mt-1 font-mono text-xs text-gray-500 uppercase">
                      {formData.description.length}/500 CHARACTERS
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-6 border-4 border-[#FF073A] bg-[#FF073A]/10 p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-[#FF073A] flex-shrink-0 mt-0.5" />
                      <p className="font-mono text-sm text-[#FF073A] uppercase font-bold">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="border-4 border-gray-500 bg-transparent text-gray-700 font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-gray-500 hover:text-white transition-all duration-100 disabled:opacity-50"
                    style={{ boxShadow: '4px 4px 0 0 #6B7280' }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = '0 0 0 0 #6B7280')}
                    onMouseLeave={(e) => !loading && (e.currentTarget.style.boxShadow = '4px 4px 0 0 #6B7280')}
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading || Object.keys(errors).length > 0 || !formData.name.trim()}
                    className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                    style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14')}
                    onMouseLeave={(e) => !loading && (e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14')}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <span className="w-4 h-4 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin mr-2"></span>
                        CREATING...
                      </span>
                    ) : (
                      'CREATE PROJECT'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
