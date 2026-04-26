import React from 'react';
import { ComposeIcon } from './MessageIcons';

interface WorkspaceHeaderProps {
  accountLabel: string;
  subtitle: string;
  onNewChat: () => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ accountLabel, subtitle, onNewChat }) => (
  <div className="messages-workspace-header px-3.5 pt-3.5 sm:px-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-black tracking-tight text-text-primary sm:text-base">{accountLabel}</p>
        <p className="messages-header-caption">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onNewChat}
        className="messages-new-chat-button"
        title="Start new chat"
      >
        <ComposeIcon />
      </button>
    </div>
  </div>
);

export default WorkspaceHeader;
