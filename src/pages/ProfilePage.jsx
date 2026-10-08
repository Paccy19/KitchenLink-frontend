import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  ListOrdered, 
  Check, 
  Smartphone,
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';

export default function ProfilePage() {
  const { 
    user, 
    updateProfile, 
    addAddress, 
    deleteAddress, 
    setDefaultAddress 
  } = useAuth();
  const { complaints } = useOrders();

  const [activeTab, setActiveTab] = useState('addresses'); // 'addresses' | 'payments' | 'complaints'
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email || '');

  // Add Address Form
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [title, setTitle] = useState('Home');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('Kimironko, Gasabo');
  const [instructions, setInstructions] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({ name, phone, email });
    setIsEditing(false);
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!street) return;
    addAddress({ title, street, district, city: 'Kigali', instructions });
    setShowAddAddr(false);
    setStreet('');
    setInstructions('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-[#ebd7c5]"
          />
          <div>
            <h1 className="text-2xl font-black text-gray-900">{user.name}</h1>
            <p className="text-xs text-stone-500 font-medium mt-0.5">{user.phone} · {user.email}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Verified Customer Account
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to="/orders"
            className="px-4 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <ListOrdered className="w-4 h-4 text-[#6d391d]" />
            <span>Order History</span>
          </Link>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>
      </div>

      {/* Profile Edit Form if active */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm mb-8 space-y-4 animate-scale-in">
          <h3 className="font-extrabold text-gray-900 text-sm">Edit Personal Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 outline-none focus:border-[#542813] transition"
              />
            </div>
          </div>
          <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95">
            Save Changes
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 mb-6 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'addresses'
              ? 'border-[#542813] text-[#542813]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-[#8a5332]" />
          <span>Saved Addresses ({user.addresses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-[#542813] text-[#542813]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Methods</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'complaints'
              ? 'border-[#542813] text-[#542813]'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Support & Complaints ({complaints.length})</span>
        </button>
      </div>

      {/* Tab 1: Saved Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-gray-900">Your Delivery Addresses</h3>
            {!showAddAddr && (
              <button
                onClick={() => setShowAddAddr(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-[#2b1206] to-[#542813] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            )}
          </div>

          {showAddAddr && (
            <form onSubmit={handleAddAddress} className="p-5 bg-white rounded-3xl border border-stone-200 space-y-3 animate-scale-in">
              <h4 className="font-bold text-xs text-stone-800">Add New Address in Kigali</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Label (e.g. Home, Work, Aunt's House)"
                  className="p-2.5 text-xs rounded-xl border border-stone-200 outline-none focus:border-[#542813]"
                  required
                />
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="p-2.5 text-xs rounded-xl border border-stone-200 outline-none focus:border-[#542813]"
                >
                  <option value="Kimironko, Gasabo">Kimironko, Gasabo</option>
                  <option value="Remera, Gasabo">Remera, Gasabo</option>
                  <option value="Nyarutarama, Gasabo">Nyarutarama, Gasabo</option>
                  <option value="Kiyovu, Nyarugenge">Kiyovu, Nyarugenge</option>
                  <option value="Kacyiru, Gasabo">Kacyiru, Gasabo</option>
                </select>
              </div>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street name / Landmark"
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 outline-none focus:border-[#542813]"
                required
              />
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Notes for driver (gate color, doorbell, etc.)"
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200 outline-none focus:border-[#542813]"
              />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#2b1206] to-[#542813] text-white font-bold text-xs rounded-xl shadow-sm active:scale-95">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAddr(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user.addresses?.map((addr) => (
              <div
                key={addr.id}
                className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:border-[#ebd7c5] hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#8a5332]" />
                      {addr.title}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-700 font-medium">{addr.street}</p>
                  <p className="text-xs text-stone-400">{addr.district}, Kigali</p>
                  {addr.instructions && (
                    <p className="text-[11px] text-stone-500 italic mt-2">Note: {addr.instructions}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 text-xs">
                  {!addr.isDefault ? (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="font-bold text-[#542813] hover:text-[#2b1206]"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span className="text-stone-400 font-medium">Primary location</span>
                  )}
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    className="text-red-500 hover:text-red-700 p-1 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Saved Payment Methods */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-base text-gray-900">Saved Payment Channels</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user.savedPaymentMethods?.map((pay) => (
              <div key={pay.id} className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center shadow-sm">
                    {pay.type === 'Mobile Money' ? <Smartphone className="w-5 h-5 text-[#6d391d]" /> : <CreditCard className="w-5 h-5 text-[#6d391d]" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{pay.provider}</h4>
                    <p className="text-xs text-stone-500">{pay.number}</p>
                  </div>
                </div>
                {pay.isDefault && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Complaints & Support */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-base text-gray-900">Submitted Complaints & Tickets</h3>
          {complaints.length === 0 ? (
            <p className="text-xs text-stone-500">No complaints reported.</p>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div key={c.id} className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900">
                      Ticket #{c.id} · Order: {c.orderId}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 font-medium">Issue: <span className="font-bold">{c.issueType}</span></p>
                  <p className="text-xs text-stone-500">{c.description}</p>
                  {c.resolutionNote && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-xs text-emerald-800">
                      Resolution: {c.resolutionNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
