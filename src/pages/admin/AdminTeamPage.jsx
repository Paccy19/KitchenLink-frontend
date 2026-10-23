import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  UsersRound,
  RefreshCw,
  UserCog,
  UserCheck,
  UserX,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import ActionCodeField from '../../components/admin-dashboard/ActionCodeField';
import { NAME_MAX_LENGTH, formatNameInput, EMAIL_ERROR, EMAIL_MAX_LENGTH, isValidEmail, sanitizeEmailInput } from '../../utils/validation';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Table,
  formatDate,
  toTitle,
} from '../../components/admin-dashboard/ui';

const STATUS_TONE = {
  active: 'green',
  invited: 'amber',
  invite_expired: 'red',
  deactivated: 'slate',
};

const STATUS_LABEL = {
  active: 'Active',
  invited: 'Invitation sent',
  invite_expired: 'Invitation expired',
  deactivated: 'Deactivated',
};

/**
 * The owner's team. Only the owner (super admin) can invite a member by email
 * and role; the system emails an invitation and the member sets their own
 * password. Every change here needs the owner's SMS action code and is audited.
 */
export default function AdminTeamPage() {
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'team'], queryFn: adminApi.listTeam });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] });

  const afterChange = (message) => {
    refresh();
    setToast(message);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team"
        description="Invite staff by email, give them a role, and the system sends the invitation to set their own password."
        action={
          <Button onClick={() => { setInviteLink(''); setInviting(true); }}>
            <UserPlus className="w-4 h-4" /> Invite member
          </Button>
        }
      />

      {toast && (
        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          {toast}
        </div>
      )}

      {inviteLink && (
        <Card title="Share this invitation link">
          <p className="text-xs text-stone-500 mb-2">
            The email could not be sent automatically. Send this link to the member yourself; it lets them set their password.
          </p>
          <CopyField value={inviteLink} />
        </Card>
      )}

      <Card bodyClassName="p-4 sm:p-5">
        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorNote error={error} />
        ) : data.members.length === 0 ? (
          <EmptyState icon={UsersRound} title="No team members" description="Invite your first team member." />
        ) : (
          <Table
            columns={[
              { key: 'member', label: 'Member' },
              { key: 'role', label: 'Role' },
              { key: 'status', label: 'Status' },
              { key: 'security', label: 'Sign-in' },
              { key: 'last', label: 'Last login' },
              { key: 'actions', label: '', className: 'text-right' },
            ]}
          >
            {data.members.map((member) => (
              <tr key={member.id} className="hover:bg-stone-50/60">
                <td className="px-4 py-3">
                  <p className="font-bold text-gray-900">{member.name || '—'}</p>
                  <p className="text-[11px] text-stone-400">{member.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-bold text-stone-600">{member.role_label}</span>
                  {member.is_owner && <Badge tone="violet" className="ml-2">Owner</Badge>}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[member.status] || 'slate'}>{STATUS_LABEL[member.status] || toTitle(member.status)}</Badge>
                  {member.status === 'invited' && member.invite_expires_at && (
                    <p className="mt-1 text-[11px] text-stone-400">Expires {formatDate(member.invite_expires_at, { withTime: false })}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {member.two_factor_enabled ? (
                    <Badge tone="green"><ShieldCheck className="w-3 h-3" /> SMS codes</Badge>
                  ) : (
                    <span className="text-[11px] text-stone-400">{member.phone || 'No phone yet'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">{member.last_login_at ? formatDate(member.last_login_at) : 'Never'}</td>
                <td className="px-4 py-3">
                  {member.is_owner ? (
                    <p className="text-right text-[11px] text-stone-400">Owner account</p>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {member.status === 'deactivated' ? (
                        <Button variant="secondary" size="sm" onClick={() => setConfirmAction({ type: 'reactivate', member })}>
                          <UserCheck className="w-3.5 h-3.5" /> Reactivate
                        </Button>
                      ) : (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => setRoleTarget(member)}>
                            <UserCog className="w-3.5 h-3.5" /> Role
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmAction({ type: 'resend', member })}>
                            <RefreshCw className="w-3.5 h-3.5" /> New link
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmAction({ type: 'deactivate', member })}>
                            <UserX className="w-3.5 h-3.5" /> Deactivate
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'remove', member })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <RoleReference roles={data?.roles || []} categories={data?.categories || []} permissions={data?.permissions || []} />

      <InviteModal
        open={inviting}
        roles={data?.roles || []}
        onClose={() => setInviting(false)}
        onDone={(result) => {
          setInviting(false);
          setInviteLink(result?.invite_url || '');
          afterChange('Invitation sent.');
        }}
      />
      <ChangeRoleModal
        member={roleTarget}
        roles={data?.roles || []}
        onClose={() => setRoleTarget(null)}
        onDone={() => { setRoleTarget(null); afterChange('Role updated.'); }}
      />
      <ConfirmActionModal
        action={confirmAction}
        onClose={() => setConfirmAction(null)}
        onDone={({ message, result }) => {
          setConfirmAction(null);
          if (result?.invite_url) setInviteLink(result.invite_url);
          afterChange(message);
        }}
      />
    </div>
  );
}

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} onFocus={(event) => event.target.select()} className="text-xs" />
      <Button
        variant="secondary"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

function InviteModal({ open, roles, onClose, onDone }) {
  const [form, setForm] = useState({ email: '', name: '', role: '' });

  React.useEffect(() => {
    if (open) setForm({ email: '', name: '', role: roles[0]?.id || '' });
  }, [open, roles]);

  const selected = roles.find((role) => role.id === form.role);
  const emailInvalid = form.email.includes('@') && form.email.length > 3 && !isValidEmail(form.email);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.inviteMember({
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.role,
      }),
    onSuccess: (result) => onDone(result),
  });

  return (
    <Modal
      open={open}
      title="Invite a team member"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isValidEmail(form.email) || !form.role}
          >
            {mutation.isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          We email them a link to set their own password. They then sign in at the admin sign-in page with that email and password.
        </p>
        <Field
          label="Email address"
          hint={emailInvalid ? <span className="text-red-500 font-semibold">{EMAIL_ERROR}</span> : null}
        >
          <Input
            type="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: sanitizeEmailInput(event.target.value) }))}
            placeholder="name@example.com"
          />
        </Field>
        <Field label="Name (optional)">
          <Input value={form.name} maxLength={NAME_MAX_LENGTH} onChange={(event) => setForm((prev) => ({ ...prev, name: formatNameInput(event.target.value) }))} placeholder="e.g. Aline Uwase" />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={set('role')}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </Select>
        </Field>
        {selected && <p className="text-[11px] text-stone-500 leading-snug">{selected.description}</p>}
        {mutation.isError && <ErrorNote error={mutation.error} />}
      </div>
    </Modal>
  );
}

function ChangeRoleModal({ member, roles, onClose, onDone }) {
  const [role, setRole] = useState('');
  const [code, setCode] = useState('');

  React.useEffect(() => {
    if (member) {
      setRole(member.role);
      setCode('');
    }
  }, [member]);

  const selected = roles.find((entry) => entry.id === role);
  const mutation = useMutation({
    mutationFn: () => adminApi.changeMemberRole(member.id, { role, action_code: code }),
    onSuccess: () => onDone(),
  });

  return (
    <Modal
      open={Boolean(member)}
      title={member ? `Change role · ${member.name || member.email}` : 'Change role'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || code.length !== 6 || role === member?.role}
          >
            {mutation.isPending ? 'Saving…' : 'Save role'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-600">Their access changes immediately; the next request they make is checked against the new role.</p>
        <Field label="Role">
          <Select value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </Select>
        </Field>
        {selected && <p className="text-[11px] text-stone-500 leading-snug">{selected.description}</p>}
        <ActionCodeField purpose="team_change" value={code} onChange={setCode} />
        {mutation.isError && <ErrorNote error={mutation.error} />}
      </div>
    </Modal>
  );
}

const ACTION_META = {
  resend: { title: 'Send a new invitation', confirm: 'Send a new invitation link', verb: 'Send new link', needsCode: false, message: 'Invitation re-sent.' },
  deactivate: { title: 'Deactivate member', confirm: 'Deactivate access', verb: 'Deactivate', needsCode: false, tone: 'danger', message: 'Member deactivated.' },
  reactivate: { title: 'Reactivate member', confirm: 'Restore access', verb: 'Reactivate', needsCode: true, message: 'Member reactivated.' },
  remove: { title: 'Remove member', confirm: 'Remove from team', verb: 'Remove', needsCode: false, tone: 'danger', message: 'Member removed.' },
};

function ConfirmActionModal({ action, onClose, onDone }) {
  const [code, setCode] = useState('');
  React.useEffect(() => { setCode(''); }, [action]);

  const meta = action ? ACTION_META[action.type] : null;
  const mutation = useMutation({
    mutationFn: () => {
      const id = action.member.id;
      switch (action.type) {
        case 'resend':
          return adminApi.resendInvitation(id);
        case 'deactivate':
          return adminApi.deactivateMember(id);
        case 'reactivate':
          return adminApi.reactivateMember(id, { action_code: code });
        case 'remove':
          return adminApi.removeMember(id);
        default:
          return Promise.resolve();
      }
    },
    onSuccess: (result) => onDone({ result, message: result?.invite_url ? 'New link ready — share it above.' : meta.message }),
  });

  return (
    <Modal
      open={Boolean(action)}
      title={meta?.title || ''}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant={meta?.tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (meta?.needsCode && code.length !== 6)}
          >
            {mutation.isPending ? 'Working…' : meta?.confirm}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          {action?.type === 'remove'
            ? `${action?.member?.name || action?.member?.email} loses access immediately. Their past actions stay in the audit log.`
            : action?.type === 'deactivate'
              ? `${action?.member?.name || action?.member?.email} is signed out and cannot sign in until reactivated.`
              : action?.type === 'reactivate'
                ? `Restore access for ${action?.member?.name || action?.member?.email}.`
                : `A fresh link is emailed to ${action?.member?.email}.`}
        </p>
        {meta?.needsCode && <ActionCodeField purpose="team_change" value={code} onChange={setCode} />}
        {mutation.isError && <ErrorNote error={mutation.error} />}
      </div>
    </Modal>
  );
}

/** The roles, grouped by the same categories as the panel (owner reference). */
function RoleReference({ roles, categories, permissions }) {
  const [open, setOpen] = useState(false);
  const grouped = categories.map((category) => ({
    ...category,
    permissions: permissions.filter((permission) => permission.category === category.id),
  }));

  return (
    <Card
      title="Roles & permissions"
      description="What each role may do. The owner (super admin) can do everything."
      action={<Button variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>{open ? 'Hide' : 'Show'}</Button>}
    >
      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map((role) => {
            const owned = new Set(role.permissions);
            return (
              <div key={role.id} className="rounded-xl border border-stone-200 p-4">
                <p className="font-black text-sm text-gray-900">{role.label}</p>
                <p className="text-[11px] text-stone-500 mt-0.5 mb-3 leading-snug">{role.description}</p>
                <div className="space-y-2">
                  {grouped.map((category) => {
                    const allowed = category.permissions.filter((permission) => owned.has(permission.id));
                    if (allowed.length === 0) return null;
                    return (
                      <div key={category.id}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">{category.label}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {allowed.map((permission) => (
                            <Badge key={permission.id}>{permission.label}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
