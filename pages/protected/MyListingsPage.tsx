

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { itemService } from '../../services/itemService';
import type { Item } from '../../types';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';
import ItemCard from '../../components/ItemCard';
import QuickViewModal from '../../components/QuickViewModal';
import { useNotification } from '../../context/NotificationContext';
import BoostListingModal from '../../components/BoostListingModal';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const RocketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-purple-500"><path d="M12 2.5a.5.5 0 0 1 .5.5v3.032c1.928.272 3.65 1.254 4.875 2.705l2.146-2.147a.5.5 0 0 1 .708 0l.707.708a.5.5 0 0 1 0 .707l-2.147 2.146c1.45 1.225 2.433 2.947 2.705 4.875H21.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3.032c-.272 1.928-1.254 3.65-2.705 4.875l2.147 2.146a.5.5 0 0 1 0 .707l-.707.708a.5.5 0 0 1-.708 0l-2.146-2.147c-1.225 1.45-2.947 2.433-4.875 2.705V21.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-3.032c-1.928-.272-3.65-1.254-4.875-2.705l-2.146 2.147a.5.5 0 0 1-.708 0l-.707-.708a.5.5 0 0 1 0-.707l2.147-2.146c-1.45-1.225-2.433-2.947-2.705-4.875H2.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3.032c.272-1.928 1.254-3.65 2.705-4.875L5.836 6.444a.5.5 0 0 1 0-.707l.707-.708a.5.5 0 0 1 .708 0l2.146 2.147c1.225-1.45 2.947-2.433 4.875-2.705V3a.5.5 0 0 1 .5-.5h1zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

type AutomationKey = 'autoReprice' | 'autoRestock' | 'autoPromote' | 'autoFulfill';
type QuickUpdateField = 'salePrice' | 'rentalPrice' | 'stock' | 'startingBid' | 'buyNowPrice';
type ListingStatus = 'published' | 'draft' | 'archived' | 'sold';

const getItemImage = (item: Item) => {
  if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls[0];
  if (item.images && item.images.length > 0) return item.images[0];
  return `https://picsum.photos/seed/${item.id}/200/200`;
};

const getListingStatus = (item: Item): ListingStatus => {
  if (item.status === 'draft' || item.status === 'archived' || item.status === 'sold') return item.status;
  return 'published';
};

const isDigitalItem = (item: Item) => {
  return item.itemType === 'digital' || item.productType === 'digital' || Boolean(item.digitalFileUrl);
};

const getEditorRoute = (item: Item, mode: 'edit' | 'duplicate') => {
  const base = isDigitalItem(item) ? '/profile/products/new-digital' : '/profile/products/new';
  return `${base}?${mode}=${encodeURIComponent(item.id)}`;
};

const statusChipClasses = (status: ListingStatus) => {
  if (status === 'published') return 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30';
  if (status === 'draft') return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
  if (status === 'archived') return 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30';
  return 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30';
};

const MyListingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [quickViewItem, setQuickViewItem] = useState<Item | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [itemToBoost, setItemToBoost] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchItems = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const items = await itemService.getItemsByOwner(user.id, {
        visibility: 'owner',
        allowMockFallback: false,
        strictOwnerMatch: true
      });
      setMyItems(items);
    } catch (error) {
      console.error('Failed to fetch owner listings:', error);
      setMyItems([]);
      showNotification('Unable to load listings right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, [user?.id]);

  if (!user) return null;

  const handleLifecycle = async (
    itemId: string,
    action: 'publish' | 'unpublish' | 'archive' | 'restoreDraft' | 'publishFromArchive'
  ) => {
    try {
      if (action === 'publish') {
        await itemService.publishItem(itemId);
        showNotification('Listing published.');
      } else if (action === 'unpublish') {
        await itemService.unpublishItem(itemId);
        showNotification('Listing moved to drafts.');
      } else if (action === 'archive') {
        await itemService.archiveItem(itemId);
        showNotification('Listing archived.');
      } else if (action === 'restoreDraft') {
        await itemService.restoreItemToDraft(itemId);
        showNotification('Listing restored to drafts.');
      } else {
        await itemService.restoreAndPublishItem(itemId);
        showNotification('Listing restored and published.');
      }
      await fetchItems();
    } catch (error) {
      console.error('Listing lifecycle action failed:', error);
      showNotification('Unable to update listing status. Please try again.');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) {
      try {
        await itemService.deleteItem(itemId);
        showNotification("Item permanently deleted.");
        await fetchItems();
      } catch (error) {
        console.error('Listing deletion failed:', error);
        showNotification('Unable to delete listing.');
      }
    }
  };

  const handleQuickUpdate = async (itemId: string, field: QuickUpdateField, value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return;
      if (numValue < 0) {
        showNotification('Value cannot be negative.');
        return;
      }
      const currentItem = myItems.find((item) => item.id === itemId);
      if (!currentItem) return;

      try {
        if (field === 'startingBid') {
            const currentAuction = currentItem.auctionDetails || {
                startingBid: 0,
                currentBid: 0,
                endTime: '',
                bidCount: 0,
                bids: []
            };
            const highestBid = Number(currentAuction.currentBid || 0);
            const bidCount = Number(currentAuction.bidCount || 0);
            if (bidCount > 0 || highestBid > 0) {
                showNotification('Starting bid is locked after bids are placed.');
                return;
            }
            const currentBuyNow = Number(currentItem.buyNowPrice || 0);
            if (currentBuyNow > 0 && numValue > currentBuyNow) {
                showNotification('Starting bid cannot exceed the buy now price.');
                return;
            }
            const nextAuction = {
                ...currentAuction,
                startingBid: numValue,
                currentBid: numValue
            };
            await itemService.updateItem(itemId, { auctionDetails: nextAuction });
            setMyItems((prev) =>
                prev.map((item) =>
                    item.id === itemId
                        ? { ...item, auctionDetails: nextAuction }
                        : item
                )
            );
            showNotification('Auction starting bid updated!');
            return;
        }

        if (field === 'buyNowPrice') {
            const priceFloor = Math.max(
                Number(currentItem.auctionDetails?.currentBid || 0),
                Number(currentItem.auctionDetails?.startingBid || 0)
            );
            if (numValue > 0 && numValue < priceFloor) {
                showNotification(`Buy now price must be at least $${priceFloor.toFixed(2)}.`);
                return;
            }
            await itemService.updateItem(itemId, { buyNowPrice: numValue });
            setMyItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, buyNowPrice: numValue } : item)));
            showNotification('Auction buy now price updated!');
            return;
        }

        if (field === 'rentalPrice') {
            const nextRates = {
                hourly: Number(currentItem.rentalRates?.hourly || 0),
                daily: numValue,
                weekly: Number(currentItem.rentalRates?.weekly || 0)
            };
            await itemService.updateItem(itemId, {
                rentalPrice: numValue,
                rentalRates: nextRates
            });
            setMyItems((prev) =>
                prev.map((item) =>
                    item.id === itemId
                        ? { ...item, rentalPrice: numValue, rentalRates: nextRates }
                        : item
                )
            );
            showNotification('Rental price updated!');
            return;
        }

        const normalizedValue = field === 'stock' ? Math.max(0, Math.floor(numValue)) : numValue;
        await itemService.updateItem(itemId, { [field]: normalizedValue } as Partial<Item>);
        if (field === 'salePrice') showNotification('Sale price updated!');
        else showNotification('Stock updated!');
        setMyItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, [field]: normalizedValue } : item)));
      } catch (error) {
        console.error('Quick listing update failed:', error);
        showNotification('Unable to update listing right now.');
      }
  };

  const handleAutomationToggle = async (item: Item, field: AutomationKey, label: string) => {
      const current = item.automation?.[field] ?? false;
      const updatedAutomation = { ...(item.automation || {}), [field]: !current };
      await itemService.updateItem(item.id, { automation: updatedAutomation });
      setMyItems(prev => prev.map(i => i.id === item.id ? { ...i, automation: updatedAutomation } : i));
      showNotification(`${label} ${!current ? 'enabled' : 'disabled'}.`);
  };

  const filteredItems = myItems.filter(item => {
    const status = getListingStatus(item);
    if (activeTab === 'all') return true;
    return status === activeTab;
  }).filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.sku || '').toLowerCase().includes(q) ||
      (item.brand || '').toLowerCase().includes(q)
    );
  });

  const TabButton = ({ tab, label, count }: { tab: 'all' | 'published' | 'draft' | 'archived', label: string, count: number }) => (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveTab(tab)}
      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-all ${activeTab === tab ? 'border-primary text-primary shadow-sm' : 'border-transparent text-text-secondary hover:text-text-primary'}`} 
    >
      {label} <span className="bg-surface-soft text-text-primary rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>
    </motion.button>
  );

  return (
    <>
      {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
      {itemToBoost && <BoostListingModal item={itemToBoost} onClose={() => { setItemToBoost(null); fetchItems(); }} />}
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header Section */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-2"
        >
           <motion.div 
            className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
            variants={containerVariants}
            initial="hidden"
            animate="show"
           >
               <TabButton tab="all" label="All" count={myItems.length} />
               <TabButton tab="published" label="Published" count={myItems.filter(i => getListingStatus(i) === 'published').length} />
               <TabButton tab="draft" label="Drafts" count={myItems.filter(i => getListingStatus(i) === 'draft').length} />
               <TabButton tab="archived" label="Archived" count={myItems.filter(i => getListingStatus(i) === 'archived').length} />
           </motion.div>
           
           <motion.div 
            className="flex flex-wrap items-center gap-2"
            variants={itemVariants}
           >
                <motion.input
                    whileFocus={{ boxShadow: "0 0 0 3px rgba(15, 185, 177, 0.1)" }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search listings..."
                    className="w-full sm:w-64 px-4 py-2 rounded-lg border border-border bg-surface text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                <motion.div 
                  className="bg-surface-soft p-1 rounded-lg flex border border-border"
                  whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                >
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setViewMode('grid')} 
                      className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-black shadow-sm' : 'text-gray-500 hover:text-text-primary'}`}
                    >
                      <GridIcon/>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setViewMode('table')} 
                      className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-black shadow-sm' : 'text-gray-500 hover:text-text-primary'}`}
                    >
                      <ListIcon/>
                    </motion.button>
                </motion.div>
                <div className="relative">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAddMenuOpen(prev => !prev)}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-primary to-primary/80 text-white font-bold rounded-md flex items-center gap-1 shadow-md hover:shadow-lg transition-all"
                    >
                        + Add New
                    </motion.button>
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: isAddMenuOpen ? 1 : 0, y: isAddMenuOpen ? 0 : -10, scale: isAddMenuOpen ? 1 : 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-2xl border border-border py-1 z-10 ${isAddMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                    >
                        <Link to="/profile/products/new" className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-soft transition-colors">Physical Product</Link>
                        <Link to="/profile/products/new-digital" className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-soft transition-colors">Digital Product</Link>
                    </motion.div>
                </div>
           </motion.div>
        </motion.div>
        
        {/* Content Section */}
        <motion.div 
          variants={itemVariants}
          className="bg-surface p-4 sm:p-6 rounded-lg shadow-soft border border-border min-h-[400px]"
        >
            {isLoading ? (
              <div className="flex justify-center items-center h-[400px]"><Spinner /></div>
            ) : filteredItems.length > 0 ? (
                 <>
                 {viewMode === 'grid' ? (
                     <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                     >
                        {filteredItems.map((item) => (
                            <motion.div 
                              key={item.id} 
                              variants={itemVariants}
                              whileHover={{ y: -8 }}
                              transition={{ type: "spring", stiffness: 300 }}
                              className="flex flex-col gap-2 group relative"
                            >
                               <ItemCard item={item} onQuickView={setQuickViewItem} />
                               <motion.div 
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                className="absolute top-2 right-2 flex flex-col gap-2 transition-opacity z-10"
                               >
                                   <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setItemToBoost(item)} 
                                    title="Boost Listing" 
                                    className="p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                                   >
                                    <RocketIcon />
                                   </motion.button>
                               </motion.div>
                               <motion.div 
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                className="flex flex-wrap items-center gap-2 justify-center bg-surface-soft p-2 rounded-lg mt-[-10px] z-20 relative text-[11px] transition-all"
                               >
                                   <Link to={`/item/${item.id}`} className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors">View</Link>
                                   <span className="text-gray-300">|</span>
                                   <button onClick={() => navigate(getEditorRoute(item, 'edit'))} className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors">Edit</button>
                                   <span className="text-gray-300">|</span>
                                   <button onClick={() => { navigate(getEditorRoute(item, 'duplicate')); showNotification('Use this listing as a template.'); }} className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors">Duplicate</button>
                                   <span className="text-gray-300">|</span>
                                   {getListingStatus(item) === 'published' ? (
                                     <button onClick={() => handleLifecycle(item.id, 'unpublish')} className="text-xs font-semibold text-text-secondary hover:text-amber-500 transition-colors">Unpublish</button>
                                   ) : getListingStatus(item) === 'draft' ? (
                                     <button onClick={() => handleLifecycle(item.id, 'publish')} className="text-xs font-semibold text-text-secondary hover:text-green-600 transition-colors">Publish</button>
                                   ) : (
                                     <button onClick={() => handleLifecycle(item.id, 'restoreDraft')} className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors">Restore Draft</button>
                                   )}
                                   <span className="text-gray-300">|</span>
                                   {getListingStatus(item) === 'archived' ? (
                                     <button onClick={() => handleLifecycle(item.id, 'publishFromArchive')} className="text-xs font-semibold text-text-secondary hover:text-green-600 transition-colors">Publish Now</button>
                                   ) : (
                                     <button onClick={() => handleLifecycle(item.id, 'archive')} className="text-xs font-semibold text-text-secondary hover:text-red-500 transition-colors">Archive</button>
                                   )}
                                   <span className="text-gray-300">|</span>
                                   <button onClick={() => handleDelete(item.id)} className="text-xs font-semibold text-text-secondary hover:text-red-600 transition-colors">Delete</button>
                               </motion.div>
                            </motion.div>
                        ))}
                     </motion.div>
                 ) : (
                     <motion.div 
                      variants={itemVariants}
                      className="overflow-x-auto"
                     >
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-secondary uppercase bg-surface-soft border-b border-border">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3">Stock</th>
                                    <th className="px-4 py-3">Boost</th>
                                    <th className="px-4 py-3">Automation</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <motion.tr 
                                      key={item.id} 
                                      variants={itemVariants}
                                      whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                                      className="border-b border-border hover:bg-surface-soft/50 group transition-all"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img src={getItemImage(item)} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                                                <Link to={`/item/${item.id}`} className="font-semibold text-text-primary hover:text-primary truncate max-w-[200px] transition-colors">{item.title}</Link>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                              const status = getListingStatus(item);
                                              return (
                                            <motion.span 
                                              whileHover={{ scale: 1.05 }}
                                              className={`inline-block px-2 py-1 text-xs font-bold rounded-full capitalize transition-all ${statusChipClasses(status)}`}
                                            >
                                                {status}
                                            </motion.span>
                                              );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                              {item.listingType === 'sale' && (
                                                <motion.input 
                                                  whileFocus={{ scale: 1.02 }}
                                                  type="number" 
                                                  defaultValue={item.salePrice || 0}
                                                  onBlur={(e) => handleQuickUpdate(item.id, 'salePrice', e.target.value)}
                                                  className="w-24 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                                  aria-label="Sale price"
                                                />
                                              )}
                                              {item.listingType === 'auction' && (
                                                <>
                                                  <motion.input
                                                    whileFocus={{ scale: 1.02 }}
                                                    type="number"
                                                    defaultValue={item.auctionDetails?.startingBid || 0}
                                                    onBlur={(e) => handleQuickUpdate(item.id, 'startingBid', e.target.value)}
                                                    className="w-24 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                                    aria-label="Auction starting bid"
                                                  />
                                                  <motion.input
                                                    whileFocus={{ scale: 1.02 }}
                                                    type="number"
                                                    defaultValue={item.buyNowPrice || 0}
                                                    onBlur={(e) => handleQuickUpdate(item.id, 'buyNowPrice', e.target.value)}
                                                    className="w-24 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                                    aria-label="Auction buy now price"
                                                  />
                                                </>
                                              )}
                                              {item.listingType === 'rent' && (
                                                <motion.input 
                                                  whileFocus={{ scale: 1.02 }}
                                                  type="number" 
                                                  defaultValue={item.rentalPrice || item.rentalRates?.daily || 0}
                                                  onBlur={(e) => handleQuickUpdate(item.id, 'rentalPrice', e.target.value)}
                                                  className="w-24 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                                  aria-label="Rental price"
                                                />
                                              )}
                                              {item.listingType === 'both' && (
                                                <>
                                                  <motion.input
                                                    whileFocus={{ scale: 1.02 }}
                                                    type="number"
                                                    defaultValue={item.salePrice || 0}
                                                    onBlur={(e) => handleQuickUpdate(item.id, 'salePrice', e.target.value)}
                                                    className="w-24 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                                    aria-label="Sale price"
                                                  />
                                                  <motion.input
                                                    whileFocus={{ scale: 1.02 }}
                                                    type="number"
                                                    defaultValue={item.rentalPrice || item.rentalRates?.daily || 0}
                                                    onBlur={(e) => handleQuickUpdate(item.id, 'rentalPrice', e.target.value)}
                                                    className="w-24 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                                    aria-label="Rental price"
                                                  />
                                                </>
                                              )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <motion.input 
                                              whileFocus={{ scale: 1.02 }}
                                              type="number" 
                                              defaultValue={item.stock} 
                                              onBlur={(e) => handleQuickUpdate(item.id, 'stock', e.target.value)}
                                              className="w-16 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.boostLevel ? (
                                                <motion.span 
                                                  animate={{ scale: [1, 1.05, 1] }}
                                                  transition={{ duration: 2, repeat: Infinity }}
                                                  className="text-xs font-bold text-purple-600 uppercase"
                                                >
                                                  {item.boostLevel}
                                                </motion.span>
                                            ) : (
                                                <motion.button 
                                                  whileHover={{ scale: 1.05 }}
                                                  whileTap={{ scale: 0.95 }}
                                                  onClick={() => setItemToBoost(item)} 
                                                  className="text-xs text-purple-500 hover:text-purple-600 transition-colors flex items-center gap-1 font-semibold"
                                                >
                                                  <RocketIcon /> Boost
                                                </motion.button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                <motion.button
                                                  whileHover={{ scale: 1.05 }}
                                                  onClick={() => handleAutomationToggle(item, 'autoReprice', 'Auto repricing')}
                                                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${item.automation?.autoReprice ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary'}`}
                                                >
                                                    Reprice
                                                </motion.button>
                                                <motion.button
                                                  whileHover={{ scale: 1.05 }}
                                                  onClick={() => handleAutomationToggle(item, 'autoRestock', 'Auto restock')}
                                                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${item.automation?.autoRestock ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary'}`}
                                                >
                                                    Restock
                                                </motion.button>
                                                <motion.button
                                                  whileHover={{ scale: 1.05 }}
                                                  onClick={() => handleAutomationToggle(item, 'autoPromote', 'Auto promote')}
                                                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${item.automation?.autoPromote ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary'}`}
                                                >
                                                    Promote
                                                </motion.button>
                                                <motion.button
                                                  whileHover={{ scale: 1.05 }}
                                                  onClick={() => handleAutomationToggle(item, 'autoFulfill', 'Auto fulfill')}
                                                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${item.automation?.autoFulfill ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-secondary hover:border-primary'}`}
                                                >
                                                    Fulfill
                                                </motion.button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <motion.div 
                                              initial={{ opacity: 0 }}
                                              whileHover={{ opacity: 1 }}
                                              className="flex justify-end gap-3 transition-opacity"
                                            >
                                                <motion.button 
                                                  whileHover={{ scale: 1.05 }}
                                                  whileTap={{ scale: 0.95 }}
                                                  onClick={() => navigate(getEditorRoute(item, 'edit'))} 
                                                  className="text-primary hover:text-primary/80 transition-colors font-semibold"
                                                >
                                                  Edit
                                                </motion.button>
                                                <motion.button 
                                                  whileHover={{ scale: 1.05 }}
                                                  whileTap={{ scale: 0.95 }}
                                                  onClick={() => navigate(getEditorRoute(item, 'duplicate'))}
                                                  className="text-text-secondary hover:text-primary transition-colors font-semibold"
                                                >
                                                  Duplicate
                                                </motion.button>
                                                {getListingStatus(item) === 'published' && (
                                                  <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleLifecycle(item.id, 'unpublish')}
                                                    className="text-text-secondary hover:text-amber-600 transition-colors font-semibold"
                                                  >
                                                    Unpublish
                                                  </motion.button>
                                                )}
                                                {getListingStatus(item) === 'draft' && (
                                                  <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleLifecycle(item.id, 'publish')}
                                                    className="text-text-secondary hover:text-green-600 transition-colors font-semibold"
                                                  >
                                                    Publish
                                                  </motion.button>
                                                )}
                                                {getListingStatus(item) === 'archived' && (
                                                  <>
                                                    <motion.button
                                                      whileHover={{ scale: 1.05 }}
                                                      whileTap={{ scale: 0.95 }}
                                                      onClick={() => handleLifecycle(item.id, 'restoreDraft')}
                                                      className="text-text-secondary hover:text-primary transition-colors font-semibold"
                                                    >
                                                      Restore Draft
                                                    </motion.button>
                                                    <motion.button
                                                      whileHover={{ scale: 1.05 }}
                                                      whileTap={{ scale: 0.95 }}
                                                      onClick={() => handleLifecycle(item.id, 'publishFromArchive')}
                                                      className="text-text-secondary hover:text-green-600 transition-colors font-semibold"
                                                    >
                                                      Publish Now
                                                    </motion.button>
                                                  </>
                                                )}
                                                {getListingStatus(item) !== 'archived' && (
                                                  <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleLifecycle(item.id, 'archive')}
                                                    className="text-text-secondary hover:text-red-500 transition-colors font-semibold"
                                                  >
                                                    Archive
                                                  </motion.button>
                                                )}
                                                <motion.button 
                                                  whileHover={{ scale: 1.05 }}
                                                  whileTap={{ scale: 0.95 }}
                                                  onClick={() => handleDelete(item.id)} 
                                                  className="text-red-500 hover:text-red-600 transition-colors font-semibold"
                                                >
                                                  Delete
                                                </motion.button>
                                            </motion.div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                     </motion.div>
                 )}
                 </>
            ) : (
                <EmptyState
                    title={activeTab === 'draft' ? "No Drafts Found" : activeTab === 'archived' ? 'No Archived Items' : "No Listings Yet"}
                    message={activeTab === 'draft' ? "You have no saved drafts." : activeTab === 'archived' ? 'Your archived items will appear here.' : "You haven't listed any items. Let's get your first item up for rent or sale!"}
                    buttonText="List Your First Item"
                    buttonLink="/profile/products/new"
                    icon={activeTab === 'draft' ? 'draft' : 'list'}
                />
            )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default MyListingsPage;

