import React from 'react';
import { Link } from 'react-router-dom';
import type { GrowthInsight } from '../../types';

const AIGrowthInsights: React.FC<{ insights: GrowthInsight[] }> = ({ insights }) => {
  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
        <h3 className="text-[21px] font-semibold text-[#1f1f1f]">AI growth insights</h3>
        <p className="mt-3 rounded-lg border border-dashed border-[#d8d8d8] p-3 text-sm text-[#666]">
          No new insights yet. Add more listings and activity to unlock recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#d8d8d8] bg-white p-4">
      <h3 className="text-[21px] font-semibold text-[#1f1f1f]">AI growth insights</h3>
      <div className="mt-3 space-y-2">
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-lg border border-[#dddddd] bg-[#f7f7f7] p-3">
            <p className="text-sm text-[#1f1f1f]">{insight.message}</p>
            {insight.actionLabel && insight.actionLink ? (
              <Link to={insight.actionLink} className="mt-2 inline-flex text-xs font-semibold text-[#0b63ce] hover:underline">
                {insight.actionLabel} {'>'}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIGrowthInsights;
