import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { apiClient } from '../lib/api';

let activeInterceptorId: number | null = null;

export const useApiClient = () => {
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  const isSignedInRef = useRef(isSignedIn);

  useEffect(() => {
    getTokenRef.current = getToken;
    isSignedInRef.current = isSignedIn;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (activeInterceptorId !== null) {
      apiClient.interceptors.request.eject(activeInterceptorId);
    }

    activeInterceptorId = apiClient.interceptors.request.use(
      async (config) => {
        try {
          if (isSignedInRef.current) {
            const token = await getTokenRef.current();
            if (token) {
              config.headers.set('Authorization', `Bearer ${token}`);
            }
          }
        } catch (error) {
          console.warn('Failed to attach Clerk token:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }, []);

  return apiClient;
};