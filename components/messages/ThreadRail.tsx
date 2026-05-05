import React from 'react';
import { SearchIcon } from './MessageIcons';
import InboxTabs from './InboxTabs';
import ThreadListItem from './ThreadListItem';
import WorkspaceHeader from './WorkspaceHeader';
import type { InboxBucket, ThreadFilter, ThreadViewModel } from './types';

interface ThreadRailProps {
  accountLabel: string;
  subtitle: string;
  activeBucket: InboxBucket;
  counts: Record<InboxBucket, number>;
  activeFilter: ThreadFilter;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onBucketChange: (bucket: InboxBucket) => void;
  onFilterChange: (filter: ThreadFilter) => void;
  onNewChat: () => void;
  threadViews: ThreadViewModel[];
  activeThreadId?: string;
  menuThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onToggleThreadMenu: (threadId: string) => void;
  onMoveThread: (threadId: string, bucket: 'primary' | 'general') => void;
  isLoading?: boolean;
}

const filterOptions: Array<{ key: ThreadFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'online', label: 'Online' }
];

const ThreadRail: React.FC<ThreadRailProps> = ({
  accountLabel,
  subtitle,
  activeBucket,
  counts,
  activeFilter,
  searchValue,
  onSearchChange,
  onBucketChange,
  onFilterChange,
  onNewChat,
  threadViews,
  activeThreadId,
  menuThreadId,
  onSelectThread,
  onToggleThreadMenu,
  onMoveThread,
  isLoading = false
}) => (
  <div className="flex h-full min-h-0 flex-col">
    <WorkspaceHeader accountLabel={accountLabel} subtitle={subtitle} onNewChat={onNewChat} />
    <InboxTabs activeBucket={activeBucket} counts={counts} onChange={onBucketChange} />
    <div className="px-3.5 pt-2.5 sm:px-4">
      <div className="messages-search-shell">
        <span className="text-text-secondary"><SearchIcon /></span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search people or messages"
          className="messages-search-input"
        />
      </div>
      {searchValue.trim() ? (
        <div className="mt-1.5 px-1 text-[11px] text-text-secondary">
          {threadViews.length} result{threadViews.length === 1 ? '' : 's'}
        </div>
      ) : null}
      <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
        {filterOptions.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => onFilterChange(filter.key)}
            className={`messages-filter-chip ${activeFilter === filter.key ? 'is-active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
    <div className="messages-thread-list mt-4 flex-1 overflow-y-auto px-2 pb-3 sm:px-3">
      {threadViews.length > 0 ? (
        <div className="space-y-2">
          {threadViews.map((viewModel) => (
            <ThreadListItem
              key={viewModel.thread.id}
              viewModel={viewModel}
              isActive={viewModel.thread.id === activeThreadId}
              isMenuOpen={menuThreadId === viewModel.thread.id}
              onSelect={() => onSelectThread(viewModel.thread.id)}
              onToggleMenu={() => onToggleThreadMenu(viewModel.thread.id)}
              onMoveToPrimary={() => onMoveThread(viewModel.thread.id, 'primary')}
              onMoveToGeneral={() => onMoveThread(viewModel.thread.id, 'general')}
            />
          ))}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`thread-skeleton-${index}`} className="messages-thread-item w-full text-left" aria-hidden="true">
              <div className="flex items-start gap-2.5 animate-pulse">
                <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200/85 dark:bg-slate-700/70" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-28 rounded-full bg-slate-200/85 dark:bg-slate-700/70" />
                      <div className="h-3 w-16 rounded-full bg-slate-200/75 dark:bg-slate-700/60" />
                    </div>
                    <div className="h-3 w-10 rounded-full bg-slate-200/75 dark:bg-slate-700/60" />
                  </div>
                  <div className="mt-2 h-3.5 w-36 rounded-full bg-slate-200/80 dark:bg-slate-700/65" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-text-primary">{searchValue.trim() ? 'No matches found' : 'No conversations yet'}</p>
          <p className="mt-2 max-w-xs text-sm text-text-secondary">
            {searchValue.trim()
              ? 'Try another name or keyword from a recent message preview.'
              : 'Start a new chat or switch tabs to find another thread.'}
          </p>
          <button type="button" onClick={onNewChat} className="messages-primary-button mt-5">
            Start new chat
          </button>
        </div>
      )}
    </div>
  </div>
);

export default ThreadRail;
