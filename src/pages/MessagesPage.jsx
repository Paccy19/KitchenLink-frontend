import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import ChatCenter from '../components/chat/ChatCenter';
import { chatApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

/** Customer messages: chats with kitchens (`?chat=<id>` opens one). */
export default function MessagesPage() {
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#542813] transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>
      {isAuthenticated ? (
        <ChatCenter
          api={chatApi}
          side="customer"
          emptyMessage="No chats yet. Open a kitchen and tap “Message kitchen” to ask about a dish, an order or delivery."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-10 text-center">
          <MessageCircle className="w-10 h-10 text-[#542813] mx-auto" />
          <h1 className="mt-3 text-xl font-black text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in to chat with kitchens.</p>
          <button
            type="button"
            onClick={openAuthModal}
            className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] text-white font-bold text-sm"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
