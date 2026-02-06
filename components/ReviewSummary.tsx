import React from 'react';

const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

interface ReviewSummaryProps {
  summary: {
    pros: string[];
    cons: string[];
  };
  className?: string;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ summary, className = '' }) => {
  if (!summary || (!summary.pros?.length && !summary.cons?.length)) {
    return null;
  }

  return (
    <div className={`p-4 bg-slate-50 rounded-lg border border-slate-200 ${className}`}>
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-primary">✨</span> AI Review Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Pros</h4>
          <ul className="space-y-2">
            {summary.pros.map((pro, index) => (
              <li key={`pro-${index}`} className="flex items-start gap-2">
                <CheckIcon />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        {summary.cons.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Cons</h4>
            <ul className="space-y-2">
              {summary.cons.map((con, index) => (
                <li key={`con-${index}`} className="flex items-start gap-2">
                  <XIcon />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSummary;