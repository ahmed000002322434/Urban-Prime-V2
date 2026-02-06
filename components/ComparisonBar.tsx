import React from 'react';
import { Link } from 'react-router-dom';
import { useComparison } from '../hooks/useComparison';

const ComparisonBar: React.FC = () => {
    const { itemsToCompare, toggleCompare, clearCompare } = useComparison();

    if (itemsToCompare.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md p-3 z-50 animate-fade-in-up border-t border-gray-200/80 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="container mx-auto flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <p className="font-bold text-gray-900 flex-shrink-0">Comparing ({itemsToCompare.length}/3)</p>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {itemsToCompare.map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-gray-100 p-1 rounded-md animate-zoom-in">
                                <img src={item.imageUrls[0]} alt={item.title} className="w-8 h-8 rounded-sm object-cover" />
                                <span className="text-xs font-semibold truncate max-w-[100px] hidden sm:inline text-gray-800">{item.title}</span>
                                <button onClick={() => toggleCompare(item)} className="text-xs text-gray-500 hover:text-red-500 font-bold px-1">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={clearCompare} className="text-sm font-semibold text-gray-500 hover:text-red-500">Clear</button>
                    <Link to="/compare" className="px-6 py-2 bg-black text-white font-bold rounded-lg text-sm">
                        Compare
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ComparisonBar;