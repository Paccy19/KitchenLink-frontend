import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Store, Bike, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RoleSelectModal({ open, onClose }) {
  const navigate = useNavigate();
  const { openAuthModal } = useAuth();

  if (!open) return null;

  const chooseCustomer = () => {
    onClose();
    openAuthModal();
  };

  const chooseRole = (path) => {
    onClose();
    navigate(path);
  };

  const roles = [
    {
      key: 'customer',
      title: 'Customer',
      description: 'Order food from home cooks & kitchens around you',
      icon: User,
      onClick: chooseCustomer,
      accent: 'from-[#2b1206] via-[#481f0d] to-[#1c0a03]',
    },
    {
      key: 'vendor',
      title: 'Vendor',
      description: 'Sell your food, manage your menu, orders & earnings',
      icon: Store,
      onClick: () => chooseRole('/vendor-login'),
      accent: 'from-[#3d1b0c] via-[#6d391d] to-[#2b1206]',
    },
    {
      key: 'driver',
      title: 'Delivery Worker',
      description: 'Pick up & deliver orders, track your deliveries & earnings',
      icon: Bike,
      onClick: () => chooseRole('/driver-login'),
      accent: 'from-[#1c2b12] via-[#3b5327] to-[#12200b]',
    },
    {
      key: 'admin',
      title: 'Admin',
      description: 'Manage the marketplace, users, orders, payments & analytics',
      icon: ShieldCheck,
      onClick: () => chooseRole('/admin-login'),
      accent: 'from-[#111827] via-[#1f2937] to-[#0b1220]',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 sm:p-8 relative animate-scale-in border border-stone-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            How do you want to sign in?
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Choose your role and we will take you to the right login page.
          </p>
        </div>

        <div className="space-y-3">
          {roles.map((role) => (
            <button
              key={role.key}
              type="button"
              onClick={role.onClick}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-stone-200 bg-white hover:bg-[#faf6f2] hover:border-[#ebd7c5] hover:-translate-y-0.5 transition text-left group"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${role.accent} flex items-center justify-center text-white shadow-md flex-shrink-0`}
              >
                <role.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#3d1b0c] transition">
                  {role.title}
                </p>
                <p className="text-[11px] text-stone-500 leading-snug">{role.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#8a5332] group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}