import React, { useMemo, useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';

const ProjectNotesAccordion = ({
    project,
    onChange,
    title = 'Project Notes & Assumptions',
    defaultExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const filledFields = useMemo(
        () => [project?.notes, project?.assumptions, project?.exclusions, project?.preparedBy, project?.checkedBy].filter(Boolean).length,
        [project]
    );

    return (
        <div className={`project-notes-accordion ${isExpanded ? 'expanded' : ''}`}>
            <button type="button" className="project-notes-header" onClick={() => setIsExpanded((prev) => !prev)}>
                <div className="project-notes-title-wrap">
                    <span className="project-notes-icon">
                        <ClipboardList size={16} />
                    </span>
                    <div className="project-notes-heading">
                        <span className="project-notes-title">{title}</span>
                        <span className="project-notes-subtitle">
                            Notes, assumptions, exclusions, and sign-off details
                        </span>
                    </div>
                </div>
                <div className="project-notes-header-meta">
                    <span className="project-notes-count">{filledFields}/5 filled</span>
                    <ChevronDown size={16} className="project-notes-chevron" />
                </div>
            </button>

            <div className="project-notes-content">
                <div className="project-notes-grid">
                    <label className="project-notes-field">
                        <span>Notes</span>
                        <textarea
                            value={project?.notes || ''}
                            onChange={(e) => onChange({ notes: e.target.value })}
                            placeholder="Add project-specific notes and technical clarifications..."
                            rows={4}
                        />
                    </label>
                    <label className="project-notes-field">
                        <span>Assumptions</span>
                        <textarea
                            value={project?.assumptions || ''}
                            onChange={(e) => onChange({ assumptions: e.target.value })}
                            placeholder="Document technical assumptions (soil, grade, access, logistics)..."
                            rows={4}
                        />
                    </label>
                </div>

                <div className="project-notes-grid">
                    <label className="project-notes-field">
                        <span>Exclusions</span>
                        <textarea
                            value={project?.exclusions || ''}
                            onChange={(e) => onChange({ exclusions: e.target.value })}
                            placeholder="State exclusions from this BOQ scope..."
                            rows={4}
                        />
                    </label>
                    <div className="project-notes-signatures">
                        <label className="project-notes-signature-field">
                            <span>Prepared by</span>
                            <input
                                type="text"
                                value={project?.preparedBy || ''}
                                onChange={(e) => onChange({ preparedBy: e.target.value })}
                                placeholder="Engineer / QS"
                            />
                        </label>
                        <label className="project-notes-signature-field">
                            <span>Checked by</span>
                            <input
                                type="text"
                                value={project?.checkedBy || ''}
                                onChange={(e) => onChange({ checkedBy: e.target.value })}
                                placeholder="Reviewer / Principal"
                            />
                        </label>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
        .project-notes-accordion {
          margin: 1rem 1.5rem 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        }

        .project-notes-header {
          width: 100%;
          border: none;
          background: #f8fafc;
          color: #0f172a;
          padding: 0.9rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .project-notes-header:hover {
          background: #f1f5f9;
        }

        .project-notes-title-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
        }

        .project-notes-heading {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.15rem;
        }

        .project-notes-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #dbeafe;
          color: #1d4ed8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .project-notes-title {
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.01em;
          color: #0f172a;
        }

        .project-notes-subtitle {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 600;
        }

        .project-notes-header-meta {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
        }

        .project-notes-count {
          font-size: 0.62rem;
          font-weight: 800;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.32rem 0.5rem;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .project-notes-chevron {
          color: #64748b;
          transition: transform 0.25s ease, color 0.2s ease;
        }

        .project-notes-accordion.expanded .project-notes-chevron {
          transform: rotate(180deg);
          color: #2563eb;
        }

        .project-notes-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.2s ease, padding 0.35s ease;
          padding: 0 1rem;
          border-top: 1px solid transparent;
        }

        .project-notes-accordion.expanded .project-notes-content {
          max-height: 1000px;
          opacity: 1;
          padding: 1rem;
          border-top-color: #e2e8f0;
        }

        .project-notes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.9rem;
          margin-bottom: 0.9rem;
        }

        .project-notes-grid:last-child {
          margin-bottom: 0;
        }

        .project-notes-field,
        .project-notes-signature-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .project-notes-field span,
        .project-notes-signature-field span {
          font-size: 0.64rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .project-notes-field textarea,
        .project-notes-signature-field input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          padding: 0.6rem 0.7rem;
          font-size: 0.78rem;
          color: #1e293b;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }

        .project-notes-field textarea {
          resize: vertical;
        }

        .project-notes-field textarea:focus,
        .project-notes-signature-field input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }

        .project-notes-signatures {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          justify-content: center;
        }

        @media (max-width: 900px) {
          .project-notes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
};

export default ProjectNotesAccordion;
