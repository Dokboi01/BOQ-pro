import React, { useState } from 'react';
import { inviteCollaborator, removeCollaborator } from '../../db/collaborationService';
import { useToast } from '../ui/ToastContext';
import { Users, UserPlus, X, Send } from 'lucide-react';

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const CollabModal = ({ projectId, collaborators = [], onClose }) => {
  const toast = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    const result = await inviteCollaborator(projectId, inviteEmail, inviteRole);
    if (result.success) {
      toast.success(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
    } else {
      toast.error(result.error || 'Failed to invite');
    }
    setIsInviting(false);
  };

  const handleRemove = async (email) => {
    const result = await removeCollaborator(projectId, email);
    if (result.success) {
      toast.success(`Removed ${email}`);
    }
  };

  return (
    <div className="collab-overlay">
      <div className="collab-modal view-fade-in">
        <div className="collab-modal-header">
          <div className="collab-title-row">
            <Users size={18} className="text-accent" />
            <h3>Share Project</h3>
          </div>
          <button className="collab-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="collab-modal-body">
          <div className="collab-invite-row">
            <input
              type="email"
              placeholder="colleague@company.com"
              className="collab-input"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
            <select className="collab-role-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="collab-invite-btn" onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
              <Send size={14} />
            </button>
          </div>

          {collaborators.length > 0 && (
            <div className="collab-list">
              <span className="collab-list-label">COLLABORATORS</span>
              {collaborators.map((c, i) => (
                <div key={i} className="collab-person">
                  <div className="collab-person-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                    {getInitials(c.email)}
                  </div>
                  <div className="collab-person-info">
                    <span className="collab-person-email">{c.email}</span>
                    <span className="collab-person-role">{c.role}</span>
                  </div>
                  <button className="collab-remove-btn" onClick={() => handleRemove(c.email)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollabModal;
