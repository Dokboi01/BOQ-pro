import React from 'react';
import { History, X } from 'lucide-react';

const ActivityPanel = ({ activityLog = [], onClose }) => {
  return (
    <div className="activity-panel">
      <div className="activity-panel-header">
        <h4><History size={14} /> Activity</h4>
        <button className="collab-close" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="activity-list">
        {activityLog.length === 0 ? (
          <p className="activity-empty">No activity yet</p>
        ) : activityLog.map((entry) => (
          <div key={entry.id} className="activity-entry">
            <div className="activity-icon">{entry.label?.substring(0, 2) || '📝'}</div>
            <div className="activity-content">
              <span className="activity-text">{entry.label?.substring(3) || entry.action}</span>
              <span className="activity-meta">
                {entry.userName} · {entry.timestamp instanceof Date
                  ? entry.timestamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityPanel;
