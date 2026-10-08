import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { addCartItem as addRemoteCartItem, clearRemoteCart, fetchCart, removeCartItem as removeRemoteCartItem, replaceRemoteCart, updateCartItem as updateRemoteCartItem } from '../api/endpoints';
import { isMockMode } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const MAX_CART_QUANTITY = 99;

const readStoredCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('ofk_cart') ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const [cartItems, setCartItems] = useState(readStoredCart);

  const [activeVendor, setActiveVendor] = useState(() => {
    const saved = localStorage.getItem('ofk_cart_vendor');
    return saved ? JSON.parse(saved) : null;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState('immediate'); // 'immediate' | 'scheduled'
  const [scheduledDate, setScheduledDate] = useState('Tomorrow');
  const [scheduledTime, setScheduledTime] = useState('12:30 PM');
  
  // Conflict modal state when adding from a different vendor
  const [vendorConflict, setVendorConflict] = useState(null);
  const [apiError, setApiError] = useState('');
  const [isSyncing, setIsSyncing] = useState(Boolean(accessToken && !isMockMode));
  const guestCartForSync = useRef(readStoredCart());
  const previousAccessToken = useRef(accessToken);
  const cartSyncToken = useRef(null);

  const applyRemoteCart = (payload) => {
    const vendor = payload.vendor
      ? {
          id: payload.vendor.id,
          name: payload.vendor.name,
          type: payload.vendor.vendor_type,
          location: '',
          deliveryFee: payload.delivery_fee_rwf,
        }
      : null;
    setActiveVendor(vendor);
    setCartItems((payload.items ?? []).map((item) => ({
      itemKey: item.menu_item_id,
      id: item.menu_item_id,
      dishId: item.menu_item_id,
      name: item.name,
      price: item.price_rwf,
      image: item.image_url ?? '',
      quantity: item.quantity,
      selectedOptions: {},
      specialInstructions: '',
      vendorId: item.vendor_id,
      vendorName: item.vendor_name ?? vendor?.name ?? '',
      isAvailable: item.is_available,
    })));
  };

  useEffect(() => {
    if (!accessToken) {
      if (previousAccessToken.current && !isMockMode) {
        setCartItems([]);
        setActiveVendor(null);
        guestCartForSync.current = [];
      }
      previousAccessToken.current = null;
      cartSyncToken.current = null;
      return;
    }
    previousAccessToken.current = accessToken;
    if (isMockMode) return;
    if (cartSyncToken.current === accessToken) return;
    cartSyncToken.current = accessToken;
    setIsSyncing(true);
    fetchCart()
      .then(async (payload) => {
        let cart = payload;
        if (!(payload.items ?? []).length && guestCartForSync.current.length) {
          const items = guestCartForSync.current.map((item) => ({
            menu_item_id: item.dishId ?? item.id,
            quantity: item.quantity,
          }));
          cart = await replaceRemoteCart(items);
        }
        guestCartForSync.current = [];
        applyRemoteCart(cart);
      })
      .catch((error) => setApiError(error.message))
      .finally(() => setIsSyncing(false));
  }, [accessToken]);

  useEffect(() => {
    localStorage.setItem('ofk_cart', JSON.stringify(cartItems));
    localStorage.setItem('ofk_cart_vendor', JSON.stringify(activeVendor));
  }, [cartItems, activeVendor]);

  useEffect(() => {
    if (!accessToken && !isMockMode) guestCartForSync.current = cartItems;
  }, [cartItems, accessToken]);

  const addToCart = async (dish, vendor, selectedOptions = {}, quantity = 1, specialInstructions = '') => {
    const safeQuantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(Number(quantity) || 1)));

    // Check if adding from different vendor
    if (activeVendor && activeVendor.id !== vendor.id && cartItems.length > 0) {
      setIsCartOpen(true);
      setVendorConflict({
        incomingDish: dish,
        incomingVendor: vendor,
        incomingOptions: selectedOptions,
        incomingQuantity: safeQuantity,
        incomingInstructions: specialInstructions,
        currentVendor: activeVendor
      });
      return false;
    }

    if (!activeVendor) {
      setActiveVendor({
        id: vendor.id,
        name: vendor.name,
        type: vendor.type,
        location: vendor.location,
        deliveryFee: vendor.deliveryFee || 1000
      });
    }

    const itemKey = `${dish.id}-${JSON.stringify(selectedOptions)}`;

    if (accessToken && !isMockMode) {
      setApiError('');
      try {
        const response = await addRemoteCartItem(dish.id, safeQuantity);
        applyRemoteCart(response);
        setIsCartOpen(true);
        return true;
      } catch (error) {
        setApiError(error.message);
        setIsCartOpen(true);
        return false;
      }
    }

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.itemKey === itemKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity = Math.min(
          MAX_CART_QUANTITY,
          updated[existingIndex].quantity + safeQuantity,
        );
        if (specialInstructions) {
          updated[existingIndex].specialInstructions = specialInstructions;
        }
        return updated;
      } else {
        return [
          ...prev,
          {
            itemKey,
            dishId: dish.id,
            name: dish.name,
            price: dish.price,
            image: dish.image,
            quantity: safeQuantity,
            selectedOptions,
            specialInstructions,
            vendorId: vendor.id,
            vendorName: vendor.name,
            isPreorder: dish.isPreorder || false
          }
        ];
      }
    });

    setIsCartOpen(true);
    return true;
  };

  const resolveConflictReplace = async () => {
    if (!vendorConflict) return;
    const { incomingDish, incomingVendor, incomingOptions, incomingQuantity, incomingInstructions } = vendorConflict;
    
    const itemKey = `${incomingDish.id}-${JSON.stringify(incomingOptions)}`;
    if (accessToken && !isMockMode) {
      setApiError('');
      try {
        applyRemoteCart(await clearRemoteCart());
        applyRemoteCart(await addRemoteCartItem(incomingDish.id, incomingQuantity));
        setVendorConflict(null);
        setIsCartOpen(true);
      } catch (error) {
        setApiError(error.message);
        setIsCartOpen(true);
      }
      return;
    }

    setActiveVendor({
      id: incomingVendor.id,
      name: incomingVendor.name,
      type: incomingVendor.type,
      location: incomingVendor.location,
      deliveryFee: incomingVendor.deliveryFee || 1000
    });

    setCartItems([
      {
        itemKey,
        dishId: incomingDish.id,
        name: incomingDish.name,
        price: incomingDish.price,
        image: incomingDish.image,
        quantity: incomingQuantity,
        selectedOptions: incomingOptions,
        specialInstructions: incomingInstructions,
        vendorId: incomingVendor.id,
        vendorName: incomingVendor.name,
        isPreorder: incomingDish.isPreorder || false
      }
    ]);

    setVendorConflict(null);
    setIsCartOpen(true);
  };

  const resolveConflictCancel = () => {
    setVendorConflict(null);
  };

  const updateQuantity = async (itemKey, newQuantity) => {
    if (newQuantity <= 0) {
      return removeFromCart(itemKey);
    }
    const safeQuantity = Math.min(MAX_CART_QUANTITY, Math.floor(Number(newQuantity)));
    if (accessToken && !isMockMode) {
      const item = cartItems.find((cartItem) => cartItem.itemKey === itemKey);
      if (!item) return false;
      setApiError('');
      try {
        applyRemoteCart(await updateRemoteCartItem(item.dishId, safeQuantity));
        return true;
      } catch (error) {
        setApiError(error.message);
        return false;
      }
    }
    setCartItems(prev =>
      prev.map(item => item.itemKey === itemKey ? { ...item, quantity: safeQuantity } : item)
    );
    return true;
  };

  const removeFromCart = async (itemKey) => {
    if (accessToken && !isMockMode) {
      const item = cartItems.find((cartItem) => cartItem.itemKey === itemKey);
      if (!item) return false;
      setApiError('');
      try {
        applyRemoteCart(await removeRemoteCartItem(item.dishId));
        return true;
      } catch (error) {
        setApiError(error.message);
        return false;
      }
    }
    setCartItems(prev => {
      const filtered = prev.filter(item => item.itemKey !== itemKey);
      if (filtered.length === 0) {
        setActiveVendor(null);
      }
      return filtered;
    });
    return true;
  };

  const clearCart = async () => {
    if (accessToken && !isMockMode) {
      setApiError('');
      try {
        applyRemoteCart(await clearRemoteCart());
        return true;
      } catch (error) {
        setApiError(error.message);
        return false;
      }
    }
    setCartItems([]);
    setActiveVendor(null);
    return true;
  };

  const clearAfterCheckout = () => {
    setCartItems([]);
    setActiveVendor(null);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = !cartItems.length ? 0 : subtotal >= 15000 ? 0 : 1000;
  const grandTotal = subtotal + deliveryFee;
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      apiError,
      clearApiError: () => setApiError(''),
      isSyncing,
      activeVendor,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      clearAfterCheckout,
      subtotal,
      deliveryFee,
      grandTotal,
      totalItemCount,
      orderType,
      setOrderType,
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      setScheduledTime,
      vendorConflict,
      resolveConflictReplace,
      resolveConflictCancel
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
