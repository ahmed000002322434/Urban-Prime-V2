import React from 'react';
import type { InboxBucket } from './types';

interface InboxTabsProps {
  activeBucket: InboxBucket;
  counts: Record<InboxBucket, number>;
  onChange: (bucket: InboxBucket) => void;
}

const tabs: Array<{ key: InboxBucket; label: string }> = [
  { key: 'primary', label: 'Primary' },
  { key: 'general', label: 'General' },
  { key: 'requests', label: 'Requests' }
];

const InboxTabs: React.FC<InboxTabsProps> = ({ activeBucket, counts, onChange }) => (
  <div className="messages-inbox-tabs px-3.5 pt-3 sm:px-4">
    <div className="flex items-center gap-1.5 rounded-[1.1rem] p-0.5">
      {tabs.map((tab) => {
        const isActive = tab.key === activeBucket;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`messages-tab flex-1 ${tab.key === 'requests' ? 'messages-tab--requests' : ''} ${isActive ? 'is-active' : ''}`}
          >
            <span>{tab.label}</span>
            <span className={`messages-tab-count ${tab.key === 'requests' ? 'messages-tab-count--requests' : ''}`}>{count}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export default InboxTabs;
