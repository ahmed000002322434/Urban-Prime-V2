import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { listerService } from '../../services/itemService';
import type { DiscountCode } from '../../types';
import Spinner from '../../components/Spinner';

const PromotionsManagerPage: React.FC = () => {
    const { user } = useAuth();
    const [codes, setCodes] = useState<DiscountCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCode, setNewCode] = useState({ code: '', percentage: 10 });

    const fetchCodes = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const codesData = await listerService.getDiscountCodes(user.id);
            setCodes(codesData);
        } catch (error) {
            console.error("Failed to fetch codes:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newCode.code || newCode.percentage <= 0) return;
        await listerService.createDiscountCode(user.id, newCode.code, newCode.percentage);
        setNewCode({ code: '', percentage: 10 });
        setShowCreateForm(false);
        fetchCodes();
    };

    const handleToggleActive = async (code: DiscountCode) => {
        await listerService.updateDiscountCode(code.id, { isActive: !code.isActive });
        fetchCodes();
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-display">Promotions Manager</h1>
                <button 
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="px-4 py-2 text-sm bg-primary text-white font-bold rounded-md"
                >
                    {showCreateForm ? 'Cancel' : '+ New Discount'}
                </button>
            </div>
            
            {showCreateForm && (
                <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-200">
                    <form onSubmit={handleCreateCode} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-xs font-semibold">Discount Code</label>
                            <input
                                type="text"
                                value={newCode.code}
                                onChange={e => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                placeholder="e.g., FALL20"
                                required
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <div className="flex-1">
                             <label className="text-xs font-semibold">Percentage Off</label>
                             <input
                                type="number"
                                value={newCode.percentage}
                                onChange={e => setNewCode(p => ({ ...p, percentage: Number(e.target.value) }))}
                                min="1" max="100"
                                required
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                        <button type="submit" className="px-4 py-2 bg-black text-white rounded-md font-semibold text-sm">
                            Create
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
                 {isLoading ? <Spinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Discount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map(code => (
                                    <tr key={code.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono font-semibold">{code.code}</td>
                                        <td className="px-4 py-3">{code.percentage}% off</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${code.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {code.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleToggleActive(code)} className="font-semibold text-sm text-primary hover:underline">
                                                {code.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionsManagerPage;