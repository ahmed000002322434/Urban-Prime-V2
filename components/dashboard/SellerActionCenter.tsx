import React from 'react';
import { Link } from 'react-router-dom';
import type { SellerLowStockItem } from '../../types';

interface SellerActionCenterProps {
  pendingShipments: number;
  lowStockItems: SellerLowStockItem[];
  unreadMessages: number;
}

const ActionRow: React.FC<{
  title: string;
  count: number;
  subtitle: string;
  to: string;
}> = ({ title, count, subtitle, to }) => (
  <Link
    to={to}
    className="flex items-center justify-between rounded-lg border border-[#dddddd] bg-[#f7f7f7] px-3 py-3 transition-colors hover:bg-white"
  >
    <div>
      <p className="text-sm font-semibold text-[#1f1f1f]">{title}</p>
      <p className="mt-1 text-xs text-[#666]">{subtitle}</p>
    </div>
    <span className="inline-flex min-w-[34px] items-center justify-center rounded-full bg-[#111111] px-2 py-1 text-xs font-semibold text-white">
      {count}
    </span>
  </Link>
);

const SellerActionCenter: React.FC<SellerActionCenterProps> = ({ pendingShipments, lowStockItems, unreadMessages }) => {
  return (
    <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
      <h3 className="text-[21px] font-semibold text-[#1f1f1f]">Action center</h3>
      <div className="mt-3 space-y-2">
        <ActionRow title="Pending orders" count={pendingShipments} subtitle="Ship and confirm ready orders" to="/profile/sales" />
        <ActionRow title="Low stock" count={lowStockItems.length} subtitle="Restock products before they pause" to="/profile/products" />
        <ActionRow title="Unread messages" count={unreadMessages} subtitle="Reply to buyer and lead conversations" to="/profile/messages" />
      </div>
    </div>
  );
};

export default SellerActionCenter;
