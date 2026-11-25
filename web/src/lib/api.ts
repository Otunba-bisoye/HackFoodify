import { create } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const apiClient = create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});