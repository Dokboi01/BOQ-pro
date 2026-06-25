import React, { useState } from 'react';
import { inviteCollaborator, removeCollaborator } from '../../db/collaborationService';
import { useToast } from '../ui/useToast';
import { useAuth } from '../../context/useAuth';
import { getCurrentIdToken } from '../../utils/authToken';
import { Users, UserPlus, X, Send, Crown, ShieldCheck, Eye } from 'lucide-react';

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const getRoleIcon = (role) => {
  if (role === 'owner') return <Crown size={11} />;
  if (role === 'editor') return <ShieldCheck size={11} />;
  return <Eye size={11} />;
};

const getRoleColor = (role) => {
  if (role === 'owner') return { bg: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' };
  if (role === 'editor') return { bg: 'rgba(37,99,235,0.10)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.25)' };
  return { bg: 'rgba(100,116,139,0.10)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' };
};

async function sendInviteEmail({ toEmail, inviterName, projectName, role }) {
  try {
    const token = await getCurrentIdToken();
    if (!token) return;
    await fetch('/api/invite-collaborator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ toEmail, inviterName, projectName, role }),
    });
  } catch (err) {
    // Non-critical — don't surface email failures to users
    console.warn('Invite email failed silently:', err.message);
  }
}

const CollabModal = ({ projectId, projectName = '', collaborators = [], onClose }) => {
  const toast = useToast();
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(null);

  const ownerEmail = user?.email?.toLowerCase() || '';

  // Build full list: owner first, then collaborators
  const ownerEntry = { email: ownerEmail, role: 'owner', displayName: user?.displayName || user?.name };
  const collaboratorList = [
    ownerEntry,
    ...collaborators.filter(c => c.email !== ownerEmail),
  ];

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (email === ownerEmail) {
      toast.error('You cannot invite yourself.');
      return;
    }
    setIsInviting(true);
    const result = await inviteCollaborator(projectId, email, inviteRole);
    if (result.success) {
      toast.success(`Invited ${email} as ${inviteRole}`);
      // Send invite email (fire and forget)
      sendInviteEmail({
        toEmail: email,
        inviterName: user?.displayName || user?.name || ownerEmail,
        projectName: projectName || 'your project',
        role: inviteRole,
      });
      setInviteEmail('');
    } else {
      toast.error(result.error || 'Failed to invite');
    }
    setIsInviting(false);
  };

  const handleRemove = async (email) => {
    setRemovingEmail(email);
    const result = await removeCollaborator(projectId, email);
    if (result.success) {
      toast.success(`Removed ${email}`);
    } else {
      toast.error(result.error || 'Failed to remove');
    }
    setRemovingEmail(null);
  };

  return (
    <div className="collab-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="collab-modal view-fade-in">
        {/* Header */}
        <div className="collab-modal-header">
          <div className="collab-title-row">
            <div className="collab-icon-wrap">
              <Users size={16} />
            </div>
            <div>
              <h3>Share Project</h3>
              <p className="collab-subtitle">Invite your team to collaborate</p>
            </div>
          </div>
          <button className="collab-close" onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>

        <div className="collab-modal-body">
          {/* Invite Row */}
          <div className="collab-invite-section">
            <label className="collab-label">
              <UserPlus size={12} /> Invite by email
            </label>
            <div className="collab-invite-row">
              <input
                type="email"
                placeholder="colleague@company.com"
                className="collab-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                autoFocus
              />
              <select className="collab-role-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                className="collab-invite-btn"
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail.trim()}
                title="Send invite"
              >
                {isInviting ? (
                  <span className="collab-spinner" />
                ) : (
                  <Send size={13} />
                )}
              </button>
            </div>
            <p className="collab-hint">
              They'll receive an email invitation to join this project.
            </p>
          </div>

          {/* People List */}
          <div className="collab-list">
            <span className="collab-list-label">
              PEOPLE WITH ACCESS &nbsp;<span className="collab-count">{collaboratorList.length}</span>
            </span>
            {collaboratorList.map((c, i) => {
              const roleStyle = getRoleColor(c.role);
              const isRemoving = removingEmail === c.email;
              const isOwner = c.role === 'owner';
              return (
                <div key={c.email} className="collab-person">
                  <div
                    className="collab-person-avatar"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {getInitials(c.displayName || c.email)}
                  </div>
                  <div className="collab-person-info">
                    <span className="collab-person-email">
                      {c.email}
                      {isOwner && <span className="collab-you-badge">You</span>}
                    </span>
                    <div className="collab-role-badge" style={roleStyle}>
                      {getRoleIcon(c.role)}
                      <span>{c.role.charAt(0).toUpperCase() + c.role.slice(1)}</span>
                    </div>
                  </div>
                  {!isOwner && (
                    <button
                      className={`collab-remove-btn ${isRemoving ? 'removing' : ''}`}
                      onClick={() => handleRemove(c.email)}
                      disabled={isRemoving}
                      title="Remove collaborator"
                    >
                      {isRemoving ? <span className="collab-spinner small" /> : <X size={12} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .collab-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          z-index: 1400;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .collab-modal {
          background: #ffffff;
          border-radius: 20px;
          width: min(480px, 100%);
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .collab-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 1.25rem 1.25rem 1rem;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          gap: 0.75rem;
        }

        .collab-title-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .collab-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f59e0b;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .collab-modal-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: white;
          line-height: 1.3;
        }

        .collab-subtitle {
          margin: 0.2rem 0 0;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
        }

        .collab-close {
          border: none;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
          width: 30px;
          height: 30px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }

        .collab-close:hover {
          background: rgba(255,255,255,0.16);
          color: white;
        }

        .collab-modal-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .collab-invite-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .collab-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .collab-invite-row {
          display: flex;
          gap: 0.5rem;
        }

        .collab-input {
          flex: 1;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          padding: 0.72rem 0.9rem;
          font-size: 0.83rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .collab-input:focus {
          border-color: #2563eb;
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        .collab-role-select {
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          padding: 0.72rem 0.65rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          outline: none;
          min-width: 90px;
          transition: border-color 0.15s;
        }

        .collab-role-select:focus {
          border-color: #2563eb;
        }

        .collab-invite-btn {
          border: none;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          border-radius: 12px;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.1s;
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }

        .collab-invite-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37,99,235,0.4);
        }

        .collab-invite-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .collab-hint {
          margin: 0;
          font-size: 0.73rem;
          color: #94a3b8;
          line-height: 1.5;
        }

        .collab-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .collab-list-label {
          font-size: 0.69rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.25rem;
        }

        .collab-count {
          background: #f1f5f9;
          color: #64748b;
          border-radius: 999px;
          padding: 0 0.45rem;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .collab-person {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          transition: background 0.12s;
        }

        .collab-person:hover {
          background: #f1f5f9;
        }

        .collab-person-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
          letter-spacing: 0.03em;
        }

        .collab-person-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .collab-person-email {
          font-size: 0.83rem;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .collab-you-badge {
          font-size: 0.65rem;
          font-weight: 700;
          background: rgba(37,99,235,0.1);
          color: #2563eb;
          border-radius: 999px;
          padding: 0.1rem 0.45rem;
          letter-spacing: 0.04em;
        }

        .collab-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          width: fit-content;
          letter-spacing: 0.03em;
          text-transform: capitalize;
        }

        .collab-remove-btn {
          border: 1px solid #e2e8f0;
          background: white;
          color: #94a3b8;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s;
        }

        .collab-remove-btn:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #ef4444;
        }

        .collab-remove-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .collab-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: collab-spin 0.65s linear infinite;
        }

        .collab-spinner.small {
          width: 11px;
          height: 11px;
          border-color: rgba(100,116,139,0.3);
          border-top-color: #64748b;
        }

        @keyframes collab-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CollabModal;
