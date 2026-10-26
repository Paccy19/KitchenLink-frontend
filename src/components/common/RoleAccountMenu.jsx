import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  User,
  ListOrdered,
  Wallet,
  ExternalLink,
  Store,
  LayoutDashboard,
  Navigation,
  History,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import FadeImage from './FadeImage';
import { useVendor } from '../../context/VendorContext';
import { useDriver } from '../../context/DriverContext';
import { useAdmin } from '../../context/AdminContext';

const LINK_CLASS =
  'flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#faf6f2] hover:text-[#542813] transition';

export default function RoleAccountMenu({ role }) {
  const vendorCtx = useVendor();
  const driverCtx = useDriver();
  const adminCtx = useAdmin();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const close = () => setOpen(false);

  const isVendor = role === 'vendor';
  const isAdmin = role === 'admin';
  const vendor = vendorCtx.vendor;
  const driver = driverCtx.driver;
  const admin = adminCtx.admin;

  const name = isVendor
    ? vendor?.name || 'Your Kitchen'
    : isAdmin
      ? admin?.name || 'Administrator'
      : driver?.name || 'Delivery worker';
  const avatar = isVendor ? vendor?.avatar : isAdmin ? null : driver?.avatar;
  const subtitle = isVendor
    ? vendor?.ownerName || vendor?.type || 'Vendor account'
    : isAdmin
      ? admin?.email || 'Admin account'
      : driver?.phone || 'Delivery worker account';
  const initials = String(name || 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const enterMarketplace = isVendor ? vendorCtx.enterMarketplace : driverCtx.enterMarketplace;
  const logout = isVendor ? vendorCtx.logout : isAdmin ? adminCtx.logout : driverCtx.logout;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        className="flex items-center gap-2 p-1 sm:pl-1 sm:pr-3 sm:py-1 rounded-xl bg-stone-50 hover:bg-[#faf6f2] border border-stone-200 transition"
      >
        <FadeImage
          src={avatar}
          alt={name}
          priority
          className={`w-9 h-9 rounded-full object-cover ring-2 ${
            isVendor ? 'ring-[#ebd7c5]' : isAdmin ? 'ring-stone-300' : 'ring-[#d9e5d0]'
          }`}
          fallback={
            <span
              className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-black ring-2 ${
                isVendor
                  ? 'bg-[#542813] ring-[#ebd7c5]'
                  : isAdmin
                    ? 'bg-gradient-to-br from-[#111827] to-[#0b1220] ring-stone-300'
                    : 'bg-gradient-to-br from-[#3b5327] to-[#1c2b12] ring-[#d9e5d0]'
              }`}
            >
              {initials}
            </span>
          }
        />
        <ChevronDown className="hidden sm:inline w-3.5 h-3.5 text-stone-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-100 py-2 z-50 animate-fade-in">
          <div className="px-4 py-2 border-b border-stone-100">
            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
            <p className="text-xs text-stone-500 truncate">{subtitle}</p>
          </div>

          {isVendor ? (
            <>
              <Link to="/vendor-dashboard/orders" onClick={close} className={LINK_CLASS}>
                <ListOrdered className="w-4 h-4 text-stone-400" />
                <span>Order History</span>
              </Link>
              <Link to="/vendor-dashboard/profile" onClick={close} className={LINK_CLASS}>
                <User className="w-4 h-4 text-stone-400" />
                <span>Profile</span>
              </Link>
              <Link to="/vendor-dashboard/wallet" onClick={close} className={LINK_CLASS}>
                <Wallet className="w-4 h-4 text-stone-400" />
                <span>Earnings</span>
              </Link>
              {vendor?.id && (
                <Link
                  to={`/vendor/${vendor.id}`}
                  onClick={() => {
                    close();
                    enterMarketplace?.();
                  }}
                  className={LINK_CLASS}
                >
                  <ExternalLink className="w-4 h-4 text-stone-400" />
                  <span>View public storefront</span>
                </Link>
              )}
              <Link
                to="/vendors"
                onClick={() => {
                  close();
                  enterMarketplace?.();
                }}
                className={LINK_CLASS}
              >
                <Store className="w-4 h-4 text-stone-400" />
                <span>Visit marketplace</span>
              </Link>
            </>
          ) : isAdmin ? (
            <>
              <Link to="/admin-dashboard" onClick={close} className={LINK_CLASS}>
                <LayoutDashboard className="w-4 h-4 text-stone-400" />
                <span>Admin Dashboard</span>
              </Link>
              <Link to="/admin-dashboard/settings" onClick={close} className={LINK_CLASS}>
                <Settings className="w-4 h-4 text-stone-400" />
                <span>Panel Settings</span>
              </Link>
              <Link to="/vendors" onClick={close} className={LINK_CLASS}>
                <Store className="w-4 h-4 text-stone-400" />
                <span>Visit marketplace</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/driver-dashboard" onClick={close} className={LINK_CLASS}>
                <LayoutDashboard className="w-4 h-4 text-stone-400" />
                <span>Dashboard</span>
              </Link>
              <Link to="/driver-dashboard/active" onClick={close} className={LINK_CLASS}>
                <Navigation className="w-4 h-4 text-stone-400" />
                <span>Active Delivery</span>
              </Link>
              <Link to="/driver-dashboard/history" onClick={close} className={LINK_CLASS}>
                <History className="w-4 h-4 text-stone-400" />
                <span>Delivery History</span>
              </Link>
              <Link to="/driver-dashboard/earnings" onClick={close} className={LINK_CLASS}>
                <Wallet className="w-4 h-4 text-stone-400" />
                <span>Earnings</span>
              </Link>
              <Link to="/driver-dashboard/profile" onClick={close} className={LINK_CLASS}>
                <Settings className="w-4 h-4 text-stone-400" />
                <span>Profile &amp; Settings</span>
              </Link>
              <Link
                to="/vendors"
                onClick={() => {
                  close();
                  enterMarketplace?.();
                }}
                className={LINK_CLASS}
              >
                <Store className="w-4 h-4 text-stone-400" />
                <span>Visit marketplace</span>
              </Link>
            </>
          )}

          <div className="border-t border-stone-100 my-1"></div>

          <button
            type="button"
            onClick={() => {
              close();
              logout?.();
            }}
            className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
