

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

const StarIcon = ({isFilled}: {isFilled: boolean}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill={isFilled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors ${isFilled ? 'text-yellow-400' : 'text-gray-400'}`}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

const RocketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor" className="text-purple-500"><path d="M12 2.5a.5.5 0 0 1 .5.5v3.032c1.928.272 3.65 1.254 4.875 2.705l2.146-2.147a.5.5 0 0 1 .708 0l.707.708a.5.5 0 0 1 0 .707l-2.147 2.146c1.45 1.225 2.433 2.947 2.705 4.875H21.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3.032c-.272 1.928-1.254 3.65-2.705 4.875l2.147 2.146a.5.5 0 0 1 0 .707l-.707.708a.5.5 0 0 1-.708 0l-2.146-2.147c-1.225 1.45-2.947 2.433-4.875 2.705V21.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-3.032c-1.928-.272-3.65-1.254-4.875-2.705l-2.146 2.147a.5.5 0 0 1-.708 0l-.707-.708a.5.5 0 0 1 0-.707l2.147-2.146c-1.45-1.225-2.433-2.947-2.705-4.875H2.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3.032c.272-1.928 1.254-3.65 2.705-4.875L5.836 6.444a.5.5 0 0 1 0-.707l.707-.708a.5.5 0 0 1 .708 0l2.146 2.147c1.225-1.45 2.947-2.433 4.875-2.705V3a.5.5 0 0 1 .5-.5h1zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

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

  const fetchItems = () => {
      if (user) {
          setIsLoading(true);
          itemService.getItemsByOwner(user.id).then((items) => {
              setMyItems(items);
              setIsLoading(false);
          });
      }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  if (!user) return null;

  const handleToggleFeatured = async (item: Item) => {
      await itemService.updateItem(item.id, { isFeatured: !item.isFeatured });
      fetchItems(); // Refresh list
  };

  const handleArchive = async (itemId: string) => {
    await itemService.updateItem(itemId, { status: 'archived' });
    showNotification("Item archived.");
    fetchItems();
  };

  const handleUnarchive = async (itemId: string) => {
    await itemService.updateItem(itemId, { status: 'draft' });
    showNotification("Item unarchived and moved to drafts.");
    fetchItems();
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) {
        await itemService.deleteItem(itemId);
        showNotification("Item permanently deleted.");
        fetchItems();
    }
  };

  const handleQuickUpdate = async (itemId: string, field: 'salePrice' | 'stock', value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return;
      await itemService.updateItem(itemId, { [field]: numValue });
      showNotification(`${field === 'salePrice' ? 'Price' : 'Stock'} updated!`);
      // Update local state without full refetch for speed
      setMyItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: numValue } : i));
  };

  const filteredItems = myItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'published' && (!item.status || item.status === 'published')) return true;
    return item.status === activeTab;
  });

  const TabButton = ({ tab, label, count }: { tab: 'all' | 'published' | 'draft' | 'archived', label: string, count: number }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-semibold text-sm rounded-t-lg border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
    >
      {label} <span className="bg-surface-soft text-text-primary rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>
    </button>
  );

  return (
    <>
      {quickViewItem && <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />}
      {itemToBoost && <BoostListingModal item={itemToBoost} onClose={() => { setItemToBoost(null); fetchItems(); }} />}
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-2">
           <div className="flex overflow-x-auto no-scrollbar">
               <TabButton tab="all" label="All" count={myItems.length} />
               <TabButton tab="published" label="Published" count={myItems.filter(i => i.status === 'published' || !i.status).length} />
               <TabButton tab="draft" label="Drafts" count={myItems.filter(i => i.status === 'draft').length} />
               <TabButton tab="archived" label="Archived" count={myItems.filter(i => i.status === 'archived').length} />
           </div>
           
           <div className="flex items-center gap-3">
                <div className="bg-surface-soft p-1 rounded-lg flex border border-border">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-black shadow-sm' : 'text-gray-500'}`}><GridIcon/></button>
                    <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-black shadow-sm' : 'text-gray-500'}`}><ListIcon/></button>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setIsAddMenuOpen(prev => !prev)}
                        className="px-4 py-2 text-sm bg-primary text-white font-bold rounded-md flex items-center gap-1 shadow-md hover:opacity-90 transition-opacity"
                    >
                        + Add New
                    </button>
                    {isAddMenuOpen && (
                        <div 
                            onMouseLeave={() => setIsAddMenuOpen(false)}
                            className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-2xl border border-border py-1 z-10 animate-fade-in-up">
                            <Link to="/profile/products/new" className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-soft">Physical Product</Link>
                            <Link to="/profile/products/new-digital" className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-soft">Digital Product</Link>
                        </div>
                    )}
                </div>
           </div>
        </div>
        
        <div className="bg-surface p-6 rounded-lg shadow-soft border border-border min-h-[400px]">
            {isLoading ? <Spinner /> : filteredItems.length > 0 ? (
                 <>
                 {viewMode === 'grid' ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="flex flex-col gap-2 group relative">
                               <ItemCard item={item} onQuickView={setQuickViewItem} />
                               <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                   <button onClick={() => setItemToBoost(item)} title="Boost Listing" className="p-2 bg-purple-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"><RocketIcon /></button>
                               </div>
                               <div className="flex items-center justify-between bg-surface-soft p-2 rounded-lg mt-[-10px] z-20 relative">
                                   <Link to={`/profile/products/new?edit=${item.id}`} className="text-xs font-semibold text-text-secondary hover:text-primary">Edit</Link>
                                   <span className="text-gray-300">|</span>
                                   <button onClick={() => handleArchive(item.id)} className="text-xs font-semibold text-text-secondary hover:text-red-500">Archive</button>
                               </div>
                            </div>
                        ))}
                     </div>
                 ) : (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-secondary uppercase bg-surface-soft border-b border-border">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="px-4 py-3">Stock</th>
                                    <th className="px-4 py-3">Boost</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="border-b border-border hover:bg-surface-soft/50 group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img src={item.imageUrls[0]} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                                                <Link to={`/item/${item.id}`} className="font-semibold text-text-primary hover:underline truncate max-w-[200px]">{item.title}</Link>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {item.status || 'Published'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="number" 
                                                defaultValue={item.salePrice || item.rentalPrice} 
                                                onBlur={(e) => handleQuickUpdate(item.id, 'salePrice', e.target.value)}
                                                className="w-20 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="number" 
                                                defaultValue={item.stock} 
                                                onBlur={(e) => handleQuickUpdate(item.id, 'stock', e.target.value)}
                                                className="w-16 p-1 border border-border rounded bg-transparent focus:bg-surface focus:ring-1 focus:ring-primary text-right"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.boostLevel ? (
                                                <span className="text-xs font-bold text-purple-600 uppercase">{item.boostLevel}</span>
                                            ) : (
                                                <button onClick={() => setItemToBoost(item)} className="text-xs text-purple-500 hover:underline flex items-center gap-1"><RocketIcon /> Boost</button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate(`/profile/products/new?edit=${item.id}`)} className="text-primary hover:underline font-semibold">Edit</button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline font-semibold">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
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
        </div>
      </div>
    </>
  );
};

export default MyListingsPage;
