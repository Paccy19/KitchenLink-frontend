import React, { useEffect, useState } from 'react';
import { Button, Field, Modal, Select, Textarea } from './ui';

const REASON_STATUSES = ['rejected', 'suspended'];
const LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  active: 'Active',
};

/**
 * Small reusable modal for changing a vendor/driver/customer status.
 * @param {object} props
 * @param {string[]} props.statuses allowed statuses for the target role
 * @param {string} [props.current] the current status
 */
export default function StatusModal({
  open,
  title = 'Change status',
  statuses,
  current,
  submitting,
  onClose,
  onSubmit,
}) {
  const [status, setStatus] = useState(current || statuses[0]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStatus(current || statuses[0]);
      setReason('');
      setError('');
    }
  }, [open, current, statuses]);

  const reasonRequired = REASON_STATUSES.includes(status);

  const submit = () => {
    if (reasonRequired && reason.trim().length < 3) {
      setError('A short reason is required for this status.');
      return;
    }
    setError('');
    onSubmit({ status, reason: reason.trim() });
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="New status">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {LABELS[value] || value}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={reasonRequired ? 'Reason (required)' : 'Reason (optional)'}
          hint="This note is stored on the audit log and may be shown to the affected user."
        >
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add context for this change…"
          />
        </Field>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
