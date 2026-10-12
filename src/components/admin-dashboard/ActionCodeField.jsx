import React, { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Button, Field, Input } from './ui';

/**
 * "Send code" + 6-digit input confirming one money/security action. The code
 * is bound to `purpose` on the server, so it cannot approve anything else.
 * `send` overrides how the code is requested (e.g. SMS-code setup).
 */
export default function ActionCodeField({ purpose, value, onChange, send, label = 'Code sent to your phone' }) {
  const [sentTo, setSentTo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const request = async () => {
    setBusy(true);
    setError('');
    try {
      const result = send ? await send() : await adminApi.sendActionCode(purpose);
      setSentTo(result.sent_to || 'your phone');
      setDevCode(result.dev_otp || '');
    } catch (err) {
      setError(err?.message || 'Could not send a code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
          placeholder="6-digit code"
          className="tracking-[0.3em] font-bold"
        />
        <Button type="button" variant="secondary" onClick={request} disabled={busy} className="whitespace-nowrap">
          <Smartphone className="w-4 h-4" />
          {busy ? 'Sending…' : sentTo ? 'Resend' : 'Send code'}
        </Button>
      </div>
      {sentTo && <p className="mt-1 text-[11px] text-stone-500">Code sent to {sentTo}.{devCode ? ` Development code: ${devCode}` : ''}</p>}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </Field>
  );
}
