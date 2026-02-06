
import { useState, useEffect, useCallback } from 'react';
import { itemService } from '../services/itemService';
import type { Item } from '../types';

const HISTORY_KEY = 'urbanprime_history_v2';
const MAX_HISTORY = 10;

export const useBrowsingHistory = () => {
    const [historyItems, setHistoryItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const addToHistory = useCallback((item: Item) => {
        try {
            const currentHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            // Remove duplicate if exists, then add to front
            const newHistoryIds = [item.id, ...currentHistory.filter((id: string) => id !== item.id)].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistoryIds));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    }, []);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const historyIds: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            if (historyIds.length > 0) {
                 const items = await Promise.all(historyIds.map(id => itemService.getItemById(id)));
                 setHistoryItems(items.filter(Boolean) as Item[]);
            } else {
                setHistoryItems([]);
            }
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    return { historyItems, addToHistory, isLoading };
};
