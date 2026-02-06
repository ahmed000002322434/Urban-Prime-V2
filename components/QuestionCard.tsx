

import React, { useState, useEffect } from 'react';
import type { Question } from '../types';
import { itemService } from '../services/itemService';
import { useNotification } from '../context/NotificationContext';

interface QuestionCardProps {
  question: Question;
  itemId: string;
  sellerName: string;
}

const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.358.232.836.671.836h2.49a2.25 2.25 0 012.25 2.25v2.818a2.25 2.25 0 01-.35 1.256l-3.4 5.442a2.25 2.25 0 01-1.954 1.108H4.25a2.25 2.25 0 01-2.25-2.25V13.5a2.25 2.25 0 012.25-2.25h2.383z" /></svg>;

const QuestionCard: React.FC<QuestionCardProps> = ({ question, itemId, sellerName }) => {
    const { showNotification } = useNotification();
    const [helpfulVotes, setHelpfulVotes] = useState(question.answer?.helpfulVotes || 0);
    const [hasVoted, setHasVoted] = useState(false);

    const handleHelpfulVote = async () => {
        if (hasVoted || !question.answer) return;
        setHasVoted(true);
        setHelpfulVotes(prev => prev + 1);
        try {
            // FIX: Property 'addHelpfulVote' does not exist on type 'itemService'. This method is now implemented in itemService.
            await itemService.addHelpfulVote(itemId, question.id);
        } catch (e) {
            // Revert on error
            setHelpfulVotes(prev => prev - 1);
            setHasVoted(false);
            showNotification("Could not record your vote.");
        }
    };
    
    return (
        <div className="bg-surface p-4 rounded-xl border border-border/70">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex-shrink-0 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm">Q</div>
                <div className="flex-1">
                    <p className="text-text-primary font-semibold">{question.questionText}</p>
                    <p className="text-xs text-text-secondary mt-1">Asked by {question.author.name} on {new Date(question.date).toLocaleDateString()}</p>
                </div>
            </div>
            {question.answer && (
                <div className="flex items-start gap-3 mt-4 pl-4 border-l-2 border-primary/50">
                     <div className="w-8 h-8 flex-shrink-0 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">A</div>
                    <div className="flex-1">
                        <p className="text-text-primary">{question.answer.text}</p>
                        <p className="text-xs text-text-secondary mt-1">Answered by {sellerName}</p>
                         <div className="flex items-center gap-2 mt-2">
                             <button onClick={handleHelpfulVote} disabled={hasVoted} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${hasVoted ? 'bg-primary/20 text-primary' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                <ThumbsUpIcon/> Helpful
                            </button>
                             {helpfulVotes > 0 && <span className="text-xs text-text-secondary">{helpfulVotes} people found this helpful</span>}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionCard;