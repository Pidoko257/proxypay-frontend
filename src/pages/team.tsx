import React, { useState, useCallback } from 'react';
import Layout from '@theme/Layout';

type Role = 'Admin' | 'Developer' | 'Read-Only';
type Status = 'Active' | 'Invited' | 'Suspended';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: Status;
  joinDate: string;
}

const PERMISSIONS_MATRIX: { role: Role; permissions: string[] }[] = [
  { role: 'Admin', permissions: ['Manage team', 'View payments', 'Create payments', 'Refund payments', 'View reports', 'Manage webhooks', 'View API keys', 'Manage API keys'] },
  { role: 'Developer', permissions: ['View payments', 'Create payments', 'View reports', 'Manage webhooks', 'View API keys', 'Manage API keys'] },
  { role: 'Read-Only', permissions: ['View payments', 'View reports', 'View API keys'] },
];

const CURRENT_USER: TeamMember = {
  id: '1',
  email: 'james@example.com',
  name: 'James Ejembi',
  role: 'Admin',
  status: 'Active',
  joinDate: '2026-01-15',
};

const initialMembers: TeamMember[] = [
  CURRENT_USER,
  { id: '2', email: 'alice@example.com', name: 'Alice Johnson', role: 'Developer', status: 'Active', joinDate: '2026-02-20' },
  { id: '3', email: 'bob@example.com', name: 'Bob Smith', role: 'Read-Only', status: 'Active', joinDate: '2026-03-10' },
  { id: '4', email: 'carol@example.com', name: 'Carol Williams', role: 'Developer', status: 'Invited', joinDate: '2026-06-25' },
];

const ROLE_ORDER: Role[] = ['Admin', 'Developer', 'Read-Only'];

export default function TeamPage(): React.JSX.Element {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Developer');
  const [inviteError, setInviteError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<TeamMember | null>(null);
  const [confirmRole, setConfirmRole] = useState<Role | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const currentMember = members.find((m) => m.email === CURRENT_USER.email)!;

  const handleInvite = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    if (members.some((m) => m.email === email)) {
      setInviteError('A member with this email already exists.');
      return;
    }

    const newMember: TeamMember = {
      id: String(Date.now()),
      email,
      name: email.split('@')[0],
      role: inviteRole,
      status: 'Invited',
      joinDate: new Date().toISOString().split('T')[0],
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
    setInviteRole('Developer');
    setInviteError('');
  }, [inviteEmail, inviteRole, members]);

  const handleRoleChange = useCallback((member: TeamMember, newRole: Role) => {
    if (member.id === CURRENT_USER.id) return;
    setConfirmTarget(member);
    setConfirmRole(newRole);
  }, []);

  const confirmRoleChange = useCallback(() => {
    if (!confirmTarget || !confirmRole) return;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === confirmTarget.id ? { ...m, role: confirmRole } : m,
      ),
    );
    setConfirmTarget(null);
    setConfirmRole(null);
  }, [confirmTarget, confirmRole]);

  const handleRemove = useCallback((member: TeamMember) => {
    if (member.id === CURRENT_USER.id) return;
    setConfirmTarget(member);
    setConfirmRole(null);
  }, []);

  const confirmRemove = useCallback(() => {
    if (!confirmTarget) return;
    setMembers((prev) => prev.filter((m) => m.id !== confirmTarget.id));
    setConfirmTarget(null);
  }, [confirmTarget]);

  return (
    <Layout title="Team Management" description="Manage team members and permissions">
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>Team</h1>
            <p style={{ color: '#6b7280', marginTop: 4 }}>Manage who has access to your ProxyPay account</p>
          </div>
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: 'var(--ifm-background-surface-color)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {showMatrix ? 'Hide' : 'View'} Permissions Matrix
          </button>
        </div>

        {showMatrix && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: 'var(--ifm-background-surface-color)',
              overflowX: 'auto',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Permissions Matrix</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb' }}>Permission</th>
                  {PERMISSIONS_MATRIX.map((p) => (
                    <th key={p.role} style={{ textAlign: 'center', padding: '8px 12px', borderBottom: '2px solid #e5e7eb' }}>{p.role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS_MATRIX[0].permissions.map((perm) => (
                  <tr key={perm}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{perm}</td>
                    {PERMISSIONS_MATRIX.map((p) => (
                      <td key={p.role} style={{ textAlign: 'center', padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
                        {p.permissions.includes(perm) ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: 'var(--ifm-background-surface-color)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Invite Member</h3>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: 4, color: '#6b7280' }}>Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                placeholder="colleague@example.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${inviteError ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: 6,
                  fontSize: '14px',
                  background: 'var(--ifm-background-color)',
                  color: 'var(--ifm-font-color-base)',
                }}
              />
              {inviteError && <p style={{ color: '#dc2626', fontSize: '12px', margin: '4px 0 0' }}>{inviteError}</p>}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: 4, color: '#6b7280' }}>Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: '14px',
                  background: 'var(--ifm-background-color)',
                  color: 'var(--ifm-font-color-base)',
                }}
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: 6,
                background: 'var(--ifm-color-primary)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Send Invite
            </button>
          </form>
        </div>

        <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Joined</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {member.name}
                    {member.id === CURRENT_USER.id && (
                      <span style={{ marginLeft: 6, fontSize: '11px', color: '#6b7280' }}>(you)</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{member.email}</td>
                  <td style={{ padding: '12px' }}>
                    {member.id === CURRENT_USER.id ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: '12px',
                        fontWeight: 600,
                        background: 'var(--ifm-color-primary)',
                        color: '#fff',
                      }}>
                        {member.role}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as Role)}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          fontSize: '13px',
                          background: 'var(--ifm-background-color)',
                          color: 'var(--ifm-font-color-base)',
                        }}
                      >
                        {ROLE_ORDER.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: '12px',
                      fontWeight: 600,
                      background: member.status === 'Active' ? '#dcfce7' : member.status === 'Invited' ? '#fef9c3' : '#fee2e2',
                      color: member.status === 'Active' ? '#166534' : member.status === 'Invited' ? '#854d0e' : '#991b1b',
                    }}>
                      {member.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{member.joinDate}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {member.id !== CURRENT_USER.id && (
                      <button
                        onClick={() => handleRemove(member)}
                        style={{
                          padding: '4px 12px',
                          border: '1px solid #dc2626',
                          borderRadius: 4,
                          background: 'transparent',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {confirmTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setConfirmTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--ifm-background-surface-color)',
              padding: '2rem',
              borderRadius: 12,
              maxWidth: 440,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {confirmRole ? 'Change Role' : 'Remove Member'}
            </h3>
            {confirmRole ? (
              <>
                <p>
                  Change <strong>{confirmTarget.name}</strong>'s role from{' '}
                  <strong>{confirmTarget.role}</strong> to <strong>{confirmRole}</strong>?
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                  This will update their permissions immediately.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setConfirmTarget(null)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRoleChange}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 6,
                      background: 'var(--ifm-color-primary)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm Change
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Remove <strong>{confirmTarget.name}</strong> ({confirmTarget.email}) from the team?
                </p>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>
                  They will lose access to this account immediately.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setConfirmTarget(null)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRemove}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 6,
                      background: '#dc2626',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Remove Member
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
