import React from 'react';
import { Link } from 'react-router-dom';
import type { GrowthInsight } from '../../types';
import { ClayCard } from './clay';

const AIGrowthInsights: React.FC<{ insights: GrowthInsight[] }> = ({ insights }) => {
  if (insights.length === 0) {
    return (
      <ClayCard>
        <h3 className="text-[21px] font-semibold text-[#1f1f1f]">AI growth insights</h3>
        <p className="mt-3 rounded-lg border border-dashed border-[#d8d8d8] p-3 text-sm text-[#666]">
          No new insights yet. Add more listings and activity to unlock recommendations.
        </p>
      </ClayCard>
    );
  }

  return (
    <ClayCard>
      <h3 className="text-[21px] font-semibold text-[#1f1f1f]">AI growth insights</h3>
      <div className="mt-3 space-y-2">
        {insights.map((insight) => (
          <div key={insight.id} className="clay-card clay-size-sm">
            <p className="text-sm text-[#1f1f1f]">{insight.message}</p>
            {insight.actionLabel && insight.actionLink ? (
              <Link to={insight.actionLink} className="mt-2 inline-flex text-xs font-semibold text-[#0b63ce] hover:underline">
                {insight.actionLabel} {'>'}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </ClayCard>
  );
};

export default AIGrowthInsights;
