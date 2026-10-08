import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_USER } from '../data/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ofk_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState('phone'); // 'phone' | 'otp' | 'profile'
  const [pendingPhone, setPendingPhone] = useState('');

  useEffect(() => {
    localStorage.setItem('ofk_user', JSON.stringify(user));
  }, [user]);

  const openAuthModal = () => {
    setAuthStep('phone');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const sendOtp = (phone) => {
    setPendingPhone(phone);
    setAuthStep('otp');
    return true;
  };

  const verifyOtp = (code, name = '') => {
    if (code === '1234' || code.length === 4) {
      const updatedUser = {
        ...user,
        phone: pendingPhone || user.phone,
        name: name || user.name || 'Food Explorer',
        isAuthenticated: true
      };
      setUser(updatedUser);
      setIsAuthModalOpen(false);
      setAuthStep('phone');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser({
      id: null,
      name: 'Guest User',
      phone: '',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      defaultLocation: 'Kimironko, Kigali',
      addresses: [],
      savedPaymentMethods: [],
      isAuthenticated: false
    });
  };

  const addAddress = (newAddr) => {
    const addr = {
      id: `addr-${Date.now()}`,
      ...newAddr,
      isDefault: user.addresses.length === 0
    };
    setUser(prev => ({
      ...prev,
      addresses: [...prev.addresses, addr]
    }));
  };

  const setDefaultAddress = (id) => {
    setUser(prev => ({
      ...prev,
      addresses: prev.addresses.map(a => ({
        ...a,
        isDefault: a.id === id
      }))
    }));
  };

  const deleteAddress = (id) => {
    setUser(prev => ({
      ...prev,
      addresses: prev.addresses.filter(a => a.id !== id)
    }));
  };

  const updateProfile = (profileData) => {
    setUser(prev => ({
      ...prev,
      ...profileData
    }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: Boolean(user?.name && user?.phone),
      isAuthModalOpen,
      authStep,
      pendingPhone,
      openAuthModal,
      closeAuthModal,
      setAuthStep,
      sendOtp,
      verifyOtp,
      logout,
      addAddress,
      setDefaultAddress,
      deleteAddress,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
