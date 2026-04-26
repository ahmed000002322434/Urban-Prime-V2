import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon, SearchIcon } from './MessageIcons';
import { emojiCategories } from './emojiLibrary';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(emojiCategories[0].key);
  const deferredQuery = useDeferredValue(query);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredCategories = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return emojiCategories;

    return emojiCategories
      .map((category) => ({
        ...category,
        emojis: category.emojis.filter((entry) => {
          const haystack = `${entry.name} ${entry.keywords.join(' ')}`.toLowerCase();
          return haystack.includes(normalized);
        })
      }))
      .filter((category) => category.emojis.length > 0);
  }, [deferredQuery]);

  const visibleCategory = filteredCategories.find((category) => category.key === activeCategory) || filteredCategories[0];

  useEffect(() => {
    if (!visibleCategory) return;
    setActiveCategory(visibleCategory.key);
  }, [visibleCategory]);

  if (!isOpen) return null;

  return (
    <>
      <button type="button" className="messages-mobile-overlay sm:hidden" onClick={onClose} aria-label="Close emoji picker" />
      <div ref={panelRef}>
        <div className="messages-emoji-picker hidden sm:flex">
          <div className="messages-emoji-header">
            <div>
              <p className="text-sm font-black text-text-primary">Emoji</p>
              <p className="text-[11px] text-text-secondary">Search or browse by category.</p>
            </div>
            <button type="button" onClick={onClose} className="messages-icon-button h-8 w-8 rounded-full">
              <CloseIcon />
            </button>
          </div>
          <div className="messages-search-shell mt-3">
            <span className="text-text-secondary"><SearchIcon /></span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search emoji"
              className="messages-search-input"
            />
          </div>
          <div className="messages-emoji-tabs mt-3">
            {filteredCategories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={`messages-emoji-tab ${visibleCategory?.key === category.key ? 'is-active' : ''}`}
                title={category.label}
              >
                <span>{category.icon}</span>
              </button>
            ))}
          </div>
          <div className="messages-emoji-grid mt-3">
            {visibleCategory ? (
              visibleCategory.emojis.map((entry) => (
                <button
                  key={`${visibleCategory.key}-${entry.symbol}-${entry.name}`}
                  type="button"
                  onClick={() => onSelect(entry.symbol)}
                  className="messages-emoji-button"
                  title={entry.name}
                >
                  {entry.symbol}
                </button>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm text-text-secondary">No emoji found.</div>
            )}
          </div>
        </div>

        <div className="messages-emoji-sheet sm:hidden">
          <div className="messages-emoji-header">
            <div>
              <p className="text-sm font-black text-text-primary">Emoji</p>
              <p className="text-[11px] text-text-secondary">Search or browse by category.</p>
            </div>
            <button type="button" onClick={onClose} className="messages-icon-button h-8 w-8 rounded-full">
              <CloseIcon />
            </button>
          </div>
          <div className="messages-search-shell mt-3">
            <span className="text-text-secondary"><SearchIcon /></span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search emoji"
              className="messages-search-input"
            />
          </div>
          <div className="messages-emoji-tabs mt-3">
            {filteredCategories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={`messages-emoji-tab ${visibleCategory?.key === category.key ? 'is-active' : ''}`}
                title={category.label}
              >
                <span>{category.icon}</span>
              </button>
            ))}
          </div>
          <div className="messages-emoji-grid mt-3">
            {visibleCategory ? (
              visibleCategory.emojis.map((entry) => (
                <button
                  key={`${visibleCategory.key}-${entry.symbol}-${entry.name}`}
                  type="button"
                  onClick={() => onSelect(entry.symbol)}
                  className="messages-emoji-button"
                  title={entry.name}
                >
                  {entry.symbol}
                </button>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-sm text-text-secondary">No emoji found.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmojiPicker;
