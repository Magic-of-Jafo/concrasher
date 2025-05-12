import { useState } from 'react';
import { apiClient } from '../api/client';

export const useConvention = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createConvention = async (data: any) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/conventions', data);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createConvention, loading, error };
}; 