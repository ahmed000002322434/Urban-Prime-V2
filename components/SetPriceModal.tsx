import React, { useState, useMemo } from 'react';
import type { SupplierProduct } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import Spinner from './Spinner';

interface SetPriceModalProps {
  supplierProduct: SupplierProduct;
  onClose: () => void;
  onImport: (salePrice: number) => Promise<void>;
  isImporting: boolean;
}

const SetPriceModal: React.FC<SetPriceModalProps> = ({ supplierProduct, onClose, onImport, isImporting }) => {
    const { currency } = useTranslation();
    const suggestedPrice = useMemo(() => parseFloat((supplierProduct.wholesalePrice * 2.2).toFixed(2)), [supplierProduct.wholesalePrice]);
    const [salePrice, setSalePrice] = useState<number>(suggestedPrice);

    const profit = useMemo(() => {
        if (salePrice > 0) {
            return salePrice - supplierProduct.wholesalePrice - supplierProduct.shippingInfo.cost;
        }
        return 0;
    }, [salePrice, supplierProduct]);

    const handleImport = () => {
        if (salePrice > supplierProduct.wholesalePrice) {
            onImport(salePrice);
        } else {
            alert("Sale price must be greater than the wholesale price.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[101] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">Import to Your Store</h3>
                    <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <img src={supplierProduct.imageUrls[0]} alt={supplierProduct.title} className="w-full h-auto object-cover rounded-lg aspect-square" />
                        <h4 className="font-semibold mt-2">{supplierProduct.title}</h4>
                        <p className="text-xs text-gray-500">{supplierProduct.supplierName}</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Wholesale Price</label>
                            <p className="text-xl font-bold">{currency.symbol}{supplierProduct.wholesalePrice.toFixed(2)}</p>
                        </div>
                        <div>
                            <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">Your Sale Price</label>
                            <input
                                id="salePrice"
                                type="number"
                                value={salePrice}
                                onChange={e => setSalePrice(parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm font-medium text-gray-500">Shipping Cost (Covered by Sale Price)</p>
                            <p className="font-semibold">{currency.symbol}{supplierProduct.shippingInfo.cost.toFixed(2)}</p>
                        </div>
                         <div className={`p-3 rounded-md ${profit > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <p className="text-sm font-medium">Estimated Profit</p>
                            <p className="text-xl font-bold">{currency.symbol}{profit.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50">
                    <button 
                        onClick={handleImport} 
                        disabled={isImporting}
                        className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                    >
                        {isImporting ? <Spinner size="sm" /> : "Confirm & Import Product"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SetPriceModal;