import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentCustomer, sendOtp as sendOtpRequest, verifyOtp as verifyOtpRequest } from '../api/endpoints';

const AuthContext = createContext(null);
const ACCESS_TOKEN_KEY = 'ofk_access_token';

const guestUser = {
  id: null,
  name: 'Guest User',
  phone: '',
  email: '',
  avatar: '',
  defaultLocation: '',
  addresses: [],
  savedPaymentMethods: [],
};

const readStoredUser = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('ofk_user') || 'null');
    if (!saved || saved.name?.trim().toLowerCase() === 'kevin mugabo') {
      localStorage.removeItem('ofk_user');
      return guestUser;
    }
    return { ...guestUser, ...saved };
  } catch {
    localStorage.removeItem('ofk_user');
    return guestUser;
  }
};

const customerUser = (customer, existing = guestUser) => ({
  ...existing,
  id: customer.id,
  name: customer.name,
  phone: customer.phone_number,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    return readStoredUser();
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState('phone');
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [otpPreview, setOtpPreview] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    localStorage.setItem('ofk_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    const invalidateSession = () => {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setAccessToken(null);
      setUser(guestUser);
      setAuthError('Your session has expired. Please sign in again.');
    };
    window.addEventListener('ofk:unauthorized', invalidateSession);
    return () => window.removeEventListener('ofk:unauthorized', invalidateSession);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    fetchCurrentCustomer()
      .then(({ customer }) => setUser((current) => customerUser(customer, current)))
      .catch((error) => {
        if (error.status === 401) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          setAccessToken(null);
          setUser(guestUser);
        }
        setAuthError(error.message);
      });
  }, [accessToken]);

  const openAuthModal = () => {
    setAuthStep('phone');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const sendOtp = async (phone, name = '') => {
    setAuthError('');
    setPendingPhone(phone);
    setPendingName(name);
    const result = await sendOtpRequest(phone, name);
    setPendingPhone(result.phone_number);
    setOtpPreview(result.dev_otp ?? '');
    setAuthStep('otp');
  };

  const verifyOtp = async (code, name = pendingName) => {
    const result = await verifyOtpRequest(pendingPhone, code, name);
    localStorage.setItem(ACCESS_TOKEN_KEY, result.token);
    setAccessToken(result.token);
    setUser((current) => customerUser(result.customer, current));
    setIsAuthModalOpen(false);
    setAuthStep('phone');
    setOtpPreview('');
    return true;
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setUser(guestUser);
    setAuthError('');
  };

  const addAddress = (newAddr) => {
    const addr = {
      id: `addr-${Date.now()}`,
      ...newAddr,
      isDefault: user.addresses.length === 0,
    };
    setUser((prev) => ({ ...prev, addresses: [...prev.addresses, addr] }));
  };

  const setDefaultAddress = (id) => {
    setUser((prev) => ({
      ...prev,
      addresses: prev.addresses.map((address) => ({ ...address, isDefault: address.id === id })),
    }));
  };

  const deleteAddress = (id) => {
    setUser((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((address) => address.id !== id),
    }));
  };

  const updateProfile = (profileData) => {
    setUser((prev) => ({ ...prev, ...profileData }));
  };

  const value = useMemo(() => ({
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    isAuthModalOpen,
    authStep,
    pendingPhone,
    pendingName,
    otpPreview,
    authError,
    openAuthModal,
    closeAuthModal,
    setAuthStep,
    sendOtp,
    verifyOtp,
    logout,
    addAddress,
    setDefaultAddress,
    deleteAddress,
    updateProfile,
  }), [user, accessToken, isAuthModalOpen, authStep, pendingPhone, pendingName, otpPreview, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
