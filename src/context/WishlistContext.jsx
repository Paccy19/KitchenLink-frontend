import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addWishlistItem, fetchWishlist, removeWishlistItem } from '../api/endpoints';
import { useAuth } from './AuthContext';
import { useToast } from '../components/common/Toast';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'ofk_wishlist';

const readWishlist = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved)
      ? saved.filter((entry) =>
          entry?.dish?.id &&
          entry?.vendor?.id &&
          !String(entry.dish.id).startsWith('dish-')
        )
      : [];
  } catch {
    return [];
  }
};

const normalizeWishlist = (payload) => (payload.items ?? []).map((item) => ({
  dish: {
    id: item.menu_item_id,
    name: item.name,
    price: item.price_rwf,
    image: item.image_url ?? '',
    isAvailable: item.is_available,
    options: [],
  },
  vendor: {
    id: item.vendor_id,
    name: item.vendor_name || 'Kitchen',
    type: item.vendor_type || 'Food Vendor',
    location: item.vendor_neighborhood || '',
    deliveryFee: 1000,
  },
  addedAt: item.added_at,
}));

export function WishlistProvider({ children }) {
  const { accessToken } = useAuth();
  const [items, setItems] = useState(readWishlist);
  const [apiError, setApiError] = useState('');
  const previousAccessToken = useRef(accessToken);
  const guestWishlistForSync = useRef(items);
  const remoteQueue = useRef(Promise.resolve());
  const pendingRemote = useRef(0);
  const toast = useToast();

  useEffect(() => {
    if (!accessToken) {
      if (previousAccessToken.current) setItems([]);
      previousAccessToken.current = null;
      return;
    }
    previousAccessToken.current = accessToken;
    fetchWishlist()
      .then(async (payload) => {
        let wishlist = payload;
        if (!(payload.items ?? []).length && guestWishlistForSync.current.length) {
          for (const entry of guestWishlistForSync.current) {
            wishlist = await addWishlistItem(entry.dish.id);
          }
        }
        guestWishlistForSync.current = [];
        setItems(normalizeWishlist(wishlist));
        setApiError('');
      })
      .catch((error) => setApiError(error.message));
  }, [accessToken]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!accessToken) guestWishlistForSync.current = items;
  }, [items, accessToken]);

  // Signed-in changes show on screen first, then go to the server one at a
  // time in click order. The server's list replaces the on-screen one once
  // nothing else is waiting; a failed change is undone.
  const syncRemote = useCallback((request, undo) => {
    setApiError('');
    pendingRemote.current += 1;
    remoteQueue.current = remoteQueue.current
      .then(request)
      .then((payload) => {
        if (pendingRemote.current === 1) setItems(normalizeWishlist(payload));
      })
      .catch((error) => {
        undo();
        setApiError(error.message);
        toast.error(error.message);
      })
      .finally(() => {
        pendingRemote.current -= 1;
      });
  }, [toast]);

  const addToWishlist = useCallback(async (dish, vendor) => {
    const entry = { dish, vendor, addedAt: new Date().toISOString() };
    setItems((current) => (current.some((saved) => saved.dish.id === dish.id) ? current : [...current, entry]));
    if (accessToken) {
      syncRemote(
        () => addWishlistItem(dish.id),
        () => setItems((current) => current.filter((saved) => saved !== entry)),
      );
    }
  }, [accessToken, syncRemote]);

  const removeFromWishlist = useCallback(async (dishId) => {
    const removed = items.find((entry) => entry.dish.id === dishId);
    setItems((current) => current.filter((entry) => entry.dish.id !== dishId));
    if (accessToken && removed) {
      syncRemote(
        () => removeWishlistItem(dishId),
        () => setItems((current) => (current.some((entry) => entry.dish.id === dishId) ? current : [...current, removed])),
      );
    }
  }, [accessToken, items, syncRemote]);

  const isInWishlist = useCallback(
    (dishId) => items.some((entry) => entry.dish.id === dishId),
    [items],
  );

  const value = useMemo(
    () => ({ items, apiError, addToWishlist, removeFromWishlist, isInWishlist }),
    [items, apiError, addToWishlist, removeFromWishlist, isInWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within <WishlistProvider>');
  return context;
}
