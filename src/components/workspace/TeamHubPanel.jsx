import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Building2,
  Link2,
  Copy,
  MessagesSquare,
  ListTodo,
  Send,
  Clock3,
  Users2,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../ui/useToast';
import { useAuth } from '../../context/useAuth';
import {
  createProjectTask,
  sendProjectMessage,
  subscribeToMessages,
  subscribeToTasks,
  updateProjectTask,
} from '../../db/collaborationService';
import { buildProjectShareLink } from '../../utils/companyAccess';

const TASK_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

const formatDateTime = (value) => {
  if (!value) return 'Just now';

  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
};

const TeamHubPanel = ({ project, presenceUsers = [], activityLog = [], onClose }) => {
  const toast = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [taskDraft, setTaskDraft] = useState({
    title: '',
    description: '',
    assigneeEmail: '',
    dueDate: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const isCloudProject = !!project?.id && !project.id.startsWith('local_');
  const shareLink = useMemo(
    () => buildProjectShareLink(project?.id, { mode: 'custom', access: 'company' }),
    [project?.id]
  );

  useEffect(() => {
    if (!project?.id || !isCloudProject) return undefined;

    const unsubMessages = subscribeToMessages(project.id, setMessages);
    const unsubTasks = subscribeToTasks(project.id, setTasks);

    return () => {
      unsubMessages();
      unsubTasks();
    };
  }, [isCloudProject, project?.id]);

  const collaborators = project?.collaborators || [];
  const recentActivity = activityLog.slice(0, 6);

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Custom workspace link copied.');
    } catch (err) {
      toast.error(`Could not copy link: ${err.message}`);
    }
  };

  const handleSendMessage = async () => {
    const text = messageDraft.trim();
    if (!text) return;

    setIsSending(true);
    const result = await sendProjectMessage(project.id, text);
    setIsSending(false);

    if (result.success) {
      setMessageDraft('');
      toast.success('Message sent to the project hub.');
    } else {
      toast.error(result.error || 'Could not send message.');
    }
  };

  const handleCreateTask = async () => {
    if (!taskDraft.title.trim()) return;

    setIsCreatingTask(true);
    const result = await createProjectTask(project.id, taskDraft);
    setIsCreatingTask(false);

    if (result.success) {
      setTaskDraft({
        title: '',
        description: '',
        assigneeEmail: '',
        dueDate: '',
      });
      toast.success('Task added to the custom workspace.');
      setActiveTab('tasks');
    } else {
      toast.error(result.error || 'Could not create task.');
    }
  };

  const handleTaskStatusChange = async (taskId, status) => {
    const result = await updateProjectTask(project.id, taskId, { status });
    if (!result.success) {
      toast.error(result.error || 'Could not update task.');
    }
  };

  return (
    <div className="teamhub-overlay">
      <aside className="teamhub-panel view-slide-left">
        <header className="teamhub-header">
          <div>
            <span className="hub-badge">Custom Mode Hub</span>
            <h3>Company Workspace</h3>
            <p>{project?.name}</p>
          </div>
          <button className="teamhub-close" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="teamhub-tabs">
          <button className={`hub-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Building2 size={14} /> Overview
          </button>
          <button className={`hub-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            <ListTodo size={14} /> Tasks
          </button>
          <button className={`hub-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <MessagesSquare size={14} /> Messages
          </button>
        </div>

        <div className="teamhub-content">
          {!isCloudProject && (
            <div className="hub-alert">
              This custom workspace will activate after the project finishes syncing to the cloud.
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="hub-section-stack">
              <section className="hub-card">
                <div className="hub-card-header">
                  <span>Company Access</span>
                  <Building2 size={14} />
                </div>
                <h4>{project?.company_name || user?.company_name || 'Company Workspace'}</h4>
                <p>
                  This custom-mode project is intended for people who sign in under the same company workspace.
                </p>
                <div className="hub-metrics">
                  <div className="hub-metric">
                    <strong>{presenceUsers.length}</strong>
                    <span>online now</span>
                  </div>
                  <div className="hub-metric">
                    <strong>{collaborators.length}</strong>
                    <span>extra collaborators</span>
                  </div>
                  <div className="hub-metric">
                    <strong>{tasks.length}</strong>
                    <span>tracked tasks</span>
                  </div>
                </div>
              </section>

              <section className="hub-card">
                <div className="hub-card-header">
                  <span>Share Link</span>
                  <Link2 size={14} />
                </div>
                <div className="share-link-box">{shareLink || 'Link will appear after cloud sync completes.'}</div>
                <button className="hub-primary-btn" onClick={handleCopyLink} disabled={!shareLink}>
                  <Copy size={14} /> Copy Custom Link
                </button>
              </section>

              <section className="hub-card">
                <div className="hub-card-header">
                  <span>Recent Activity</span>
                  <Clock3 size={14} />
                </div>
                {recentActivity.length === 0 ? (
                  <p className="hub-empty">No team activity yet.</p>
                ) : (
                  <div className="hub-feed">
                    {recentActivity.map((entry) => (
                      <div key={entry.id} className="hub-feed-row">
                        <span className="hub-feed-title">{entry.label || entry.action}</span>
                        <span className="hub-feed-meta">{entry.userName} · {formatDateTime(entry.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="hub-section-stack">
              <section className="hub-card">
                <div className="hub-card-header">
                  <span>Assign Work</span>
                  <CheckCircle2 size={14} />
                </div>
                <div className="task-form-grid">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={taskDraft.title}
                    onChange={(e) => setTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <input
                    type="email"
                    placeholder="Assignee email"
                    value={taskDraft.assigneeEmail}
                    onChange={(e) => setTaskDraft((prev) => ({ ...prev, assigneeEmail: e.target.value }))}
                  />
                  <textarea
                    placeholder="Task details or expected completion notes"
                    rows={3}
                    value={taskDraft.description}
                    onChange={(e) => setTaskDraft((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(e) => setTaskDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <button className="hub-primary-btn" onClick={handleCreateTask} disabled={isCreatingTask || !taskDraft.title.trim() || !isCloudProject}>
                  <ListTodo size={14} /> {isCreatingTask ? 'Adding Task...' : 'Add Task'}
                </button>
              </section>

              <section className="hub-card">
                <div className="hub-card-header">
                  <span>Task Board</span>
                  <Users2 size={14} />
                </div>
                {tasks.length === 0 ? (
                  <p className="hub-empty">No tasks yet. Add the first one above.</p>
                ) : (
                  <div className="task-list">
                    {tasks.map((task) => (
                      <div key={task.id} className="task-row">
                        <div className="task-main">
                          <strong>{task.title}</strong>
                          {task.description && <p>{task.description}</p>}
                          <span className="task-meta">
                            {task.assigneeEmail || 'Unassigned'} · created by {task.createdByName || task.createdByEmail}
                            {task.dueDate ? ` · due ${formatDateTime(task.dueDate)}` : ''}
                          </span>
                        </div>
                        <select
                          className={`task-status ${task.status || 'todo'}`}
                          value={task.status || 'todo'}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                          disabled={!isCloudProject}
                        >
                          {TASK_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="hub-section-stack messages-mode">
              <section className="hub-card flex-grow">
                <div className="hub-card-header">
                  <span>Job Messages</span>
                  <MessagesSquare size={14} />
                </div>
                {messages.length === 0 ? (
                  <p className="hub-empty">No messages yet. Start the discussion for this custom job.</p>
                ) : (
                  <div className="message-list">
                    {messages.map((message) => {
                      const isMine = message.userEmail === user?.email;
                      return (
                        <div key={message.id} className={`message-row ${isMine ? 'mine' : ''}`}>
                          <div className="message-bubble">
                            <span className="message-author">{message.userName || message.userEmail}</span>
                            <p>{message.text}</p>
                            <span className="message-time">{formatDateTime(message.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="hub-card">
                <div className="message-composer">
                  <textarea
                    rows={3}
                    placeholder="Tell the team what needs to be completed on this job..."
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                  />
                  <button className="hub-primary-btn" onClick={handleSendMessage} disabled={isSending || !messageDraft.trim() || !isCloudProject}>
                    <Send size={14} /> {isSending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>

      <style jsx="true">{`
        .teamhub-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.42);
          z-index: 1300;
          display: flex;
          justify-content: flex-end;
        }

        .teamhub-panel {
          width: min(460px, 100vw);
          height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          display: flex;
          flex-direction: column;
          border-left: 1px solid #e2e8f0;
          box-shadow: -24px 0 40px rgba(15, 23, 42, 0.12);
        }

        .teamhub-header {
          padding: 1.25rem 1.25rem 1rem;
          background: #0f172a;
          color: white;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .hub-badge {
          display: inline-flex;
          padding: 0.25rem 0.55rem;
          border-radius: 999px;
          background: rgba(96, 165, 250, 0.18);
          color: #bfdbfe;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.55rem;
        }

        .teamhub-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
        }

        .teamhub-header p {
          margin: 0.25rem 0 0;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .teamhub-close {
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          cursor: pointer;
        }

        .teamhub-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.4rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
        }

        .hub-tab {
          border: 1px solid #dbe4f0;
          background: white;
          color: #475569;
          border-radius: 12px;
          padding: 0.7rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          cursor: pointer;
        }

        .hub-tab.active {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        .teamhub-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .hub-section-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .hub-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1rem;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        .hub-card.flex-grow {
          flex: 1;
          min-height: 0;
        }

        .hub-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #475569;
        }

        .hub-card h4 {
          margin: 0 0 0.45rem;
          font-size: 1rem;
          color: #0f172a;
        }

        .hub-card p {
          margin: 0;
          font-size: 0.82rem;
          color: #475569;
          line-height: 1.55;
        }

        .hub-alert {
          padding: 0.85rem 0.95rem;
          border-radius: 14px;
          background: #fff7ed;
          border: 1px solid #fdba74;
          color: #9a3412;
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .hub-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .hub-metric {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .hub-metric strong {
          font-size: 1rem;
          color: #0f172a;
        }

        .hub-metric span {
          font-size: 0.72rem;
          color: #64748b;
        }

        .share-link-box {
          font-size: 0.75rem;
          color: #334155;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 0.85rem;
          word-break: break-word;
          margin-bottom: 0.85rem;
        }

        .hub-primary-btn {
          border: none;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          font-size: 0.8rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          cursor: pointer;
          width: 100%;
        }

        .hub-primary-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .hub-feed,
        .task-list,
        .message-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .hub-feed-row,
        .task-row {
          padding: 0.8rem;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .hub-feed-title {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f172a;
        }

        .hub-feed-meta,
        .task-meta,
        .message-time {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.72rem;
          color: #64748b;
        }

        .task-main strong {
          display: block;
          font-size: 0.88rem;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }

        .task-main p {
          margin: 0 0 0.35rem;
        }

        .task-row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .task-status {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.55rem 0.7rem;
          font-size: 0.75rem;
          font-weight: 700;
          background: white;
          min-width: 120px;
        }

        .task-status.todo { color: #475569; }
        .task-status.in_progress { color: #1d4ed8; }
        .task-status.blocked { color: #b45309; }
        .task-status.done { color: #15803d; }

        .task-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }

        .task-form-grid input,
        .task-form-grid textarea,
        .message-composer textarea {
          width: 100%;
          border: 1px solid #dbe4f0;
          border-radius: 12px;
          background: #f8fafc;
          padding: 0.8rem 0.9rem;
          font-size: 0.8rem;
          color: #0f172a;
          outline: none;
        }

        .task-form-grid textarea {
          grid-column: span 2;
          resize: vertical;
        }

        .task-form-grid input:focus,
        .task-form-grid textarea:focus,
        .message-composer textarea:focus {
          border-color: #93c5fd;
          background: white;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .messages-mode {
          height: 100%;
        }

        .message-list {
          max-height: calc(100vh - 360px);
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        .message-row {
          display: flex;
        }

        .message-row.mine {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: 88%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.8rem 0.9rem;
        }

        .message-row.mine .message-bubble {
          background: #dbeafe;
          border-color: #93c5fd;
        }

        .message-author {
          display: block;
          font-size: 0.72rem;
          font-weight: 800;
          color: #1d4ed8;
          margin-bottom: 0.25rem;
        }

        .message-bubble p {
          margin: 0;
          white-space: pre-wrap;
        }

        .message-composer {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .hub-empty {
          font-size: 0.8rem;
          color: #64748b;
        }

        @media (max-width: 640px) {
          .teamhub-panel {
            width: 100vw;
          }

          .teamhub-tabs {
            grid-template-columns: 1fr;
          }

          .hub-metrics,
          .task-form-grid {
            grid-template-columns: 1fr;
          }

          .task-form-grid textarea {
            grid-column: span 1;
          }

          .task-row {
            flex-direction: column;
          }

          .message-bubble {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default TeamHubPanel;
