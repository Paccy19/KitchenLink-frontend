import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addCartItem as addRemoteCartItem, clearRemoteCart, fetchCart, fetchDeliveryQuote, removeCartItem as removeRemoteCartItem, replaceRemoteCart, updateCartItem as updateRemoteCartItem } from '../api/endpoints';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';
import { useToast } from '../components/common/Toast';
import { orderingRulesFor } from '../data/vendorTypes';
import { scheduleDayOptions, scheduleTimeSlots } from '../utils/schedule';

const CartContext = createContext(null);
const MAX_CART_QUANTITY = 99;

const readStoredCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('ofk_cart') ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((item) =>
      !String(item?.dishId ?? item?.id ?? '').startsWith('dish-')
    );
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const { coords } = useLocation();
  const toast = useToast();
  const [cartItems, setCartItems] = useState(readStoredCart);

  const [activeVendor, setActiveVendor] = useState(() => {
    const saved = localStorage.getItem('ofk_cart_vendor');
    return saved ? JSON.parse(saved) : null;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState('immediate'); // 'immediate' | 'scheduled' | 'preorder'
  // 'delivery' (a delivery worker brings it) | 'pickup' (collected at the kitchen, no delivery fee)
  const [fulfillment, setFulfillment] = useState('delivery');
  const [scheduledDate, setScheduledDate] = useState('Tomorrow');
  const [scheduledTime, setScheduledTime] = useState('12:30 PM');
  // When orderType is 'preorder', this is the vendor announcement the basket
  // is being pre-ordered against (its delivery time is the order's scheduled_for).
  const [preorderSpecial, setPreorderSpecial] = useState(null);
  
  // Conflict modal state when adding from a different vendor
  const [vendorConflict, setVendorConflict] = useState(null);
  const [apiError, setApiError] = useState('');
  const [isSyncing, setIsSyncing] = useState(Boolean(accessToken));
  const guestCartForSync = useRef(readStoredCart());
  const previousAccessToken = useRef(accessToken);
  const cartSyncToken = useRef(null);
  const remoteQueue = useRef(Promise.resolve());
  const pendingRemote = useRef(0);
  const syncFailed = useRef(false);

  const applyRemoteCart = (payload) => {
    const vendor = payload.vendor
      ? {
          id: payload.vendor.id,
          name: payload.vendor.name,
          type: payload.vendor.vendor_type,
          typeCode: payload.vendor.vendor_type,
          ordering: payload.vendor.ordering,
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
      if (previousAccessToken.current) {
        setCartItems([]);
        setActiveVendor(null);
        guestCartForSync.current = [];
      }
      previousAccessToken.current = null;
      cartSyncToken.current = null;
      return;
    }
    previousAccessToken.current = accessToken;
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
    if (!accessToken) guestCartForSync.current = cartItems;
  }, [cartItems, accessToken]);

  // Signed-in changes show on screen first, then go to the server one at a
  // time in click order. The server's cart replaces the on-screen one once
  // nothing else is waiting; a failed change brings back the server's cart.
  const syncRemote = (request) => {
    setApiError('');
    pendingRemote.current += 1;
    const step = remoteQueue.current.then(() =>
      request().catch((error) => {
        syncFailed.current = true;
        setApiError(error.message);
        toast.error(error.message);
        return fetchCart().catch(() => null);
      }),
    );
    remoteQueue.current = step;
    return step.then((payload) => {
      pendingRemote.current -= 1;
      if (payload && pendingRemote.current === 0) applyRemoteCart(payload);
    });
  };

  // Checkout waits on this so the order uses the saved basket. False when a
  // change it waited for failed, so the customer can check the basket first.
  const waitForCartSync = async () => {
    if (pendingRemote.current === 0) return true;
    syncFailed.current = false;
    await remoteQueue.current;
    return !syncFailed.current;
  };

  const addItemLocally = (itemKey, dish, vendor, selectedOptions, quantity, specialInstructions) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.itemKey === itemKey);
      if (existing) {
        return prev.map(item => item.itemKey !== itemKey ? item : {
          ...item,
          quantity: Math.min(MAX_CART_QUANTITY, item.quantity + quantity),
          ...(specialInstructions ? { specialInstructions } : {}),
        });
      }
      return [
        ...prev,
        {
          itemKey,
          id: dish.id,
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          image: dish.image,
          quantity,
          selectedOptions,
          specialInstructions,
          vendorId: vendor.id,
          vendorName: vendor.name,
          isPreorder: dish.isPreorder || false
        }
      ];
    });
  };

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
        typeCode: vendor.typeCode,
        ordering: vendor.ordering,
        location: vendor.location,
        deliveryFee: vendor.deliveryFee || 1000
      });
    }

    // A basket-level pre-order target only applies to its announcing vendor.
    // Adding food from a different kitchen falls back to immediate ordering.
    if (orderType === 'preorder' && preorderSpecial?.vendorId !== vendor.id) {
      setOrderType('immediate');
      setPreorderSpecial(null);
    }

    // The account basket keys items by dish; the guest basket also by options.
    const itemKey = accessToken ? dish.id : `${dish.id}-${JSON.stringify(selectedOptions)}`;
    addItemLocally(itemKey, dish, vendor, selectedOptions, safeQuantity, specialInstructions);
    if (accessToken) syncRemote(() => addRemoteCartItem(dish.id, safeQuantity));

    setIsCartOpen(true);
    return true;
  };

  const resolveConflictReplace = async () => {
    if (!vendorConflict) return;
    const { incomingDish, incomingVendor, incomingOptions, incomingQuantity, incomingInstructions } = vendorConflict;
    
    const itemKey = accessToken ? incomingDish.id : `${incomingDish.id}-${JSON.stringify(incomingOptions)}`;
    if (accessToken) {
      syncRemote(async () => {
        await clearRemoteCart();
        return addRemoteCartItem(incomingDish.id, incomingQuantity);
      });
    }

    setActiveVendor({
      id: incomingVendor.id,
      name: incomingVendor.name,
      type: incomingVendor.type,
      typeCode: incomingVendor.typeCode,
      ordering: incomingVendor.ordering,
      location: incomingVendor.location,
      deliveryFee: incomingVendor.deliveryFee || 1000
    });

    setCartItems([
      {
        itemKey,
        id: incomingDish.id,
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
    const item = cartItems.find((cartItem) => cartItem.itemKey === itemKey);
    if (!item) return false;
    setCartItems(prev =>
      prev.map(item => item.itemKey === itemKey ? { ...item, quantity: safeQuantity } : item)
    );
    if (accessToken) syncRemote(() => updateRemoteCartItem(item.dishId, safeQuantity));
    return true;
  };

  const removeFromCart = async (itemKey) => {
    const item = cartItems.find((cartItem) => cartItem.itemKey === itemKey);
    if (!item) return false;
    if (accessToken) syncRemote(() => removeRemoteCartItem(item.dishId));
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
    if (accessToken) syncRemote(clearRemoteCart);
    setCartItems([]);
    setActiveVendor(null);
    return true;
  };

  const clearAfterCheckout = () => {
    setCartItems([]);
    setActiveVendor(null);
    setFulfillment('delivery');
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  // Delivery is priced by road distance from the kitchen to the customer, so
  // it is re-quoted whenever the kitchen or the delivery location changes.
  const isPickup = fulfillment === 'pickup';
  const quoteEnabled = Boolean(cartItems.length && activeVendor?.id && coords && !isPickup);
  const quoteQuery = useQuery({
    queryKey: ['delivery-quote', activeVendor?.id, coords?.lat, coords?.lng],
    queryFn: () => fetchDeliveryQuote(activeVendor.id, coords),
    enabled: quoteEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const deliveryFee = !cartItems.length || isPickup ? 0 : quoteQuery.data?.delivery_fee_rwf ?? null;
  const deliveryQuote = {
    distanceKm: isPickup ? null : quoteQuery.data?.distance_km ?? null,
    isPickup,
    isLoading: quoteEnabled && quoteQuery.isPending,
    isError: quoteQuery.isError,
    // Beyond the delivery workers' range a nationwide kitchen brings the food
    // itself for its travel fee; other kitchens can't deliver that far.
    kitchenDelivers: !isPickup && quoteQuery.data?.fulfillment === 'vendor_delivery',
    unavailableReason: isPickup ? null : quoteQuery.data?.unavailable_reason || null,
  };
  const grandTotal = subtotal + (deliveryFee ?? 0);
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // The kitchen type's ordering rules (advance-only, notice, days ahead,
  // minimum order, basket size) — the server enforces the same at checkout.
  const typeRules = activeVendor ? orderingRulesFor(activeVendor.ordering, activeVendor.typeCode || activeVendor.type) : null;
  // A kitchen bringing the food from far away needs the order scheduled ahead.
  const orderingRules = typeRules && deliveryQuote.kitchenDelivers ? { ...typeRules, orderNow: false } : typeRules;
  const scheduleDays = scheduleDayOptions(orderingRules);
  const scheduleSlots = scheduleTimeSlots(scheduledDate, orderingRules);

  // Advance-only kitchens (caterers, chefs, meal-prep) can't take orders for
  // now, and a picked day/time must stay inside the kitchen's window.
  useEffect(() => {
    if (!orderingRules || !cartItems.length) return;
    if (!orderingRules.orderNow && orderType === 'immediate') setOrderType('scheduled');
    if (orderType !== 'scheduled') return;
    if (scheduleDays.length && !scheduleDays.some((day) => day.value === scheduledDate)) {
      setScheduledDate(scheduleDays[0].value);
    } else if (scheduleSlots.length && !scheduleSlots.includes(scheduledTime)) {
      setScheduledTime(scheduleSlots[0]);
    }
  });

  return (
    <CartContext.Provider value={{
      cartItems,
      apiError,
      clearApiError: () => setApiError(''),
      isSyncing,
      activeVendor,
      orderingRules,
      scheduleDays,
      scheduleSlots,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      clearAfterCheckout,
      waitForCartSync,
      subtotal,
      deliveryFee,
      deliveryQuote,
      grandTotal,
      totalItemCount,
      orderType,
      setOrderType,
      fulfillment,
      setFulfillment,
      scheduledDate,
      setScheduledDate,
      scheduledTime,
      setScheduledTime,
      preorderSpecial,
      setPreorderSpecial,
      vendorConflict,
      resolveConflictReplace,
      resolveConflictCancel
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

export const deliveryFeeLabel = (quote) => {
  if (quote?.isPickup) return 'Delivery fee (you pick up)';
  const name = quote?.kitchenDelivers ? "Kitchen's travel fee" : 'Delivery fee';
  return quote?.distanceKm != null ? `${name} (${quote.distanceKm} km)` : name;
};

export const deliveryFeeValue = (fee, quote) => {
  if (quote?.isPickup) return 'Free';
  if (quote?.isLoading) return 'Calculating…';
  if (quote?.unavailableReason) return 'Too far';
  if (fee == null) return 'Unavailable';
  return `${fee.toLocaleString()} RWF`;
};
