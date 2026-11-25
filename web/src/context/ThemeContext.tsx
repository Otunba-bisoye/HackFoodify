import { createContext, useContext } from 'react';

const colors = {
  background: '#F9FAFB',
  text: '#111827',
  textLight: '#6B7280',
  primary: '#10B981',
  expense: '#EF4444',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

const ThemeContext = createContext({ colors });

export const useTheme = () => useContext(ThemeContext);