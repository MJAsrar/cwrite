'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Form Context
interface FormContextValue {
  errors: Record<string, string>;
  setError: (name: string, error: string) => void;
  clearError: (name: string) => void;
  clearAllErrors: () => void;
}

const FormContext = React.createContext<FormContextValue | undefined>(undefined);

export function useFormContext() {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
}

// Form Provider
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function Form({ children, className, onSubmit, ...props }: FormProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const setError = React.useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const clearError = React.useCallback((name: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  const clearAllErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  const handleSubmit = React.useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAllErrors();
    onSubmit?.(event);
  }, [onSubmit, clearAllErrors]);

  const contextValue = React.useMemo(() => ({
    errors,
    setError,
    clearError,
    clearAllErrors,
  }), [errors, setError, clearError, clearAllErrors]);

  return (
    <FormContext.Provider value={contextValue}>
      <form
        className={cn("space-y-6", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Form Field
interface FormFieldProps {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ name, children, className }: FormFieldProps) {
  const { errors } = useFormContext();
  const error = errors[name];

  return (
    <div className={cn("space-y-2", className)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            error,
            name,
            ...child.props,
          });
        }
        return child;
      })}
    </div>
  );
}

// Form Item (for more complex layouts)
interface FormItemProps {
  children: React.ReactNode;
  className?: string;
}

export function FormItem({ children, className }: FormItemProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}

// Form Label
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FormLabel({ children, required, className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive ml-1" aria-label="required">*</span>
      )}
    </label>
  );
}

// Form Control (wrapper for input elements)
interface FormControlProps {
  children: React.ReactNode;
  className?: string;
}

export function FormControl({ children, className }: FormControlProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}

// Form Description
interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FormDescription({ children, className, ...props }: FormDescriptionProps) {
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

// Form Message (for errors)
interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string;
}

export function FormMessage({ error, className, ...props }: FormMessageProps) {
  if (!error) return null;

  return (
    <p
      className={cn("text-xs text-destructive", className)}
      role="alert"
      {...props}
    >
      {error}
    </p>
  );
}

// Form validation utilities
export function validateRequired(value: any, message = "This field is required") {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return message;
  }
  return '';
}

export function validateEmail(value: string, message = "Please enter a valid email address") {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (value && !emailRegex.test(value)) {
    return message;
  }
  return '';
}

export function validateMinLength(value: string, minLength: number, message?: string) {
  if (value && value.length < minLength) {
    return message || `Must be at least ${minLength} characters`;
  }
  return '';
}

export function validateMaxLength(value: string, maxLength: number, message?: string) {
  if (value && value.length > maxLength) {
    return message || `Must be no more than ${maxLength} characters`;
  }
  return '';
}

export function validatePattern(value: string, pattern: RegExp, message = "Invalid format") {
  if (value && !pattern.test(value)) {
    return message;
  }
  return '';
}

// Validation hook
export function useFormValidation() {
  const { setError, clearError } = useFormContext();

  const validate = React.useCallback((name: string, value: any, validators: Array<(value: any) => string>) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        setError(name, error);
        return false;
      }
    }
    clearError(name);
    return true;
  }, [setError, clearError]);

  return { validate };
}