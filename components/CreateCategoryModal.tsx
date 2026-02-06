import React, { useState } from 'react';
import type { Category } from '../types';
import Spinner from './Spinner';
import { useNotification } from '../context/NotificationContext';

interface CreateCategoryModalProps {
    onClose: () => void;
    onCategoryCreated: (parentCategoryId: string, newCategoryName: string) => Promise<void>;
    parentCategories: Category[];
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ onClose, onCategoryCreated, parentCategories }) => {
    const [parentCategoryId, setParentCategoryId] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { showNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentCategoryId || !newCategoryName.trim()) {
            showNotification("Please select a parent category and enter a name.");
            return;
        }
        setIsLoading(true);
        try {
            await onCategoryCreated(parentCategoryId, newCategoryName);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="absolute top-0 left-full ml-4 w-80 bg-white rounded-lg shadow-xl border p-4 z-10 animate-fade-in-up">
            <h4 className="font-bold text-md mb-2">Create New Category</h4>
            <p className="text-xs text-gray-500 mb-4">Can't find the right category? Add it here.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="text-sm font-medium">Parent Category</label>
                    <select value={parentCategoryId} onChange={e => setParentCategoryId(e.target.value)} required className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                        <option value="">Select...</option>
                        {parentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium">New Subcategory Name</label>
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required className="w-full mt-1 p-2 border rounded-md text-sm bg-white" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-3 py-1 text-sm rounded-md hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={isLoading} className="px-3 py-1 text-sm bg-black text-white rounded-md flex items-center justify-center min-w-[70px]">
                        {isLoading ? <Spinner size="sm" /> : "Create"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCategoryModal;