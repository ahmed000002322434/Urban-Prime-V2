
import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import type { SupportQuery } from '../../types';
import Spinner from '../../components/Spinner';
import { useNotification } from '../../context/NotificationContext';

const QueryCard: React.FC<{ query: SupportQuery; onReply: () => void; }> = ({ query, onReply }) => {
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const { showNotification } = useNotification();

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setIsReplying(true);
        try {
            await adminService.replyToQuery(query.id, replyText);
            showNotification(`Reply sent to ${query.userName}.`);
            onReply(); // Trigger refetch
        } catch (error) {
            showNotification("Failed to send reply.");
        } finally {
            setIsReplying(false);
        }
    };

    return (
        <details className="bg-white dark:bg-dark-surface p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 open:ring-2 open:ring-primary">
            <summary className="font-semibold cursor-pointer flex justify-between items-center text-light-text dark:text-dark-text">
                <div className="flex items-center gap-3">
                    <img src={query.userAvatar} alt={query.userName} className="w-8 h-8 rounded-full" />
                    <div>
                        <p>{query.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">From: {query.userName} ({query.userEmail})</p>
                    </div>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${query.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {query.status}
                </span>
            </summary>
            <div className="mt-4 pt-4 border-t dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{query.message}</p>
                <p className="text-xs text-gray-400 mt-2">Received: {new Date(query.createdAt).toLocaleString()}</p>
                
                {query.status === 'closed' && query.reply && (
                    <div className="mt-4 p-3 bg-primary/10 dark:bg-primary/20 rounded-md border-l-4 border-primary">
                        <p className="font-semibold text-sm text-light-text dark:text-dark-text">Your Reply:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">{query.reply}</p>
                        <p className="text-xs text-gray-400 mt-1">Replied: {new Date(query.repliedAt!).toLocaleString()}</p>
                    </div>
                )}
                
                {query.status === 'open' && (
                    <form onSubmit={handleReply} className="mt-4 space-y-2">
                        <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            rows={4}
                            placeholder={`Reply to ${query.userName}...`}
                            required
                            className="w-full p-2 text-sm border rounded-md dark:bg-dark-background dark:border-gray-600 dark:text-dark-text"
                        />
                        <div className="flex justify-end">
                            <button type="submit" disabled={isReplying} className="px-4 py-2 text-sm bg-primary text-white font-bold rounded-md disabled:bg-primary/70 flex items-center justify-center min-w-[100px]">
                                {isReplying ? <Spinner size="sm" /> : 'Send Reply'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </details>
    );
};

const AdminCustomerQueriesPage: React.FC = () => {
    const [queries, setQueries] = useState<SupportQuery[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchQueries = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getSupportQueries();
            setQueries(data);
        } catch (error) {
            console.error("Failed to fetch queries:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQueries();
    }, [fetchQueries]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">Customer Queries</h1>
            {isLoading ? (
                <Spinner size="lg" />
            ) : queries.length > 0 ? (
                <div className="space-y-4">
                    {queries.map(query => (
                        <QueryCard key={query.id} query={query} onReply={fetchQueries} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-lg border dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No customer queries found.</p>
                </div>
            )}
        </div>
    );
};

export default AdminCustomerQueriesPage;