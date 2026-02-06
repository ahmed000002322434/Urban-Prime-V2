
import React, { useState } from 'react';
import { useUserData } from '../../hooks/useUserData';
import type { ItemCollection } from '../../types';
import Spinner from '../../components/Spinner';

const EditCollectionModal: React.FC<{ collection: ItemCollection; onClose: () => void; onSave: (collectionId: string, updates: Partial<ItemCollection>) => void; }> = ({ collection, onClose, onSave }) => {
    const [coverImageUrl, setCoverImageUrl] = useState(collection.coverImageUrl || '');
    const [isShopTheLook, setIsShopTheLook] = useState(collection.isShopTheLook || false);

    const handleSave = () => {
        onSave(collection.id, { coverImageUrl, isShopTheLook, isPublic: isShopTheLook });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-4">Edit Collection</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Cover Image URL</label>
                        <input type="url" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://..." className="w-full p-2 border rounded-md mt-1" />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={isShopTheLook} onChange={e => setIsShopTheLook(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"/>
                        <div>
                            <span className="font-semibold">Make this a "Shop the Look"</span>
                            <p className="text-xs text-gray-500">This will make the collection public on your profile.</p>
                        </div>
                    </label>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-black text-white rounded-md">Save</button>
                </div>
            </div>
        </div>
    );
};


const MyCollectionsPage: React.FC = () => {
    // FIX: Destructure updateCollection from useUserData to make it available for use.
    const { collections, createCollection, removeItemFromCollection, updateCollection, isLoading } = useUserData();
    const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingCollection, setEditingCollection] = useState<ItemCollection | null>(null);
    
    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCollectionName.trim()) {
            setIsCreating(true);
            await createCollection(newCollectionName, '', true); // Default to public
            setNewCollectionName('');
            setShowNewCollectionForm(false);
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {editingCollection && <EditCollectionModal collection={editingCollection} onClose={() => setEditingCollection(null)} onSave={updateCollection} />}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-display">My Collections</h1>
                <button 
                    onClick={() => setShowNewCollectionForm(true)}
                    className="px-4 py-2 text-sm bg-primary text-white font-bold rounded-md"
                >
                    + Create Collection
                </button>
            </div>
            
            {showNewCollectionForm && (
                 <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-200">
                    <form onSubmit={handleCreateCollection} className="flex gap-2">
                        <input
                            type="text"
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            placeholder="New collection name..."
                            className="w-full p-2 border rounded-md"
                            required
                            autoFocus
                        />
                        <button type="submit" disabled={isCreating} className="px-4 py-2 bg-black text-white rounded-md font-semibold text-sm disabled:bg-gray-400">
                            {isCreating ? <Spinner size="sm" /> : "Create"}
                        </button>
                         <button type="button" onClick={() => setShowNewCollectionForm(false)} className="px-4 py-2 bg-gray-200 rounded-md font-semibold text-sm">
                            Cancel
                        </button>
                    </form>
                </div>
            )}
            
            {isLoading ? <Spinner /> : collections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map(collection => (
                        <div key={collection.id} className="bg-white p-4 rounded-xl shadow-soft border border-gray-200 flex flex-col">
                           <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold">{collection.name}</h3>
                                        <p className="text-xs text-gray-500">{collection.itemIds.length} items</p>
                                    </div>
                                    <button onClick={() => setEditingCollection(collection)} className="text-xs font-semibold text-primary hover:underline">Edit</button>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {collection.items?.slice(0, 3).map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm">
                                            <img src={item.imageUrls[0]} alt={item.title} className="w-8 h-8 rounded object-cover" />
                                            <span className="truncate flex-1">{item.title}</span>
                                            <button onClick={() => removeItemFromCollection(collection.id, item.id)} className="text-red-500 text-xs font-bold">REMOVE</button>
                                        </div>
                                    ))}
                                    {collection.itemIds.length > 3 && <p className="text-xs text-gray-400">+ {collection.itemIds.length - 3} more</p>}
                                </div>
                           </div>
                            {collection.isShopTheLook && (
                                <p className="text-xs font-bold text-green-600 bg-green-100 p-1 rounded-md text-center mt-4">✓ Shop the Look</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-xl shadow-soft border">
                    <p className="text-gray-500">You haven't created any collections yet.</p>
                </div>
            )}
        </div>
    );
};

export default MyCollectionsPage;
