import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Minus, Plus, ShoppingBag, UtensilsCrossed, CheckCircle2, Clock, X, Receipt, BellRing, Star, Tag, Users, ShieldCheck } from 'lucide-react';
import {
  fetchTableMenu,
  openTableSession,
  placeTableOrder,
  fetchTableOrder,
  sendTableRequest,
  fetchTableRequests,
  sendTableFeedback,
  fetchTablePaymentSeats,
  authorizeTablePayment,
  acceptTablePaymentAuthorization,
  revokeTablePaymentAuthorization,
  startTablePayment,
  checkTablePayment,
} from '../api/tableApi';
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
        if (!result.table.seat) return;
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

      {ordering.can_order && <TableRequests token={token} />}

      {(menu.promotions || []).length > 0 && (
        <div className="mb-4 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-900 space-y-1">
          {menu.promotions.map((p) => (
            <p key={p.name} className="flex items-center gap-2 font-bold">
              <Tag className="w-4 h-4" /> {p.name}: {p.label}
              {p.applies_to === 'departments' ? ` on ${p.department_ids.map((id) => deptName.get(id)).filter(Boolean).join(', ')}` : p.applies_to === 'products' ? ' on selected dishes' : ''}
              {p.min_order_rwf ? ` (bills from ${money(p.min_order_rwf)})` : ''}
            </p>
          ))}
          <p className="text-[11px] text-orange-700">Taken off your bill automatically.</p>
        </div>
      )}

      {myOrders.length > 0 && <MyOrders token={token} orders={myOrders} />}
      {table.seat && seatSession && (
        <SeatPaymentPanel token={token} sessionKey={seatSession.session_key || localStorage.getItem(sessionKey(token)) || ''} ownSeatNumber={seatSession.seat_number} />
      )}

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

