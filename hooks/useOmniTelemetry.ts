
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { isBackendConfigured } from '../services/backendClient';

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
    if (isBackendConfigured()) {
      const fallbackPoints: TelemetryPoint[] = [
        { time: '50m', marketValue: 10, userValue: 0 },
        { time: '40m', marketValue: 12, userValue: 1 },
        { time: '30m', marketValue: 15, userValue: 1 },
        { time: '20m', marketValue: 9, userValue: 0 },
        { time: '10m', marketValue: 13, userValue: 2 },
        { time: '0m', marketValue: 11, userValue: 1 }
      ];
      setDataPoints(fallbackPoints);
      setTrendData([
        { time: '50m', userValue: 0, marketValue: 0, tech: 25, fashion: 18, luxury: 10 },
        { time: '40m', userValue: 0, marketValue: 0, tech: 28, fashion: 20, luxury: 12 },
        { time: '30m', userValue: 0, marketValue: 0, tech: 30, fashion: 22, luxury: 14 },
        { time: '20m', userValue: 0, marketValue: 0, tech: 26, fashion: 19, luxury: 13 },
        { time: '10m', userValue: 0, marketValue: 0, tech: 32, fashion: 24, luxury: 15 },
        { time: '0m', userValue: 0, marketValue: 0, tech: 34, fashion: 25, luxury: 16 }
      ]);
      return;
    }

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
    }, (error) => {
      console.warn('Omni telemetry listener failed:', error);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return { dataPoints, trendData };
};
