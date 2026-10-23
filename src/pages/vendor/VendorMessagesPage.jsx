import React from 'react';
import ChatCenter from '../../components/chat/ChatCenter';
import { vendorApi } from '../../api/vendorApi';

/** Kitchen messages: chats with customers (`?chat=<id>` opens one). */
export default function VendorMessagesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h1>
        <p className="text-sm text-stone-500 mt-0.5">Customers can message you about dishes, orders and delivery. Reply quickly — it helps them order.</p>
      </div>
      <ChatCenter
        api={vendorApi.chats}
        side="vendor"
        emptyMessage="No messages yet. When a customer writes to your kitchen, the chat appears here."
      />
    </div>
  );
}