/** "Call the waiter" / "Bring the bill" from the table. */
function TableRequests({ token }) {
  const [open, setOpen] = useState([]);
  const [busy, setBusy] = useState('');
  const load = useCallback(() => fetchTableRequests(token).then((r) => setOpen(r.requests || [])).catch(() => null), [token]);
  useEffect(() => {
    load();
  }, [load]);
  useAutoRefresh(load, { intervalMs: 15000 });
  const ask = async (kind) => {
    setBusy(kind);
    try {
      await sendTableRequest(token, { kind });
      await load();
    } catch {
      /* the button simply stays available */
    } finally {
      setBusy('');
    }
  };
  const pending = (kind) => open.find((r) => r.kind === kind);
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      {[['call_waiter', 'Call the waiter'], ['request_bill', 'Bring the bill']].map(([kind, label]) => {
        const req = pending(kind);
        return (
          <button key={kind} type="button" disabled={Boolean(req) || busy === kind} onClick={() => ask(kind)} className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black border ${req ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-gray-900'}`}>
            {busy === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
            {req ? (req.status === 'acknowledged' ? 'On the way' : 'Asked') : label}
          </button>
        );
      })}
    </div>
  );
}

/** Rating a served order (once). */
function RateOrder({ token, order, guestKey }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [state, setState] = useState('');
  if (state === 'done') return <p className="mt-3 text-xs font-bold text-emerald-700">Thank you for your rating!</p>;
  const send = async () => {
    setState('busy');
    try {
      await sendTableFeedback(token, order.id, guestKey, { rating, comment, is_public: isPublic });
      setState('done');
    } catch (err) {
      setState(err.code === 'FEEDBACK_EXISTS' ? 'done' : `error:${err.message}`);
    }
  };
  return (
    <div className="mt-3 rounded-xl bg-stone-50 p-3 space-y-2">
      <p className="text-xs font-black">How was it?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)}><Star className={`w-6 h-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} /></button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <input className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm" placeholder="Anything to tell us? (optional)" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Show it on the kitchen's page</label>
          {state.startsWith('error:') && <p className="text-xs text-red-600">{state.slice(6)}</p>}
          <button type="button" disabled={state === 'busy'} onClick={send} className="px-4 py-2 rounded-xl bg-[#2b1206] text-white text-xs font-black">Send</button>
        </>
      )}
    </div>
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
          {order.status === 'delivered' && <RateOrder token={token} order={order} guestKey={orders.find((o) => o.id === order.id)?.key} />}
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

const SEAT_PAYMENT_STATUS = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  payment_pending: 'Payment pending',
  paid: 'Paid',
  staff_reconciliation_required: 'Ask the cashier to reconcile this bill',
};

function SeatPaymentPanel({ token, sessionKey, ownSeatNumber }) {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState({});
  const [phone, setPhone] = useState('');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [activePayment, setActivePayment] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchTablePaymentSeats(token, sessionKey);
    setSeats(result.seats || []);
    setError('');
    setLoading(false);
  }, [token, sessionKey]);

  useEffect(() => {
    let active = true;
    fetchTablePaymentSeats(token, sessionKey)
      .then((result) => {
        if (active) {
          setSeats(result.seats || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [token, sessionKey]);
  useAutoRefresh(() => load().catch((err) => setError(err.message)), { intervalMs: 10000 });

  useEffect(() => {
    if (activePayment?.status !== 'processing') return undefined;
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const result = await checkTablePayment(token, activePayment.id, sessionKey);
        if (!active) return;
        setActivePayment(result);
        if (result.status !== 'processing') {
          sessionStorage.removeItem(`ofk_table_payment_attempt_${token}`);
          setMessage(result.status === 'successful'
            ? `Payment confirmed. Reference: ${result.reference}`
            : 'Payment failed. Your seat balances are still due.');
          await load();
          return;
        }
      } catch (err) {
        if (active) setError(`${err.message} The payment is still being checked; do not submit it again.`);
      }
      if (active) timer = window.setTimeout(poll, 5000);
    };
    timer = window.setTimeout(poll, 4000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activePayment?.id, activePayment?.status, token, sessionKey, load]);

  const total = seats.reduce((sum, seat) => (
    selected[seat.customer_session_id]
      ? sum + (Number(selected[seat.customer_session_id]) || 0)
      : sum
  ), 0);

  const toggleSeat = (seat) => {
    setSelected((current) => {
      if (current[seat.customer_session_id]) {
        const next = { ...current };
        delete next[seat.customer_session_id];
        return next;
      }
      return { ...current, [seat.customer_session_id]: seat.balance_rwf };
    });
  };

  const createAuthorization = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await authorizeTablePayment(token, sessionKey);
      setGeneratedCode(result);
      setMessage('Share this one-time code with the person you authorize. It expires in 15 minutes.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const joinAuthorization = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await acceptTablePaymentAuthorization(token, authorizationCode.trim(), sessionKey);
      setAuthorizationCode('');
      setMessage('Permission accepted. The authorized seat is now available in the payment list.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revokeAuthorization = async () => {
    if (!generatedCode?.authorization_id) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await revokeTablePaymentAuthorization(token, generatedCode.authorization_id, sessionKey);
      setGeneratedCode(null);
      setMessage('Payment permission revoked.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const paySelectedSeats = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const paymentSeats = seats
        .filter((seat) => selected[seat.customer_session_id])
        .map((seat) => ({
          customer_session_id: seat.customer_session_id,
          amount_rwf: Number(selected[seat.customer_session_id]),
          balance_version: seat.balance_version,
        }));
      const body = {
        seats: paymentSeats,
        payment_details: { phone },
      };
      const fingerprint = JSON.stringify({ seats: paymentSeats, phone: phone.trim() });
      const attemptKey = `ofk_table_payment_attempt_${token}`;
      let savedAttempt = null;
      try {
        savedAttempt = JSON.parse(sessionStorage.getItem(attemptKey) || 'null');
      } catch {
        savedAttempt = null;
      }
      const idempotencyKey = savedAttempt?.fingerprint === fingerprint
        ? savedAttempt.key
        : (window.crypto?.randomUUID?.() || `seat-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`);
      sessionStorage.setItem(attemptKey, JSON.stringify({ fingerprint, key: idempotencyKey }));
      const result = await startTablePayment(token, { ...body, idempotency_key: idempotencyKey }, sessionKey);
      setActivePayment(result);
      if (result.status === 'successful') {
        sessionStorage.removeItem(attemptKey);
        setMessage(`Payment confirmed. Reference: ${result.reference}`);
        await load();
      } else if (result.status === 'failed') {
        sessionStorage.removeItem(attemptKey);
        setMessage('Payment failed. Your seat balances are still due.');
      } else {
        setMessage(`Payment prompt sent. Approve it on your phone. Reference: ${result.reference}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 mt-0.5 text-[#c2410c]" />
        <div>
          <h2 className="font-black text-gray-900">Pay for Others</h2>
          <p className="text-xs text-stone-500 mt-1">Choose your seat or a seat that has explicitly authorized you. Only seat balances and payment status are shown.</p>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="text-xs font-black text-gray-900">Allow someone to pay your bill</p>
          <p className="text-[11px] text-stone-500 mt-1">A one-time code links permission to this active seat session.</p>
          <button type="button" disabled={busy} onClick={createAuthorization} className="mt-2 px-3 py-2 rounded-lg bg-stone-100 text-xs font-bold disabled:opacity-50">
            Create authorization code
          </button>
          {generatedCode && (
            <div className="mt-2">
              <p className="rounded-lg bg-amber-50 px-3 py-2 font-mono text-sm font-bold text-amber-900 break-all">
                {generatedCode.code}
              </p>
              {generatedCode.authorization_id && (
                <button type="button" disabled={busy} onClick={revokeAuthorization} className="mt-2 text-xs font-bold text-red-700 disabled:opacity-50">
                  Revoke permission
                </button>
              )}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="text-xs font-black text-gray-900">Enter a code from another seat</p>
          <div className="mt-2 flex gap-2">
            <input aria-label="Payment authorization code" className="min-w-0 flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} maxLength={80} />
            <button type="button" disabled={busy || authorizationCode.trim().length < 24} onClick={joinAuthorization} className="px-3 py-2 rounded-lg bg-stone-100 text-xs font-bold disabled:opacity-50">Authorize</button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-gray-900">Choose who you want to pay for</h3>
          <button type="button" onClick={() => load().catch((err) => setError(err.message))} className="text-xs font-bold text-[#9a3412]">Refresh</button>
        </div>
        {loading && <p className="mt-2 text-xs text-stone-500">Loading seat balances…</p>}
        {!loading && seats.length === 0 && <p className="mt-2 text-xs text-stone-500">No active seats with a bill are available.</p>}
        <div className="mt-2 space-y-2">
          {seats.map((seat) => (
            <div key={seat.customer_session_id} className="rounded-xl border border-stone-200 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select seat ${seat.seat_number}`}
                  checked={Boolean(selected[seat.customer_session_id])}
                  disabled={!seat.payable || busy || activePayment?.status === 'processing'}
                  onChange={() => toggleSeat(seat)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">Seat {seat.seat_number}{seat.is_you ? ' · You' : ''}</p>
                  <p className="text-[11px] text-stone-500">{SEAT_PAYMENT_STATUS[seat.payment_status] || seat.payment_status}</p>
                </div>
                <span className="text-sm font-black">{money(seat.balance_rwf)}</span>
              </div>
              {selected[seat.customer_session_id] && (
                <label className="mt-2 ml-7 flex items-center justify-between gap-3 text-xs text-stone-600">
                  Amount to pay (RWF)
                  <input
                    type="number"
                    min="1"
                    max={seat.balance_rwf}
                    step="1"
                    value={selected[seat.customer_session_id]}
                    onChange={(event) => setSelected((current) => ({ ...current, [seat.customer_session_id]: event.target.value }))}
                    className="w-32 px-2 py-1.5 rounded-lg border border-stone-200 text-right font-bold text-gray-900"
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <h3 className="text-sm font-black">Payment breakdown</h3>
        {seats.filter((seat) => selected[seat.customer_session_id]).map((seat) => (
          <div key={seat.customer_session_id} className="mt-1 flex justify-between text-xs text-stone-600">
            <span>Seat {seat.seat_number}{seat.is_you ? ' · You' : ''}</span>
            <span>{money(selected[seat.customer_session_id])}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between font-black text-gray-900">
          <span>Total</span><span>{money(total)}</span>
        </div>
        <label className="block mt-3 text-xs font-bold text-stone-600">
          Mobile money number
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 78 123 4567" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm font-normal" />
        </label>
        <p className="mt-2 text-[11px] text-stone-500">Paypack will send a payment prompt to this number. Seats are settled only after the backend verifies the provider result.</p>
        {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="inline w-4 h-4 mr-1" />{message}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
        {activePayment?.status === 'processing' && <p className="mt-2 text-xs font-bold text-amber-700">Payment pending — approve the prompt on your phone. Do not submit another payment.</p>}
        <button type="button" disabled={busy || total <= 0 || !phone.trim() || activePayment?.status === 'processing' || seats.some((seat) => selected[seat.customer_session_id] && Number(selected[seat.customer_session_id]) > seat.balance_rwf)} onClick={paySelectedSeats} className="mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2b1206] text-white text-sm font-black disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Pay selected seats · {money(total)}
        </button>
      </div>
    </section>
  );
}
