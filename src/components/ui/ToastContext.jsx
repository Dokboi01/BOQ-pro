import React, { useState, useCallback, useRef } from 'react';
import ToastContext from './toast-context';

const TOAST_ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const TOAST_COLORS = {
    success: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#86efac' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' },
    warning: { bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308', text: '#fde68a' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#93c5fd' },
};

const AUTO_DISMISS_MS = 4000;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const toastId = useRef(0);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
    }, []);

    const addToast = useCallback((message, type = 'info') => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, message, type, exiting: false }]);
        setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
        return id;
    }, [removeToast]);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Toast Container */}
            <div style={{
                position: 'fixed',
                top: '1.25rem',
                right: '1.25rem',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
                pointerEvents: 'none',
                maxWidth: '400px',
            }}>
                {toasts.map((t) => {
                    const colors = TOAST_COLORS[t.type] || TOAST_COLORS.info;
                    return (
                        <div
                            key={t.id}
                            onClick={() => removeToast(t.id)}
                            style={{
                                background: colors.bg,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: `1px solid ${colors.border}40`,
                                borderLeft: `3px solid ${colors.border}`,
                                borderRadius: '12px',
                                padding: '0.875rem 1.125rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                color: colors.text,
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                                boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${colors.border}20`,
                                pointerEvents: 'auto',
                                cursor: 'pointer',
                                animation: t.exiting
                                    ? 'toast-slide-out 0.35s ease-in forwards'
                                    : 'toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                                opacity: t.exiting ? 0 : 1,
                                transform: t.exiting ? 'translateX(120%)' : 'translateX(0)',
                                transition: 'opacity 0.35s, transform 0.35s',
                                lineHeight: 1.4,
                            }}
                        >
                            <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{TOAST_ICONS[t.type]}</span>
                            <span>{t.message}</span>
                        </div>
                    );
                })}
            </div>

            {/* Keyframe animations injected once */}
            <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(120%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-slide-out {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(120%); }
        }
      `}</style>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
