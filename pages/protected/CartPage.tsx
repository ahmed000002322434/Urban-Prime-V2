
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useTranslation } from '../../hooks/useTranslation';
import EmptyCart from '../../components/EmptyCart';
import BackButton from '../../components/BackButton';
import OrderSummaryCard from '../../components/OrderSummaryCard';
import type { CartItem } from '../../types';

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const StoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m9 21 3-6 3 6"></path></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const MoveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>;

const getEstimateLabel = (item: CartItem) => {
    const estimate = item.shippingEstimates?.[0] || item.supplierInfo?.shippingProfile?.fastestEstimate;
    if (!estimate) return '3-5 business days';
    return `${estimate.minDays}-${estimate.maxDays} business days`;
};

const getItemImage = (item: CartItem) => {
    if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls[0];
    if (item.images && item.images.length > 0) return item.images[0];
    return `https://picsum.photos/seed/${item.id}/300/300`;
};

const CartItemRow: React.FC<{ item: CartItem, onRemove: () => void, onSave: () => void, onUpdateQty: (q: number) => void }> = ({ item, onRemove, onSave, onUpdateQty }) => {
    const { currency } = useTranslation();
    const itemPrice = item.salePrice || item.rentalPrice || 0;
    const isRental = item.listingType === 'rent';
    const returnWindow = item.returnPolicy?.windowDays || item.supplierInfo?.returnPolicy?.windowDays;
    const warranty = item.warranty?.coverage;

    return (
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 hover:bg-surface-soft/30 transition-colors">
            <Link to={`/item/${item.id}`} className="shrink-0">
                <img src={getItemImage(item)} alt={item.title} className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-border" />
            </Link>
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-text-primary text-lg leading-tight line-clamp-2 hover:text-primary transition-colors">
                            <Link to={`/item/${item.id}`}>{item.title}</Link>
                        </h3>
                         {item.brand && <p className="text-xs text-text-secondary mt-1">{item.brand}</p>}
                    </div>
                    <div className="text-right">
                         <p className="text-lg font-bold text-text-primary">{currency.symbol}{itemPrice.toFixed(2)}</p>
                         {item.compareAtPrice && <p className="text-sm text-text-secondary line-through">{currency.symbol}{item.compareAtPrice.toFixed(2)}</p>}
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span className="px-2 py-1 rounded-full bg-surface-soft border border-border">ETA {getEstimateLabel(item)}</span>
                    {returnWindow && <span className="px-2 py-1 rounded-full bg-surface-soft border border-border">{returnWindow} day returns</span>}
                    {warranty && <span className="px-2 py-1 rounded-full bg-surface-soft border border-border">Warranty</span>}
                    {item.isVerified && <span className="px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">Verified</span>}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {!isRental ? (
                            <div className="flex items-center border border-border rounded-lg h-9 bg-surface">
                                <button onClick={() => onUpdateQty(item.quantity - 1)} className="px-3 hover:bg-gray-100 dark:hover:bg-gray-700 h-full rounded-l-lg transition-colors">−</button>
                                <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                                <button onClick={() => onUpdateQty(item.quantity + 1)} className="px-3 hover:bg-gray-100 dark:hover:bg-gray-700 h-full rounded-r-lg transition-colors">+</button>
                            </div>
                        ) : (
                            <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-md">Rental</span>
                        )}
                        <p className={`text-sm font-semibold ${item.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={onSave} className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                            <HeartIcon /> Save for Later
                        </button>
                        <button onClick={onRemove} className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
                            <TrashIcon /> Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartPage: React.FC = () => {
    const { cartGroups, cartCount, removeItemFromCart, saveForLater, updateItemQuantity, savedItems, moveToCart, removeSavedItem } = useCart();
    const { currency } = useTranslation();

    if (cartCount === 0 && savedItems.length === 0) {
        return (
             <div className="bg-background min-h-screen">
                <div className="absolute top-8 left-8">
                     <BackButton to="/browse" alwaysShowText />
                </div>
                <EmptyCart />
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-6 flex items-center gap-4">
                     <BackButton to="/browse" alwaysShowText />
                     <h1 className="text-3xl font-bold font-display text-text-primary">Shopping Cart <span className="text-lg font-normal text-text-secondary">({cartCount} items)</span></h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* LEFT COLUMN: Cart Items */}
                    <div className="lg:col-span-2 space-y-8">
                        {cartCount === 0 ? (
                            <div className="bg-surface p-8 rounded-xl shadow-soft border border-border text-center">
                                <p className="text-lg text-text-secondary">Your cart is empty.</p>
                            </div>
                        ) : (
                            cartGroups.map(group => (
                                <div key={group.id} className="bg-surface rounded-xl shadow-soft border border-border overflow-hidden">
                                    <div className="p-4 bg-surface-soft/50 border-b border-border flex items-center gap-2">
                                        <StoreIcon />
                                        <span className="text-sm font-semibold text-text-secondary">Shipping from</span>
                                        <Link to={`/store/${group.id}`} className="text-sm font-bold text-text-primary hover:text-primary hover:underline">{group.name}</Link>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {group.items.map(item => (
                                            <CartItemRow 
                                                key={item.id} 
                                                item={item} 
                                                onRemove={() => removeItemFromCart(item.id)}
                                                onSave={() => saveForLater(item.id)}
                                                onUpdateQty={(q) => updateItemQuantity(item.id, q)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* SAVED FOR LATER SECTION */}
                        {savedItems.length > 0 && (
                            <div className="mt-12">
                                <h2 className="text-xl font-bold font-display text-text-primary mb-4 flex items-center gap-2">
                                    <HeartIcon /> Saved for Later ({savedItems.length})
                                </h2>
                                <div className="bg-surface rounded-xl shadow-soft border border-border divide-y divide-border">
                                    {savedItems.map(item => {
                                        const itemPrice = item.salePrice || item.rentalPrice || 0;
                                        return (
                                            <div key={item.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 opacity-90 hover:opacity-100 transition-opacity">
                                                <Link to={`/item/${item.id}`} className="shrink-0">
                                                    <img src={getItemImage(item)} alt={item.title} className="w-20 h-20 object-cover rounded-md border border-border grayscale hover:grayscale-0 transition-all" />
                                                </Link>
                                                <div className="flex-grow text-center sm:text-left">
                                                    <Link to={`/item/${item.id}`} className="font-bold text-text-primary hover:text-primary line-clamp-1">{item.title}</Link>
                                                    <p className="font-bold text-text-secondary mt-1">{currency.symbol}{itemPrice.toFixed(2)}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                     <button onClick={() => moveToCart(item.id)} className="px-4 py-2 text-xs font-bold bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 flex items-center gap-1">
                                                        <MoveIcon /> Move to Cart
                                                     </button>
                                                     <button onClick={() => removeSavedItem(item.id)} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <TrashIcon />
                                                     </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Summary */}
                    <div className="lg:col-span-1">
                        <OrderSummaryCard />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
