import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentCustomer,
  sendOtp as sendOtpRequest,
  verifyOtp as verifyOtpRequest,
  continueAsCustomer as continueAsCustomerRequest,
  updateCurrentCustomerProfile,
} from '../api/endpoints';
import { clearAllSessions } from '../api/session';

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
  phone: customer.phone_number || '',
  email: customer.email || '',
  // Only a verified email receives delivery codes; a phone/email waiting for its code.
  emailVerified: Boolean(customer.email_verified),
  pendingPhone: customer.pending_phone_number || '',
  pendingEmail: customer.pending_email || '',
  avatar: customer.profile_image_url || existing.avatar || '',
});

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [user, setUser] = useState(() => {
    // A stored profile is only meaningful while its access token is present.
    return localStorage.getItem(ACCESS_TOKEN_KEY) ? readStoredUser() : guestUser;
  });
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
    // Any role signing in or out wipes every session; drop the customer view too.
    const onSessionsCleared = () => {
      setAccessToken(null);
      setUser(guestUser);
    };
    window.addEventListener('ofk:sessions-cleared', onSessionsCleared);
    return () => window.removeEventListener('ofk:sessions-cleared', onSessionsCleared);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setUser(guestUser);
      return;
    }
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

  /**
   * `identifier`: the phone number or email typed in the one sign-in field.
   * The code goes to that phone or inbox. Only an SMS code on a development
   * server ever comes back (`dev_otp`); email codes never do.
   */
  const sendOtp = async (identifier, name = '', registrationPhone = '') => {
    setAuthError('');
    setPendingPhone(identifier);
    setPendingName(name);
    const result = await sendOtpRequest(identifier, name, registrationPhone);
    setPendingPhone(result.identifier || result.phone_number);
    setOtpPreview(result.identifier_type === 'email' ? '' : result.dev_otp ?? '');
    setAuthStep('otp');
  };

  /** Re-reads the account (after verifying a new phone or email). */
  const applyCustomer = (customer) => setUser((current) => customerUser(customer, current));

  /** Signs the customer in with a session the server issued. */
  const startCustomerSession = (result) => {
    // Roles are exclusive: wipe any vendor/driver/admin session first.
    clearAllSessions();
    localStorage.setItem(ACCESS_TOKEN_KEY, result.token);
    setAccessToken(result.token);
    setUser((current) => customerUser(result.customer, current));
    setIsAuthModalOpen(false);
    setAuthStep('phone');
    setOtpPreview('');
    return true;
  };

  /**
   * Returns true when signed in as a customer, or
   * { adminVerificationRequired, challengeToken } when the server says this
   * verified phone belongs to an admin (it decides — never this app). No
   * session exists yet in that case; nothing is stored.
   */
  const verifyOtp = async (code, name = pendingName) => {
    const result = await verifyOtpRequest(pendingPhone, code, name);
    if (result.admin_verification_required) {
      setIsAuthModalOpen(false);
      setAuthStep('phone');
      setOtpPreview('');
      return { adminVerificationRequired: true, challengeToken: result.challenge_token, expiresInSeconds: result.expires_in_seconds };
    }
    return startCustomerSession(result);
  };

  /** From the admin verification screen: sign in as the customer instead. */
  const continueAsCustomer = async (challengeToken) => startCustomerSession(await continueAsCustomerRequest(challengeToken));

  const logout = () => {
    clearAllSessions();
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
    return addr;
  };

  /** Changes a saved address (e.g. adds the map pin to an address saved without one). */
  const updateAddress = (id, patch) => {
    setUser((prev) => ({
      ...prev,
      addresses: prev.addresses.map((address) => (address.id === id ? { ...address, ...patch } : address)),
    }));
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

  const updateProfile = async (profileData) => {
    setAuthError('');
    const payload = {};
    if (profileData.name !== undefined) payload.name = profileData.name;
    if (profileData.phone !== undefined) payload.phone_number = profileData.phone;
    if (profileData.email !== undefined) payload.email = String(profileData.email).trim();
    if (profileData.avatar !== undefined && profileData.avatar !== '') {
      if (String(profileData.avatar).startsWith('data:')) {
        payload.profile_image_base64 = profileData.avatar;
      } else {
        payload.profile_image_url = profileData.avatar;
      }
    }
    if (Object.keys(payload).length === 0) return user;

    const previous = user;
    setUser((prev) => ({ ...prev, ...profileData }));
    if (!accessToken) return user;

    try {
      const { customer } = await updateCurrentCustomerProfile(payload);
      setUser((prev) => customerUser(customer, prev));
      return customer;
    } catch (error) {
      // e.g. the phone or email is already used by another customer: undo the change.
      setUser(previous);
      setAuthError(error.message);
      throw error;
    }
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
    continueAsCustomer,
    logout,
    addAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    updateProfile,
    applyCustomer,
  }), [user, accessToken, isAuthModalOpen, authStep, pendingPhone, pendingName, otpPreview, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
