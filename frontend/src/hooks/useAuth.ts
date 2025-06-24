import { useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState({ id: '1', username: 'testuser' });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  return { user, isAuthenticated };
}; 