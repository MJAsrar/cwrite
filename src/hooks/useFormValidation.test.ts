import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '@/hooks/useFormValidation';

describe('useFormValidation', () => {
  const rules = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_]+$/,
    },
  };

  it('validates required/min/max/pattern for name field', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    expect(result.current.validateField('name', '')).toBe('Name is required');
    expect(result.current.validateField('name', 'A')).toContain('at least 2');
    expect(result.current.validateField('name', 'A'.repeat(101))).toContain('no more than 100');
    expect(result.current.validateField('name', 'Bad@Name')).toContain('format is invalid');
    expect(result.current.validateField('name', 'Valid-Project_Name 123')).toBeNull();
  });

  it('validateForm sets errors and hasErrors then clearAllErrors resets', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      const isValid = result.current.validateForm({ name: '' });
      expect(isValid).toBe(false);
    });

    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.hasErrors).toBe(true);

    act(() => {
      result.current.clearAllErrors();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });
});
