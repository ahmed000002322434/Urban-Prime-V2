
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useComparison } from '../../hooks/useComparison';
import StarRating from '../../components/StarRating';
import CategoryPill from '../../components/CategoryPill';
import type { Item } from '../../types';
// FIX: Replaced useAuth with useTranslation for currency information.
import { useTranslation } from '../../hooks/useTranslation';

const ComparePage: React.FC = () => {
    const { itemsToCompare, toggleCompare, clearCompare } = useComparison();
    const navigate = useNavigate();
    // FIX: Replaced currencySymbol from useAuth with currency object from useTranslation.
    const { currency } = useTranslation();

    useEffect(() => {
        if (itemsToCompare.length === 0) {
            navigate('/browse');
        }
    }, [itemsToCompare, navigate]);

    if (itemsToCompare.length === 0) {
        return null;
    }
    
    // Create a display array with up to 3 items, filling with placeholders if necessary
    const displayItems = [...itemsToCompare];
    while (displayItems.length < 3) {
        displayItems.push({ id: `placeholder-${displayItems.length}` } as Item); // Use a partial Item for placeholder
    }

    const renderRow = (label: string, renderCell: (item: Item) => React.ReactNode) => (
        <tr className="border-b border-gray-200">
            <td className="p-4 font-semibold text-sm text-gray-600 w-1/5 sticky left-0 bg-white">{label}</td>
            {displayItems.map(item => (
                <td key={item.id} className="p-4 text-center text-gray-800">
                    {item.title ? renderCell(item) : '-'}
                </td>
            ))}
        </tr>
    );

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-extrabold tracking-tight font-display text-gray-900">Compare Items</h1>
                <p className="mt-2 text-lg text-gray-600">Review your selected items side-by-side.</p>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-4 text-left font-semibold w-1/5 sticky left-0 bg-gray-50">
                               <button onClick={clearCompare} className="text-xs text-gray-500 hover:text-red-500">Clear All</button>
                            </th>
                            {displayItems.map((item) => (
                                <th key={item.id} className="p-4 w-4/15">
                                    {item.title ? (
                                        <div className="relative">
                                            <button onClick={() => toggleCompare(item)} className="absolute -top-2 -right-2 text-gray-400 hover:text-red-500 bg-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold border z-10">&times;</button>
                                            <Link to={`/item/${item.id}`}>
                                                <img src={item.imageUrls[0]} alt={item.title} className="w-full h-32 object-cover rounded-md mb-2"/>
                                                <span className="font-semibold text-sm hover:text-black">{item.title}</span>
                                            </Link>
                                        </div>
                                    ) : (
                                       <div className="w-full h-full bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-sm border-2 border-dashed p-4">Add an item to compare</div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {renderRow("Price", item => <span className="text-lg font-bold">{item.salePrice ? `${currency.symbol}${item.salePrice}` : item.rentalPrice ? `${currency.symbol}${item.rentalPrice} / ${item.rentalPriceType}` : '-'}</span>)}
                        {renderRow("Rating", item => item.avgRating ? <div className="flex justify-center items-center gap-1"><StarRating rating={item.avgRating} /><span className="text-xs text-gray-500">({item.reviews.length})</span></div> : '-')}
                        {renderRow("Category", item => item.category ? <CategoryPill categoryId={item.category} /> : '-')}
                        {renderRow("Condition", item => <span className="capitalize">{item.condition || '-'}</span>)}
                        {renderRow("Brand", item => item.brand || '-')}
                        {renderRow("Materials", item => item.materials ? item.materials.map(m => m.name).join(', ') : '-')}
                        {renderRow("Video Preview", item => item.videoUrl ? <span className="text-green-500 font-bold">✓ Yes</span> : <span className="text-gray-400">-</span>)}
                        {renderRow("Instant Book", item => item.isInstantBook ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-400">-</span>)}
                        {renderRow("Verified Item", item => item.isVerified ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-400">-</span>)}
                        {renderRow("Owner", item => item.owner ? <Link to={`/user/${item.owner.id}`} className="hover:underline">{item.owner.name}</Link> : '-')}
                         <tr>
                            <td className="p-4 font-semibold sticky left-0 bg-white"></td>
                            {displayItems.map(item => <td key={item.id} className="p-4 text-center">{item.title ? <Link to={`/item/${item.id}`} className="w-full text-center py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800 text-sm inline-block">View Item</Link> : ''}</td>)}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="text-center mt-10">
                <Link to="/browse" className="text-black font-semibold hover:underline">&larr; Back to Browsing</Link>
            </div>
        </div>
    );
};

export default ComparePage;