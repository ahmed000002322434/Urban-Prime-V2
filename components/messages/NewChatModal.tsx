import React from 'react';
import type { User } from '../../types';
import { CloseIcon, SearchIcon } from './MessageIcons';
import SafeImage from './SafeImage';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  results: User[];
  isSearching: boolean;
  error: string | null;
  onSelectUser: (user: User) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  results,
  isSearching,
  error,
  onSelectUser
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm dark:bg-slate-950/60" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-[1.65rem] border border-white/65 bg-white/85 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/85"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-black text-text-primary">Start new conversation</p>
            <p className="mt-1 text-xs text-text-secondary">Search by name or email and open chat instantly.</p>
          </div>
          <button type="button" onClick={onClose} className="messages-icon-button h-9 w-9 rounded-full">
            <CloseIcon />
          </button>
        </div>

        <div className="messages-search-shell mt-4">
          <span className="text-text-secondary"><SearchIcon /></span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search people"
            className="messages-search-input"
          />
        </div>

        <div className="mt-2 px-1 text-[11px] text-text-secondary">
          {query.trim().length >= 2 ? 'Results update as you type.' : 'Type at least 2 characters to search.'}
        </div>

        <div className="mt-4 max-h-[24rem] overflow-y-auto rounded-[1.2rem] border border-white/60 bg-white/55 dark:border-slate-700/60 dark:bg-slate-900/50">
          {isSearching ? (
            <div className="px-5 py-10 text-center text-sm text-text-secondary">Searching...</div>
          ) : query.trim().length < 2 ? (
            <div className="px-5 py-10 text-center text-sm text-text-secondary">Search for a buyer, seller, or provider.</div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-secondary">No users found.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectUser(entry)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/70 dark:hover:bg-slate-800/70"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <SafeImage src={entry.avatar || '/icons/urbanprime.svg'} alt={entry.name} className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-text-primary">{entry.name}</p>
                      <p className="truncate text-xs text-text-secondary">{entry.email || 'Urban Prime user'}</p>
                    </div>
                  </div>
                  <span className="messages-primary-button px-3 py-2 text-[11px]">Chat</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-[1rem] border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default NewChatModal;
