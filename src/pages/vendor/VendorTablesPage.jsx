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
        subtitle="Each seat has its own QR code and private customer session. The table QR remains available for legacy table ordering."
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
                {can('tables.qr') && (
                  <Button variant="soft" className="flex-1 !py-2 !text-xs" onClick={() => setQrTable(table)}>
                    <QrCode className="w-4 h-4" /> QR code
                  </Button>
                )}
                {can('tables.edit') && (
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
      {qrTable && <QrModal table={qrTable} kitchenName={vendor?.name} canRotate={can('tables.qr')} onClose={() => setQrTable(null)} onRotated={(t) => { setQrTable(t); reload(); }} />}
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
          <Field label="Table name or number" hint="Unique in your kitchen, e.g. Table 5 or Terrace 2.">
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
