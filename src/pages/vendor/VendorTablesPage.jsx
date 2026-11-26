import React, { useEffect, useState } from 'react';
import { QrCode, Plus, Download, Printer, RefreshCw, Trash2, Pencil, Users, Receipt, DoorClosed } from 'lucide-react';
import { kitchenApi, saveBlob } from '../../api/kitchenApi';
import { useVendor } from '../../context/VendorContext';
import { PageHeader, Card, Button, Badge, ErrorNote, Empty, Loading, Modal, Field, inputClass, useLoad, useAction, money } from '../../components/vendor-dashboard/ops/ui';

/**
 * Tables and seat-specific QR codes. Every configured seat gets its own
 * opaque code; guests can order independently without selecting a seat.
 */
export default function VendorTablesPage() {
  const { can, vendor } = useVendor();
  const { data, error, loading, reload } = useLoad(() => kitchenApi.tables(), [], { intervalMs: 15000 });
  const action = useAction();
  const [editing, setEditing] = useState(null); // null | 'new' | 'batch' | table
  const [qrTable, setQrTable] = useState(null);
  const tables = data?.tables || [];
  const closeVisit = (table) => {
    if (!window.confirm(`Close the dining session at ${table.label}? Active seat sessions will end. Unserved or unpaid orders must be resolved first.`)) return;
    action.run(`close:${table.id}`, async () => {
      await kitchenApi.closeDiningSession(table.id);
      reload();
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tables & QR codes"
        actions={
          can('tables.create') && (
            <>
              <Button variant="secondary" onClick={() => setEditing('batch')}>Add several</Button>
              <Button onClick={() => setEditing('new')}>
                <Plus className="w-4 h-4" /> Add table
              </Button>
            </>
          )
        }
      />
      <ErrorNote message={error || action.error} />
      {loading && !data ? (
        <Loading />
      ) : tables.length === 0 ? (
        <Card>
          <Empty icon={QrCode} title="No tables yet">Add your tables to print a QR code for each one.</Empty>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tables.map((table) => (
            <div key={table.id} className={`rounded-2xl border shadow-sm p-4 space-y-3 ${table.is_active ? 'bg-white border-stone-200/80' : 'bg-stone-50 border-stone-200 opacity-75'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-lg text-gray-900">{table.label}</p>
                  <p className="text-[11px] text-stone-500 font-semibold">
                    {[table.area, table.capacity ? `${table.capacity} seats` : ''].filter(Boolean).join(' · ') || 'No area'}
                  </p>
                </div>
                {!table.is_active ? <Badge tone="red">Off</Badge> : table.occupied ? <Badge tone="amber">In use</Badge> : <Badge tone="emerald">Free</Badge>}
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                {table.active_customer_sessions > 0 && <p>{table.active_customer_sessions} active seat session{table.active_customer_sessions === 1 ? '' : 's'}</p>}
                {table.active_orders > 0 && <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {table.active_orders} open order{table.active_orders === 1 ? '' : 's'}{table.ready_items ? ` · ${table.ready_items} ready` : ''}</p>}
                {table.open_invoice && (
                  <p className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> {table.open_invoice.invoice_number}: {money(table.open_invoice.balance_due_rwf)} due</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(can('tables.qr_generate') || can('tables.qr_download') || can('tables.qr_print')) && (
                  <Button variant="soft" className="flex-1 !py-2 !text-xs" onClick={() => setQrTable(table)}>
                    <QrCode className="w-4 h-4" /> QR code
                  </Button>
                )}
                {can('tables.merge') && table.occupied && (
                  <Button
                    variant="secondary"
                    className="!py-2 !px-3 !text-xs"
                    title="Bring another table's orders and bill here"
                    onClick={() => {
                      const others = tables.filter((t) => t.id !== table.id && t.occupied);
                      if (!others.length) return window.alert('No other table has orders or a bill.');
                      const label = window.prompt(`Merge which table into ${table.label}? (${others.map((t) => t.label).join(', ')})`, others[0].label);
                      const from = others.find((t) => t.label.toLowerCase() === String(label || '').trim().toLowerCase());
                      if (from) action.run(`m:${table.id}`, async () => { await kitchenApi.mergeTables(table.id, from.id); reload(); });
                      return null;
                    }}
                  >
                    Merge
                  </Button>
                )}
                {(can('tables.edit') || can('tables.activate') || can('service.assign_servers')) && (
                  <Button variant="secondary" className="!py-2 !px-3" aria-label={`Edit ${table.label}`} onClick={() => setEditing(table)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {table.active_table_session_id && can('tables.edit', 'tables.assign') && (
                  <Button
                    variant="secondary"
                    className="!py-2 !text-xs"
                    busy={action.busy === `close:${table.id}`}
                    onClick={() => closeVisit(table)}
                  >
                    <DoorClosed className="w-4 h-4" /> Close visit
                  </Button>
                )}
                {table.active_table_session_id && can('tables.view') && (
                  <TableSeatBalances
                    table={table}
                    canRecordPayment={can('invoices.process_payment')}
                    canReleaseSeat={can('tables.assign')}
                  />
                )}
                {can('tables.delete') && (
                  <Button
                    variant="danger"
                    className="!py-2 !px-3"
                    aria-label={`Remove ${table.label}`}
                    busy={action.busy === `d:${table.id}`}
                    onClick={() => window.confirm(`Remove ${table.label}? Its QR code will stop working.`) && action.run(`d:${table.id}`, () => kitchenApi.deleteTable(table.id))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TableForm table={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {qrTable && <QrModal table={qrTable} kitchenName={vendor?.name} canRotate={can('tables.qr_regenerate')} onClose={() => setQrTable(null)} onRotated={(t) => { setQrTable(t); reload(); }} />}
    </div>
  );
}

function TableSeatBalances({ table, canRecordPayment, canReleaseSeat }) {
  const [open, setOpen] = useState(false);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState({});
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const action = useAction();
  const load = async () => {
    try {
      const result = await kitchenApi.seatBalances(table.id);
      setSeats(result.seats || []);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };
  const toggle = (seat) => setSelected((current) => {
    if (current[seat.customer_session_id]) {
      const next = { ...current };
      delete next[seat.customer_session_id];
      return next;
    }
    return { ...current, [seat.customer_session_id]: seat.balance_rwf };
  });
  const total = seats.reduce((sum, seat) => (
    selected[seat.customer_session_id] ? sum + (Number(selected[seat.customer_session_id]) || 0) : sum
  ), 0);
  const record = () => action.run('record', async () => {
    const allocations = seats
      .filter((seat) => selected[seat.customer_session_id])
      .map((seat) => ({
        customer_session_id: seat.customer_session_id,
        amount_rwf: Number(selected[seat.customer_session_id]),
        balance_version: seat.balance_version,
      }));
    const body = { seats: allocations, method, reference: reference.trim() || undefined };
    const fingerprint = JSON.stringify(body);
    const storageKey = `ofk_cashier_seat_payment_${table.id}`;
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch {
      saved = null;
    }
    const idempotencyKey = saved?.fingerprint === fingerprint
      ? saved.key
      : (window.crypto?.randomUUID?.() || `cash-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`);
    sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key: idempotencyKey }));
    const result = await kitchenApi.recordSeatPayment(table.id, { ...body, idempotency_key: idempotencyKey });
    if (result.status === 'successful') {
      sessionStorage.removeItem(storageKey);
      setSelected({});
      setReference('');
      await load();
    }
  });
  const release = (seat) => {
    if (!window.confirm(`Release paid seat ${seat.seat_number}? Its order history will remain in the table session.`)) return;
    action.run(`release:${seat.seat_number}`, async () => {
      await kitchenApi.releaseSeat(table.id, seat.seat_number);
      await load();
    });
  };

  return (
    <div className="w-full">
      <Button variant="soft" className="!py-2 !text-xs" onClick={async () => { setOpen((value) => !value); if (!open) await load(); }}>
        <Receipt className="w-4 h-4" /> {open ? 'Hide seats' : 'Seat balances'}
      </Button>
      {open && (
        <div className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3">
          {seats.map((seat) => (
            <div key={seat.customer_session_id} className="rounded-lg border border-stone-200 bg-white p-2.5">
              <div className="flex items-center gap-2">
                {canRecordPayment && seat.payable && (
                  <input type="checkbox" aria-label={`Select seat ${seat.seat_number} for payment`} checked={Boolean(selected[seat.customer_session_id])} onChange={() => toggle(seat)} />
                )}
                <div className="flex-1">
                  <p className="text-xs font-black">Seat {seat.seat_number} · {seat.payment_status.replaceAll('_', ' ')}</p>
                  <p className="text-[11px] text-stone-500">Paid {money(seat.paid_rwf)} · Due {money(seat.balance_rwf)}</p>
                </div>
                {canReleaseSeat && seat.payment_status === 'paid' && (
                  <button type="button" className="text-[11px] font-bold text-red-700" disabled={action.busy === `release:${seat.seat_number}`} onClick={() => release(seat)}>Release</button>
                )}
              </div>
              {selected[seat.customer_session_id] && (
                <label className="mt-2 ml-6 flex items-center justify-between text-[11px] text-stone-600">
                  Amount (RWF)
                  <input type="number" min="1" max={seat.balance_rwf} step="1" value={selected[seat.customer_session_id]} onChange={(event) => setSelected((current) => ({ ...current, [seat.customer_session_id]: event.target.value }))} className="w-28 rounded border border-stone-200 px-2 py-1 text-right text-xs" />
                </label>
              )}
              {(seat.payment_history || []).map((payment) => (
                <p key={payment.reference} className="mt-1 text-[10px] text-stone-500">
                  {money(payment.amount_rwf)} · {payment.reference} · paid by {payment.payer_seat_number ? `Seat ${payment.payer_seat_number}` : 'cashier'}
                </p>
              ))}
            </div>
          ))}
          {seats.length === 0 && <p className="text-xs text-stone-500">No active seats.</p>}
          {canRecordPayment && Object.keys(selected).length > 0 && (
            <div className="space-y-2 border-t border-stone-200 pt-2">
              <label className="block text-xs font-bold">Payment method
                <select value={method} onChange={(event) => setMethod(event.target.value)} className={`${inputClass} mt-1`}>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-xs font-bold">Receipt reference (optional)
                <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} className={`${inputClass} mt-1`} />
              </label>
              <p className="text-xs font-black">Selected total: {money(total)}</p>
              <Button className="w-full" busy={action.busy === 'record'} disabled={total <= 0 || seats.some((seat) => selected[seat.customer_session_id] && Number(selected[seat.customer_session_id]) > seat.balance_rwf)} onClick={record}>
                Record payment for selected seats
              </Button>
            </div>
          )}
          <ErrorNote message={error || action.error} />
          <button type="button" onClick={load} className="text-xs font-bold text-[#9a3412]">Refresh seat balances</button>
        </div>
      )}
    </div>
  );
}

function TableForm({ table, onClose, onSaved }) {
  const batch = table === 'batch';
  const isNew = table === 'new' || batch;
  const [form, setForm] = useState(
    batch ? { prefix: 'Table ', from: 1, to: 10, area: '', capacity: '' } : { label: table.label || '', area: table.area || '', capacity: table.capacity ?? '', is_active: table.is_active ?? true },
  );
  const action = useAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const save = () =>
    action.run('save', async () => {
      if (batch) {
        const result = await kitchenApi.createTables({ ...form, from: Number(form.from), to: Number(form.to), capacity: form.capacity || undefined });
        if (result.skipped?.length) window.alert(`Already existed, skipped: ${result.skipped.join(', ')}`);
      } else if (isNew) await kitchenApi.createTable({ ...form, capacity: form.capacity || null });
      else await kitchenApi.updateTable(table.id, { ...form, capacity: form.capacity || null });
      onSaved();
    });
  return (
    <Modal title={batch ? 'Add several tables' : isNew ? 'Add a table' : `Edit ${table.label}`} onClose={onClose}>
      <div className="space-y-3">
        {batch ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name starts with"><input className={inputClass} value={form.prefix} onChange={set('prefix')} /></Field>
            <Field label="From"><input className={inputClass} type="number" min="0" value={form.from} onChange={set('from')} /></Field>
            <Field label="To"><input className={inputClass} type="number" min="0" value={form.to} onChange={set('to')} /></Field>
          </div>
        ) : (
          <Field label="Table name or number">
            <input className={inputClass} value={form.label} onChange={set('label')} maxLength={30} autoFocus />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area (optional)"><input className={inputClass} value={form.area} onChange={set('area')} placeholder="Terrace, Inside…" /></Field>
          <Field label="Seats (optional)"><input className={inputClass} type="number" min="1" value={form.capacity} onChange={set('capacity')} /></Field>
        </div>
        {!isNew && (
          <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Taking orders (switch off to stop its QR code)
          </label>
        )}
        <ErrorNote message={action.error} />
        <Button className="w-full" busy={action.busy === 'save'} onClick={save}>{isNew ? 'Create (QR code made automatically)' : 'Save'}</Button>
      </div>
    </Modal>
  );
}

function QrModal({ table, kitchenName, canRotate, onClose, onRotated }) {
  const [src, setSrc] = useState('');
  const [seatNumber, setSeatNumber] = useState(() => table.seats?.length ? String(table.seats[0].seat_number) : '');
  const action = useAction();
  const selectedSeat = table.seats?.find((seat) => String(seat.seat_number) === seatNumber) || null;
  const qrLabel = selectedSeat ? `${table.label} · Seat ${selectedSeat.seat_number}` : table.label;
  useEffect(() => {
    let url = '';
    kitchenApi
      .tableQr(table.id, 'svg', seatNumber || null)
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch((err) => action.setError(err.message));
    return () => url && URL.revokeObjectURL(url);
  }, [table.id, table.token, seatNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = (format) =>
    action.run(format, async () => saveBlob(
      await kitchenApi.tableQr(table.id, format, seatNumber || null),
      `${qrLabel.replace(/[^A-Za-z0-9]+/g, '-')}-qr.${format}`
    ));

  const print = () => {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    const doc = w.document;
    doc.title = `${qrLabel} QR code`;
    const wrap = doc.createElement('div');
    wrap.style.cssText = 'font-family:system-ui,sans-serif;text-align:center;padding:32px';
    const heading = doc.createElement('h1');
    heading.textContent = kitchenName || '';
    heading.style.cssText = 'font-size:22px;margin:0 0 4px';
    const sub = doc.createElement('p');
    sub.textContent = `${qrLabel} — scan to order`;
    sub.style.cssText = 'font-size:16px;margin:0 0 16px;color:#555';
    const img = doc.createElement('img');
    img.src = src;
    img.style.cssText = 'width:320px;height:320px';
    img.onload = () => {
      w.focus();
      w.print();
    };
    wrap.append(heading, sub, img);
    doc.body.appendChild(wrap);
  };

  return (
    <Modal title={`${qrLabel} QR code`} onClose={onClose}>
      <div className="space-y-4 text-center">
        <label className="block text-left text-xs font-bold text-stone-600">
          QR code for
          <select className={`${inputClass} mt-1`} value={seatNumber} onChange={(event) => setSeatNumber(event.target.value)}>
            <option value="">Entire table (legacy)</option>
            {(table.seats || []).map((seat) => <option key={seat.seat_number} value={seat.seat_number}>Seat {seat.seat_number}</option>)}
          </select>
        </label>
        <div className="mx-auto w-64 h-64 rounded-2xl border border-stone-200 bg-white flex items-center justify-center">
          {src ? <img src={src} alt={`QR code for ${qrLabel}`} className="w-60 h-60" /> : <Loading />}
        </div>
        <p className="text-[11px] text-stone-500 break-all">{selectedSeat?.menu_url || table.menu_url}</p>
        <ErrorNote message={action.error} />
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" busy={action.busy === 'svg'} onClick={() => download('svg')}><Download className="w-4 h-4" /> SVG</Button>
          <Button variant="secondary" busy={action.busy === 'png'} onClick={() => download('png')}><Download className="w-4 h-4" /> PNG</Button>
          <Button disabled={!src} onClick={print}><Printer className="w-4 h-4" /> Print</Button>
        </div>
        {canRotate && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline"
            onClick={() =>
              window.confirm('Make a new QR code? The printed code will stop working. Existing customer sessions will remain valid.') &&
              action.run('rotate', async () => onRotated(
                selectedSeat
                  ? await kitchenApi.rotateSeatQr(table.id, selectedSeat.seat_number)
                  : await kitchenApi.rotateTableQr(table.id)
              ))
            }
          >
            <RefreshCw className="w-3.5 h-3.5" /> Replace {selectedSeat ? 'seat' : 'table'} QR code
          </button>
        )}
      </div>
    </Modal>
  );
}
