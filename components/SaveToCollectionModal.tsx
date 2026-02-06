import React, { useState, useEffect } from 'react';
import { useUserData } from '../hooks/useUserData';
import type { Item, ItemCollection } from '../types';
import Spinner from './Spinner';

interface SaveToCollectionModalProps {
  item: Item;
  onClose: () => void;
}

const SaveToCollectionModal: React.FC<SaveToCollectionModalProps> = ({ item, onClose }) => {
    const { collections, createCollection, addItemToCollection, removeItemFromCollection, isLoading } = useUserData();
    const [showNewCollectionForm, setShowNewCollectionForm] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    const handleCreateCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCollectionName.trim()) {
            await createCollection(newCollectionName, '', true); // Default to public
            setNewCollectionName('');
            setShowNewCollectionForm(false);
        }
    };

    const handleToggleItemInCollection = (collection: ItemCollection) => {
        const isItemInCollection = collection.itemIds.includes(item.id);
        if (isItemInCollection) {
            removeItemFromCollection(collection.id, item.id);
        } else {
            addItemToCollection(collection.id, item.id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[101] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">Save to a collection</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                {isLoading ? <Spinner className="my-10"/> : (
                    <div className="p-4 max-h-80 overflow-y-auto">
                        <ul className="space-y-2">
                           {collections.map(collection => {
                                const isItemInCollection = collection.itemIds.includes(item.id);
                                return (
                                    <li key={collection.id}>
                                        <button 
                                            onClick={() => handleToggleItemInCollection(collection)}
                                            className={`w-full text-left p-3 rounded-md flex items-center justify-between transition-colors ${isItemInCollection ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'}`}
                                        >
                                            <span className="font-semibold">{collection.name}</span>
                                            {isItemInCollection && <span className="text-xs font-bold">✓ SAVED</span>}
                                        </button>
                                    </li>
                                );
                           })}
                        </ul>
                    </div>
                )}
                 <div className="p-4 border-t">
                    {showNewCollectionForm ? (
                        <form onSubmit={handleCreateCollection} className="space-y-2">
                           <input 
                                type="text" 
                                value={newCollectionName} 
                                onChange={e => setNewCollectionName(e.target.value)}
                                placeholder="New collection name..."
                                className="w-full p-2 border border-gray-300 rounded-md"
                           />
                           <div className="flex gap-2 justify-end">
                               <button type="button" onClick={() => setShowNewCollectionForm(false)} className="px-3 py-1 text-sm bg-gray-200 rounded-md">Cancel</button>
                               <button type="submit" className="px-3 py-1 text-sm bg-black text-white rounded-md">Create</button>
                           </div>
                        </form>
                    ) : (
                         <button onClick={() => setShowNewCollectionForm(true)} className="w-full text-left p-2 rounded-md font-semibold text-primary hover:bg-primary/5">
                            + Create new collection
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SaveToCollectionModal;
