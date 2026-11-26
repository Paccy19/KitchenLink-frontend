import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Minus, Plus, ShoppingBag, UtensilsCrossed, CheckCircle2, Clock, X, Receipt } from 'lucide-react';
import { fetchTableMenu, openTableSession, placeTableOrder, fetchTableOrder } from '../api/tableApi';
import useAutoRefresh from '../hooks/useAutoRefresh';
import ModalPortal from '../components/common/ModalPortal';
import MenuPhotos from '../components/common/MenuPhotos';

const money = (value) => `RWF ${Math.round(Number(value) || 0).toLocaleString('en-US')}`;
const cartKey = (token) => `ofk_table_cart_${token}`;
const ordersKey = (token) => `ofk_table_orders_${token}`;
const sessionKey = (token) => `ofk_table_session_${token}`;
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const STATUS_TONE = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  accepted: 'bg-sky-50 text-sky-700 border-sky-200',
  preparing: 'bg-orange-50 text-orange-700 border-orange-200',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

/**
 * A QR opens the kitchen's unified menu. Seat QR codes also open an
 * independently owned customer session; each customer can place several
 * orders without selecting or exposing another guest's session.
 */
export default function TableMenuPage() {
  const { token } = useParams();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [seatSession, setSeatSession] = useState(null);
  const [seatSessionError, setSeatSessionError] = useState('');
  const [department, setDepartment] = useState('');
  const [cart, setCart] = useState(() => read(cartKey(token), []));
  const [myOrders, setMyOrders] = useState(() => read(ordersKey(token), []));
  const [choosing, setChoosing] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMenu(null);
    setError('');
    setSeatSession(null);
    setSeatSessionError('');
    fetchTableMenu(token)
      .then(async (result) => {
        if (cancelled) return;
        setMenu(result);
        if (!result.table.seat || !result.ordering.can_order) return;
        try {
          const savedKey = localStorage.getItem(sessionKey(token)) || '';
          const session = await openTableSession(token, {}, savedKey);
          if (cancelled) return;
          if (session.session_key) localStorage.setItem(sessionKey(token), session.session_key);
          setSeatSession(session);
        } catch (err) {
          if (!cancelled) setSeatSessionError(err.message);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, [token]);
  useEffect(() => {
    setCart(read(cartKey(token), []));
    setMyOrders(read(ordersKey(token), []));
    setDepartment('');
  }, [token]);
  useEffect(() => localStorage.setItem(cartKey(token), JSON.stringify(cart)), [cart, token]);
  useEffect(() => localStorage.setItem(ordersKey(token), JSON.stringify(myOrders.slice(-10))), [myOrders, token]);

  const departments = menu?.departments || [];
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const groups = useMemo(() => {
    const list = menu?.kitchen?.menu || [];
    return list
      .map((group) => ({ ...group, items: group.items.filter((item) => !department || item.department_id === department) }))
      .filter((group) => group.items.length);
  }, [menu, department]);

  const addLine = (item, optionIds = [], note = '') => {
    const options = item.options.filter((o) => optionIds.includes(o.id));
    const unit = item.price_rwf + options.reduce((s, o) => s + (o.additional_price_rwf || 0), 0);
    const key = `${item.id}|${[...optionIds].sort().join(',')}|${note}`;
    setCart((lines) => {
      const found = lines.find((l) => l.key === key);
      if (found) return lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l));
      return [...lines, { key, menu_item_id: item.id, name: item.name, unit, quantity: 1, option_ids: optionIds, options: options.map((o) => o.name), note, department: deptName.get(item.department_id) || '' }];
    });
  };
  const change = (key, delta) => setCart((lines) => lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));
  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const estimate = cart.reduce((s, l) => s + l.unit * l.quantity, 0);
  const canOrder = Boolean(orderingCanOrder(menu) && (!menu?.table?.seat || seatSession));

  if (error && !menu) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <UtensilsCrossed className="w-10 h-10 mx-auto text-stone-400" />
        <p className="mt-4 font-black text-lg text-gray-900">{error}</p>
      </div>
    );
  }
  if (!menu) {
    return (
      <div className="py-24 flex justify-center text-stone-400">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }
  const { kitchen, table, ordering } = menu;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-32">
      <header className="pt-6 pb-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#c2410c]">{table.label}{table.area ? ` · ${table.area}` : ''}</p>
        <h1 className="text-2xl font-black text-gray-900">{kitchen.name}</h1>
        {table.seat && (
          <p className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-3 py-2">
            Seat {table.seat.number} · Your orders are kept separate from other guests at this table.
          </p>
        )}
        {seatSessionError && (
          <p role="alert" className="mt-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-3 py-2">
            {seatSessionError}
          </p>
        )}
        {!ordering.can_order ? (
          <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-3 py-2">{ordering.reason}</p>
        ) : (
          <p className="text-xs text-stone-500 mt-1">
            Order from any of our services — everything comes to your table. {ordering.pay_before_preparation ? 'Please pay at the counter before we start preparing.' : `You pay ${ordering.payment_timing_label.toLowerCase()}.`}
          </p>
        )}
      </header>

      {myOrders.length > 0 && <MyOrders token={token} orders={myOrders} />}

      <MenuPhotos photos={kitchen.menu_photos || []} />

      {departments.length > 1 && (
        <div className="sticky top-16 z-20 bg-gray-50/95 backdrop-blur py-2 -mx-4 px-4 flex gap-2 overflow-x-auto">
          {[{ id: '', name: 'Everything' }, ...departments].map((d) => (
            <button key={d.id || 'all'} type="button" onClick={() => setDepartment(d.id)} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold border ${department === d.id ? 'bg-[#2b1206] text-white border-[#2b1206]' : 'bg-white text-stone-700 border-stone-200'}`}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.category} className="mt-5">
          <h2 className="font-black text-gray-900 mb-2">{group.category}</h2>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-2xl bg-white border border-stone-200/80 p-3">
                {item.image_url && <img src={item.image_url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" loading="lazy" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  {item.description && <p className="text-xs text-stone-500 line-clamp-2">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-black text-sm">{money(item.price_rwf)}</span>
                    {canOrder && (
                      <button type="button" onClick={() => (item.options.length ? setChoosing(item) : addLine(item))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f28c18] text-white text-xs font-black active:scale-95">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                  {departments.length > 1 && deptName.get(item.department_id) && <p className="text-[10px] text-stone-400 mt-1">{deptName.get(item.department_id)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {count > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-30 max-w-3xl mx-auto">
          <button type="button" onClick={() => setCartOpen(true)} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-[#2b1206] text-white shadow-2xl">
            <span className="flex items-center gap-2 font-black"><ShoppingBag className="w-5 h-5" /> {count} item{count === 1 ? '' : 's'}</span>
            <span className="font-black">View order · {money(estimate)}</span>
          </button>
        </div>
      )}

      {choosing && <OptionsSheet item={choosing} onClose={() => setChoosing(null)} onAdd={(ids, note) => { addLine(choosing, ids, note); setChoosing(null); }} />}
      {cartOpen && (
        <CartSheet
          token={token}
          table={table}
          cart={cart}
          estimate={estimate}
          onChange={change}
          onClose={() => setCartOpen(false)}
          sessionKey={localStorage.getItem(sessionKey(token)) || ''}
          onPlaced={(placed) => {
            setMyOrders((list) => [...list, { id: placed.order.id, key: placed.guest_key, number: placed.order.order_number }]);
            setCart([]);
            setCartOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}

function orderingCanOrder(menu) {
  return Boolean(menu?.ordering?.can_order);
}

function Sheet({ title, onClose, children }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full sm:max-w-md max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg">{title}</h3>
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

function OptionsSheet({ item, onClose, onAdd }) {
  const [ids, setIds] = useState([]);
  const [note, setNote] = useState('');
  const groups = item.options.reduce((map, o) => map.set(o.group_name, [...(map.get(o.group_name) || []), o]), new Map());
  return (
    <Sheet title={item.name} onClose={onClose}>
      {[...groups.entries()].map(([name, options]) => (
        <div key={name} className="mb-3">
          <p className="text-xs font-black uppercase text-stone-500 mb-1">{name}</p>
          {options.map((o) => (
            <label key={o.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={ids.includes(o.id)} onChange={() => setIds((l) => (l.includes(o.id) ? l.filter((x) => x !== o.id) : [...l, o.id]))} /> {o.name}
              </span>
              {o.additional_price_rwf > 0 && <span className="text-stone-500">+{money(o.additional_price_rwf)}</span>}
            </label>
          ))}
        </div>
      ))}
      <input className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm" placeholder="Anything to tell the kitchen?" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} />
      <button type="button" onClick={() => onAdd(ids, note.trim())} className="mt-4 w-full py-3 rounded-xl bg-[#f28c18] text-white font-black">Add to order</button>
    </Sheet>
  );
}

function CartSheet({ token, table, cart, estimate, sessionKey, onChange, onClose, onPlaced }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const placed = await placeTableOrder(token, {
        guest_name: name.trim() || undefined,
        items: cart.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity, option_ids: l.option_ids, note: l.note || undefined })),
      }, sessionKey);
      onPlaced(placed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title={`Your order · ${table.label}`} onClose={onClose}>
      <ul className="divide-y divide-stone-100">
        {cart.map((l) => (
          <li key={l.key} className="py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{l.name}</p>
              <p className="text-[11px] text-stone-500">{[l.department, ...l.options, l.note].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="One less" onClick={() => onChange(l.key, -1)} className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
              <span className="w-5 text-center font-black">{l.quantity}</span>
              <button type="button" aria-label="One more" onClick={() => onChange(l.key, 1)} className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-3 font-black"><span>Estimated total</span><span>{money(estimate)}</span></div>
      <p className="text-[11px] text-stone-400">The kitchen confirms the final price on your bill.</p>
      <input className="mt-4 w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm" placeholder="Your name (optional)" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <button type="button" disabled={busy || !cart.length} onClick={submit} className="mt-4 w-full py-3.5 rounded-xl bg-[#2b1206] text-white font-black disabled:opacity-50 inline-flex justify-center items-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send order to the kitchen
      </button>
    </Sheet>
  );
}

function MyOrders({ token, orders }) {
  const [views, setViews] = useState({});
  const load = useCallback(async () => {
    const results = await Promise.all(orders.map((o) => fetchTableOrder(token, o.id, o.key).then((r) => [o.id, r.order]).catch(() => [o.id, null])));
    setViews(Object.fromEntries(results));
  }, [token, orders]);
  useEffect(() => {
    load();
  }, [load]);
  useAutoRefresh(load, { intervalMs: 8000 });
  const live = orders.map((o) => views[o.id]).filter(Boolean);
  if (!live.length) return null;
  const bill = live[live.length - 1].bill;
  return (
    <section className="mb-4 space-y-3">
      {live.slice().reverse().map((order) => (
        <div key={order.id} className="rounded-2xl bg-white border border-stone-200/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-black text-sm">{order.order_number}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${order.status === 'delivered' ? STATUS_TONE.ready : STATUS_TONE.pending}`}>
              {order.status === 'delivered' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {order.status_label}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {order.departments.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black text-gray-900">{d.department_name}</p>
                  <p className="text-[11px] text-stone-500">{d.items.map((i) => `${i.quantity}× ${i.name}${i.service_status === 'served' ? ' ✓' : ''}`).join(', ')}</p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_TONE[d.status]}`}>{d.status_label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {bill && (
        <div className="rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] p-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-bold"><Receipt className="w-4 h-4" /> Your bill {bill.invoice_number}</span>
          <span className="font-black">{bill.balance_due_rwf > 0 ? `${money(bill.balance_due_rwf)} to pay` : 'Paid — thank you'}</span>
        </div>
      )}
    </section>
  );
}
