import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';



const AuthContext = createContext(null);



export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);




  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('spendiq_token');
      const storedUser = localStorage.getItem('spendiq_user');

      if (token && storedUser) {
        try {


          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch {

          localStorage.removeItem('spendiq_token');
          localStorage.removeItem('spendiq_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);


  const storeAuth = (token, userData) => {
    localStorage.setItem('spendiq_token', token);
    localStorage.setItem('spendiq_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    storeAuth(res.data.token, res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    storeAuth(res.data.token, res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('spendiq_token');
    localStorage.removeItem('spendiq_user');
    setUser(null);
  };



  const updateUser = (userData) => {
    localStorage.setItem('spendiq_user', JSON.stringify(userData));
    setUser(userData);
  };


  const value = { user, loading, register, login, logout, updateUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}




export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
