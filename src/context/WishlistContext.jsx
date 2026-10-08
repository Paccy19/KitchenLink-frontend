import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'ofk_wishlist';

const readWishlist = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved)
      ? saved.filter((entry) => entry?.dish?.id && entry?.vendor?.id)
      : [];
  } catch {
    return [];
  }
};

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(readWishlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToWishlist = useCallback((dish, vendor) => {
    setItems((current) => {
      if (current.some((entry) => entry.dish.id === dish.id)) return current;
      return [...current, { dish, vendor, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromWishlist = useCallback((dishId) => {
    setItems((current) => current.filter((entry) => entry.dish.id !== dishId));
  }, []);

  const isInWishlist = useCallback(
    (dishId) => items.some((entry) => entry.dish.id === dishId),
    [items],
  );

  const value = useMemo(
    () => ({ items, addToWishlist, removeFromWishlist, isInWishlist }),
    [items, addToWishlist, removeFromWishlist, isInWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within <WishlistProvider>');
  return context;
}
