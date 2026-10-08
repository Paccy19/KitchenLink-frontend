import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('ofk_cart');
    return saved ? JSON.parse(saved) : [];
  });

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

  useEffect(() => {
    localStorage.setItem('ofk_cart', JSON.stringify(cartItems));
    localStorage.setItem('ofk_cart_vendor', JSON.stringify(activeVendor));
  }, [cartItems, activeVendor]);

  const addToCart = (dish, vendor, selectedOptions = {}, quantity = 1, specialInstructions = '') => {
    // Check if adding from different vendor
    if (activeVendor && activeVendor.id !== vendor.id && cartItems.length > 0) {
      setVendorConflict({
        incomingDish: dish,
        incomingVendor: vendor,
        incomingOptions: selectedOptions,
        incomingQuantity: quantity,
        incomingInstructions: specialInstructions,
        currentVendor: activeVendor
      });
      return;
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

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.itemKey === itemKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
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
            quantity,
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
  };

  const resolveConflictReplace = () => {
    if (!vendorConflict) return;
    const { incomingDish, incomingVendor, incomingOptions, incomingQuantity, incomingInstructions } = vendorConflict;
    
    setActiveVendor({
      id: incomingVendor.id,
      name: incomingVendor.name,
      type: incomingVendor.type,
      location: incomingVendor.location,
      deliveryFee: incomingVendor.deliveryFee || 1000
    });

    const itemKey = `${incomingDish.id}-${JSON.stringify(incomingOptions)}`;
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

  const updateQuantity = (itemKey, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCartItems(prev =>
      prev.map(item => item.itemKey === itemKey ? { ...item, quantity: newQuantity } : item)
    );
  };

  const removeFromCart = (itemKey) => {
    setCartItems(prev => {
      const filtered = prev.filter(item => item.itemKey !== itemKey);
      if (filtered.length === 0) {
        setActiveVendor(null);
      }
      return filtered;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveVendor(null);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = activeVendor ? activeVendor.deliveryFee : 0;
  const platformFee = cartItems.length > 0 ? 500 : 0; // 500 RWF service charge
  const grandTotal = subtotal + deliveryFee + platformFee;
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      activeVendor,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      subtotal,
      deliveryFee,
      platformFee,
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
