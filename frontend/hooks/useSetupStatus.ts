/**
 * Setup Status Hook
 *
 * Checks if first-time setup is complete
 * Used to redirect users to setup wizard if needed
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

interface SetupStatus {
  setupComplete: boolean;
  hasUsers: boolean;
  hasApiKeys: boolean;
}

interface UseSetupStatusReturn {
  setupComplete: boolean | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export function useSetupStatus(): UseSetupStatusReturn {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSetupStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<{ success: boolean; data: SetupStatus }>(
        `${API_URL}/api/setup/status`,
        {
          // No auth required for this endpoint
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        setSetupComplete(response.data.data.setupComplete);
      } else {
        setError('Failed to check setup status');
      }
    } catch (err) {
      console.error('Failed to fetch setup status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSetupComplete(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  return {
    setupComplete,
    loading,
    error,
    refetch: fetchSetupStatus,
  };
}
