import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, MessagesSquare, Search } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import useFocusParam from '../../components/admin-dashboard/useFocusParam';
import VendorTypeBadge from '../../components/common/VendorTypeBadge';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  Table,
  formatDate,
} from '../../components/admin-dashboard/ui';

const EMPTY = { items: [], total: 0, page: 1, limit: 20 };

/**
 * Support: customer–kitchen chats, READ ONLY. Used when handling a complaint
 * or a refund to see what was agreed. Support never writes in these chats.
 */
export default function AdminChatsPage() {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const focusId = useFocusParam('chat');
  // A link like ?chat=<id> opens that chat once; closing it really closes it.
  useEffect(() => {
    if (focusId) setOpenId(focusId);
  }, [focusId]);
  const activeId = openId;

  const listQuery = useQuery({
    queryKey: ['admin', 'chats', applied, page],
    queryFn: () => adminApi.listChats({ search: applied || undefined, page, limit: 20 }),
    refetchInterval: 30000,
  });
  const data = listQuery.data || EMPTY;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer–Kitchen Chats"
        description="Read the conversations between customers and kitchens when handling a complaint or refund. Read only — support cannot write in these chats."
      />

      <Card bodyClassName="p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(search.trim());
            setPage(1);
          }}
          className="relative max-w-md"
        >
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer or kitchen name or phone…"
            className="pl-9"
          />
        </form>
      </Card>

      <Card bodyClassName="p-4 sm:p-5">
        {listQuery.isLoading ? (
          <LoadingBlock />
        ) : listQuery.error ? (
          <ErrorNote error={listQuery.error} />
        ) : data.items.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No chats found" description={applied ? 'Try another name or phone.' : 'No customer has messaged a kitchen yet.'} />
        ) : (
          <>
            <Table
              columns={[
                { key: 'customer', label: 'Customer' },
                { key: 'kitchen', label: 'Kitchen' },
                { key: 'last', label: 'Last message' },
                { key: 'count', label: 'Messages' },
                { key: 'actions', label: '', className: 'text-right' },
              ]}
            >
              {data.items.map((chat) => (
                <tr key={chat.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{chat.customer.name}</p>
                    <p className="text-[11px] text-stone-400">{chat.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{chat.vendor.name}</p>
                    {chat.vendor.vendor_type && <VendorTypeBadge type={chat.vendor.vendor_type} size="xs" className="mt-1" />}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-stone-700 truncate">
                      <span className="text-stone-400">{chat.last_message_role === 'vendor' ? 'Kitchen: ' : 'Customer: '}</span>
                      {chat.last_message_preview}
                    </p>
                    <p className="text-[11px] text-stone-400">{formatDate(chat.last_message_at)}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-700 font-bold">{chat.messages_count}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setOpenId(chat.id)}>
                      <Eye className="w-4 h-4" /> Read
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <ChatModal chatId={activeId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ChatModal({ chatId, onClose }) {
  const query = useQuery({
    queryKey: ['admin', 'chat', chatId],
    queryFn: () => adminApi.getChat(chatId, { limit: 200 }),
    enabled: Boolean(chatId),
  });
  const chat = query.data?.conversation;
  return (
    <Modal open={Boolean(chatId)} title={chat ? `${chat.customer.name} ↔ ${chat.vendor.name}` : 'Chat'} onClose={onClose} width="max-w-2xl">
      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorNote error={query.error} />
      ) : chat ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <Badge tone="slate">Read only</Badge>
            <span>Customer: {chat.customer.name} {chat.customer.phone ? `· ${chat.customer.phone}` : ''}</span>
            <span>·</span>
            <span>Kitchen: {chat.vendor.name} {chat.vendor.phone ? `· ${chat.vendor.phone}` : ''}</span>
          </div>
          {query.data.has_more && <p className="text-[11px] text-stone-400">Showing the latest 200 messages.</p>}
          <div className="max-h-[60vh] overflow-y-auto space-y-1.5 rounded-xl bg-stone-50 border border-stone-100 p-3">
            {query.data.messages.map((message) => {
              const fromKitchen = message.author_role === 'vendor';
              return (
                <div key={message.id} className={`flex ${fromKitchen ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words border ${fromKitchen ? 'bg-white border-stone-200' : 'bg-sky-50 border-sky-100'}`}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-0.5">
                      {fromKitchen ? chat.vendor.name : chat.customer.name}
                    </p>
                    <p className="text-gray-900">{message.body}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 text-right">{formatDate(message.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
