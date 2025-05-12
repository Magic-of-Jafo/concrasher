import React from 'react';
import { useConvention } from '../hooks/useConvention';
import { useAuth } from '../hooks/useAuth';

export const ConventionForm: React.FC = () => {
  const { createConvention, loading, error } = useConvention();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic will be implemented
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields will be implemented */}
    </form>
  );
}; 