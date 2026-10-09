import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addWishlistItem, fetchWishlist, removeWishlistItem } from '../api/endpoints';
import { useAuth } from './AuthContext';

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

  const addToWishlist = useCallback(async (dish, vendor) => {
    if (accessToken) {
      setApiError('');
      try {
        const payload = await addWishlistItem(dish.id);
        setItems(normalizeWishlist(payload));
      } catch (error) {
        setApiError(error.message);
        throw error;
      }
      return;
    }
    setItems((current) => {
      if (current.some((entry) => entry.dish.id === dish.id)) return current;
      return [...current, { dish, vendor, addedAt: new Date().toISOString() }];
    });
  }, [accessToken]);

  const removeFromWishlist = useCallback(async (dishId) => {
    if (accessToken) {
      setApiError('');
      try {
        setItems(normalizeWishlist(await removeWishlistItem(dishId)));
      } catch (error) {
        setApiError(error.message);
        throw error;
      }
      return;
    }
    setItems((current) => current.filter((entry) => entry.dish.id !== dishId));
  }, [accessToken]);

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
