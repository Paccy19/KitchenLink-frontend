import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Clock, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function FoodItemModal({ item, vendor, isOpen, onClose }) {
  if (!isOpen || !item) return null;

  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const defaults = {};
    if (item.options) {
      item.options.forEach((opt) => {
        defaults[opt.name] = opt.choices[0];
      });
    }
    return defaults;
  });
  const [instructions, setInstructions] = useState('');

  const handleOptionChange = (optionName, choice) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: choice
    }));
  };

  const handleAddToCart = () => {
    addToCart(item, vendor, selectedOptions, quantity, instructions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md text-gray-700 hover:text-black flex items-center justify-center shadow-md transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Image */}
        <div className="relative h-56 w-full bg-gray-100">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-600 text-white inline-block mb-1.5">
              {item.category}
            </span>
            <h3 className="text-xl sm:text-2xl font-black leading-snug drop-shadow-sm">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Price & Prep Time */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <div className="text-2xl font-black text-orange-600">
                {item.price.toLocaleString()} RWF
              </div>
              <div className="text-xs text-gray-500 font-medium">
                from {vendor.name} ({vendor.type})
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>{item.prepTime}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {item.description}
          </p>

          {/* Pre-order notification badge */}
          {item.isPreorder && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Scheduled Pre-Order Special: </span>
                {item.preorderCutoff || 'Prepared specially for tomorrow'}
              </div>
            </div>
          )}

          {/* Options & Customizations */}
          {item.options && item.options.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Customize Your Dish
              </h4>
              {item.options.map((option, idx) => (
                <div key={idx} className="space-y-2">
                  <label className="text-xs font-bold text-gray-800">
                    {option.name}:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {option.choices.map((choice, cIdx) => {
                      const isSelected = selectedOptions[option.name] === choice;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => handleOptionChange(option.name, choice)}
                          className={`text-left text-xs px-3 py-2 rounded-xl border transition ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 font-bold text-orange-700'
                              : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Special Cooking Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Special Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="E.g. Extra spicy Akabanga, sauce on the side, no onions, etc."
              rows={2}
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer with Quantity & Add Button */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          {/* Quantity selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
              disabled={quantity <= 1}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-black text-gray-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to cart submit */}
          <button
            onClick={handleAddToCart}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Cart · {(item.price * quantity).toLocaleString()} RWF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
