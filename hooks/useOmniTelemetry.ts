
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export interface TelemetryPoint {
  time: string;
  userValue: number;
  marketValue: number;
  tech?: number;
  fashion?: number;
  luxury?: number;
}

export const useOmniTelemetry = () => {
  const { user } = useAuth();
  const [dataPoints, setDataPoints] = useState<TelemetryPoint[]>([]);
  const [trendData, setTrendData] = useState<TelemetryPoint[]>([]);

  useEffect(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Global query for market average
    const qMarket = query(
      collection(db, 'bookings'),
      where('startDate', '>=', oneHourAgo.toISOString()),
      orderBy('startDate', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(qMarket, (snapshot) => {
      const marketCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const trends: any[] = [];
      
      // Initialize 6 pockets of 10 minutes
      for (let i = 0; i < 6; i++) {
          const label = `${i * 10}m`;
          marketCounts[label] = 5 + Math.floor(Math.random() * 10); // Baseline market noise
          userCounts[label] = 0;
          
          trends.push({
              time: label,
              tech: 20 + Math.random() * 40,
              fashion: 10 + Math.random() * 30,
              luxury: 5 + Math.random() * 20
          });
      }

      snapshot.docs.forEach(doc => {
        const d = doc.data();
        const date = new Date(d.startDate);
        const minsAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
        const bracket = `${Math.floor(minsAgo / 10) * 10}m`;
        
        if (marketCounts[bracket] !== undefined) marketCounts[bracket]++;
        
        // Check if this order belongs to the current user's items
        if (user && d.provider?.id === user.id && userCounts[bracket] !== undefined) {
            userCounts[bracket]++;
        }
      });

      const formatted = Object.keys(marketCounts).map(label => ({
          time: label,
          marketValue: marketCounts[label],
          userValue: userCounts[label]
      })).reverse();
      
      setDataPoints(formatted);
      setTrendData(trends.reverse());
    });

    return () => unsubscribe();
  }, [user?.id]);

  return { dataPoints, trendData };
};
