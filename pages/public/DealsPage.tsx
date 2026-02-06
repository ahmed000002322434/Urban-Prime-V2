

import React, { useState, useEffect } from 'react';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import { useScrollReveal } from '../../hooks/useScrollReveal';

// Countdown Timer Component
const CountdownTimer: React.FC<{ timeLeft: { hours: string; minutes: string; seconds: string } }> = ({ timeLeft }) => {
    const TimeUnit: React.FC<{ value: string; label: string }> = ({ value, label }) => (
        <div className="flex flex-col items-center">
            <span className="text-3xl font-bold bg-white dark:bg-dark-surface p-3 rounded-md shadow-sm w-20 text-center text-gray-900 dark:text-dark-text">{value}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold">{label}</span>
        </div>
    );
    
    return (
        <div className="flex justify-center items-center gap-4 my-8">
            <TimeUnit value={timeLeft.hours} label="Hours" />
            <span className="text-3xl font-bold text-gray-400">:</span>
            <TimeUnit value={timeLeft.minutes} label="Minutes" />
            <span className="text-3xl font-bold text-gray-400">:</span>
            <TimeUnit value={timeLeft.seconds} label="Seconds" />
        </div>
    );
};


const DealsPage: React.FC = () => {
  const [allDealItems, setAllDealItems] = useState<Item[]>([]);
  const [dealGroups, setDealGroups] = useState<{ title: string; items: Item[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: '00', minutes: '00', seconds: '00' });

  const heroRef = useScrollReveal<HTMLDivElement>();
  const flashSaleRef = useScrollReveal<HTMLDivElement>();
  const allDealsRef = useScrollReveal<HTMLDivElement>();

  // Countdown Timer Logic
  useEffect(() => {
      const calculateTimeLeft = () => {
          const now = new Date();
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999); // Set to end of current day

          const difference = endOfDay.getTime() - now.getTime();
          
          let hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
          let minutes = Math.floor((difference / 1000 / 60) % 60);
          let seconds = Math.floor((difference / 1000) % 60);

          return {
              hours: hours < 10 ? '0' + hours : String(hours),
              minutes: minutes < 10 ? '0' + minutes : String(minutes),
              seconds: seconds < 10 ? '0' + seconds : String(seconds),
          };
      };

      const timer = setInterval(() => {
          setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const fetchAndGroupDeals = async () => {
      setIsLoading(true);
      try {
        // FIX: Property 'page' is missing in type '{ limit: number; }'.
        const { items: allItems } = await itemService.getItems({}, { page: 1, limit: 1000 });
        const dealItems = allItems
          .filter(item => item.compareAtPrice && item.salePrice && item.compareAtPrice > item.salePrice)
          .sort((a, b) => {
              const discountA = (a.compareAtPrice! - a.salePrice!) / a.compareAtPrice!;
              const discountB = (b.compareAtPrice! - b.salePrice!) / b.compareAtPrice!;
              return discountB - discountA;
          });
        
        setAllDealItems(dealItems);

        const categorizedDeals: { [key: string]: Item[] } = {
            '50% Off & Over': [],
            '30% - 49% Off': [],
            'Under 30% Off': [],
        };

        dealItems.forEach(item => {
            const discount = ((item.compareAtPrice! - item.salePrice!) / item.compareAtPrice!) * 100;
            if (discount >= 50) {
                categorizedDeals['50% Off & Over'].push(item);
            } else if (discount >= 30) {
                categorizedDeals['30% - 49% Off'].push(item);
            } else {
                categorizedDeals['Under 30% Off'].push(item);
            }
        });

        const groups = Object.entries(categorizedDeals)
            .map(([title, items]) => ({ title, items }))
            .filter(group => group.items.length > 0);
        
        setDealGroups(groups);

      } catch (error) {
        console.error("Failed to fetch deals:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndGroupDeals();
  }, []);

  const flashSaleItems = allDealItems.slice(0, 4);

  return (
    <>
      {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
      <div className="deals-bg dark:bg-dark-background animate-fade-in-up">
        {/* Hero Section */}
        <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="relative h-80 rounded-2xl overflow-hidden flex items-center justify-center text-center p-6 bg-gray-900">
                <img src="https://picsum.photos/seed/deals-hero/1600/900" alt="Exclusive Deals" className="absolute inset-0 w-full h-full object-cover opacity-30"/>
                <div className="relative z-10">
                    <h1 className="text-5xl md:text-6xl font-extrabold font-display text-white">Exclusive Deals</h1>
                    <p className="mt-4 text-xl text-yellow-300">Limited-time offers on premium products.</p>
                </div>
            </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
          {isLoading ? (
            <Spinner size="lg" className="mt-16" />
          ) : allDealItems.length > 0 ? (
            <>
              {/* Flash Sale Section */}
              <section ref={flashSaleRef} className="animate-reveal">
                <h2 className="text-4xl font-bold font-display text-center mb-4 text-gray-900 dark:text-dark-text">⚡️ Flash Sale</h2>
                <p className="text-center text-gray-500 dark:text-gray-400">Ending in:</p>
                <CountdownTimer timeLeft={timeLeft} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {flashSaleItems.map((item) => (
                    <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />
                  ))}
                </div>
              </section>

              {/* All Other Deals Section */}
              <section ref={allDealsRef} className="animate-reveal space-y-20">
                {dealGroups.map(group => (
                  <div key={group.title}>
                    <h2 className="text-4xl font-bold font-display text-center mb-12 text-gray-900 dark:text-dark-text">{group.title}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        {group.items.map((item) => (
                            <ItemCard key={item.id} item={item} onQuickView={setQuickViewItem} />
                        ))}
                    </div>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <EmptyState
                title="No Deals Right Now"
                message="We're always adding new promotions. Check back soon for exciting offers!"
                buttonText="Browse All Items"
                buttonLink="/browse"
                icon="cart"
            />
          )}
        </div>
      </div>
    </>
  );
};

export default DealsPage;