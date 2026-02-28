import React from 'react';

export interface ToastAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ToastNotificationProps {
  message: string;
  title?: string;
  avatarUrl?: string;
  actions?: ToastAction[];
  onClose?: () => void;
  tone?: 'success' | 'info' | 'message' | 'error';
}

const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8h.01" />
    <path d="M11 12h1v4h1" />
  </svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 6-12 12" />
    <path d="m6 6 12 12" />
  </svg>
);

const iconColor = (tone: NonNullable<ToastNotificationProps['tone']>) => {
  if (tone === 'error') return 'text-red-500';
  if (tone === 'message') return 'text-sky-500';
  if (tone === 'info') return 'text-indigo-500';
  return 'text-emerald-500';
};

const renderToneIcon = (tone: NonNullable<ToastNotificationProps['tone']>) => {
  if (tone === 'error') return <ErrorIcon />;
  if (tone === 'message') return <MessageIcon />;
  if (tone === 'info') return <InfoIcon />;
  return <SuccessIcon />;
};

const actionClass = (variant: ToastAction['variant']) => {
  if (variant === 'danger') return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100';
  if (variant === 'primary') return 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700';
  return 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50';
};

const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  title,
  avatarUrl,
  actions = [],
  onClose,
  tone = 'success' as NonNullable<ToastNotificationProps['tone']>
}) => {
  const hasActions = actions.length > 0;

  return (
    <div className={`fixed z-[120] animate-fade-in-up ${hasActions ? 'top-4 right-4 w-[min(430px,calc(100%-2rem))]' : 'bottom-6 left-1/2 -translate-x-1/2'}`}>
      <div className="rounded-2xl border border-gray-200/70 bg-white/95 p-4 shadow-2xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95">
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={title || 'notification'} className="h-10 w-10 rounded-full border border-gray-200 object-cover" />
          ) : (
            <span className={iconColor(tone)}>{renderToneIcon(tone)}</span>
          )}
          <div className="min-w-0 flex-1">
            {title ? <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{title}</p> : null}
            <p className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-gray-100">{message}</p>
          </div>
          {onClose ? (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"
              aria-label="Dismiss notification"
            >
              <CloseIcon />
            </button>
          ) : null}
        </div>

        {hasActions ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${actionClass(action.variant)}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ToastNotification;
