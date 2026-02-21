
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { OmniBridge, OmniAction, OmniLogEntry } from '../../services/OmniBridge';
import { generateOmniPlan, summarizeGrowthInsights } from '../../services/OmniBrain';
import { visionService, VisualAuditResult } from '../../services/visionService';
import { useOmniTelemetry } from '../../hooks/useOmniTelemetry';
import { useOmni } from '../../context/OmniContext';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../hooks/useTheme';
import { itemService } from '../../services/itemService';
import { isBackendConfigured } from '../../services/backendClient';
import Spinner from '../Spinner';
import CameraCapture from './CameraCapture';

const XIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const OmniDashboard: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user, openOnboarding } = useAuth();
  const navigate = useNavigate();
  const { addItemToCart, applyCoupon } = useCart();
  const { showNotification } = useNotification();
  const { setTheme } = useTheme();
  const { isThinking, setIsThinking, isExecuting, setIsExecuting, uploadProgress, setUploadProgress, setAuthError } = useOmni();
  const { dataPoints } = useOmniTelemetry();
  const [liveLogs, setLiveLogs] = useState<OmniLogEntry[]>([]);
  const [input, setInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [visualAudit, setVisualAudit] = useState<VisualAuditResult | null>(null);
  const [currentPlan, setCurrentPlan] = useState<OmniAction[]>([]);
  const [actionTrail, setActionTrail] = useState<{ id: string; label: string; status: 'queued' | 'running' | 'done' | 'error' }[]>([]);
  const [activeActionLabel, setActiveActionLabel] = useState('');
  
  useEffect(() => {
    if (isBackendConfigured()) {
      setLiveLogs([]);
      return;
    }

    const q = query(collection(db, 'live_logs'), orderBy('timestamp', 'desc'), limit(12));
    return onSnapshot(q, (snapshot) => {
      setLiveLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    }, (error) => {
      console.warn('Omni dashboard live log listener failed:', error);
      setLiveLogs([]);
    });
  }, []);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking || isExecuting) return;

    if (!user) {
      setAuthError(false);
    }

    setIsThinking(true);
    try {
      const response = await generateOmniPlan(input);
      
      if (response.status === 'REQUIRE_ASSETS') {
        await OmniBridge.pushOmniLog("Identity verified. Hardware gate opening...", 'ai');
        setShowCamera(true);
      } else {
        const plan: OmniAction[] = response.map((call: any) => ({
          type: call.name,
          payload: call.args,
          status: 'pending',
          description: `Neural Logic: ${call.name.replace('_', ' ')}`
        }));
        setCurrentPlan(plan);
      }
    } catch (err) {
      await OmniBridge.pushOmniLog("Neural link severed.", 'error');
    } finally {
      setIsThinking(false);
    }
  };

  const handleCapture = async (blob: Blob) => {
    if (!user) {
      setAuthError(false);
    }
    setShowCamera(false);
    setIsExecuting(true);
    
    try {
      await OmniBridge.pushOmniLog("Uploading high-res telemetry...", 'process');
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const audit = await visionService.analyzeProductImage(base64, 'image/jpeg');
        setVisualAudit(audit);
        
        await OmniBridge.pushOmniLog(`Audit Complete: Found "${audit.itemName}" in ${audit.category}`, 'ai');
        
        // Formulate final listing plan
        setCurrentPlan([{
          type: 'list_product',
          payload: { title: audit.itemName, price: 99, category: audit.category },
          status: 'pending',
          description: `Publish ${audit.itemName} to marketplace`
        }]);
      };
    } catch (err) {
      await OmniBridge.pushOmniLog("Vision Audit Failed: Subject not recognized.", "error");
    } finally {
      setIsExecuting(false);
    }
  };

  const performLocalAction = async (action: OmniAction) => {
    const payload = action.payload || {};
    switch (action.type) {
      case 'navigate':
        if (payload.path) navigate(payload.path);
        return;
      case 'add_to_cart': {
        if (payload.itemId) {
          const item = await itemService.getItemById(payload.itemId);
          if (item) addItemToCart(item, payload.quantity || 1);
        }
        return;
      }
      case 'apply_coupon':
        if (payload.code) applyCoupon(payload.code);
        return;
      case 'open_onboarding':
        openOnboarding(payload.purpose, payload.redirectPath);
        return;
      case 'toggle_theme':
        if (payload.theme) setTheme(payload.theme);
        return;
      case 'create_coupon':
        navigate('/profile/coupons');
        return;
      case 'set_promotion':
      case 'adjust_pricing':
      case 'schedule_campaign':
        navigate('/profile/promotions');
        return;
      case 'export_report':
        navigate('/profile/analytics/advanced');
        return;
      case 'audit_product':
        navigate('/audit');
        return;
      case 'notify_users':
        showNotification(payload.message || 'Omni broadcast delivered.');
        return;
      case 'list_product':
        localStorage.setItem('omni_draft_listing', JSON.stringify(payload));
        navigate('/profile/products/new');
        return;
      default:
        return;
    }
  };

  const executePlan = async () => {
    setIsExecuting(true);
    try {
      const guestId = localStorage.getItem('omni_guest_id') || `guest-${Date.now()}`;
      if (!localStorage.getItem('omni_guest_id')) localStorage.setItem('omni_guest_id', guestId);
      const userId = user?.id || guestId;
      setActionTrail(currentPlan.map((p, idx) => ({ id: `${idx}`, label: p.description || p.type, status: 'queued' })));
      for (let i = 0; i < currentPlan.length; i += 1) {
        const action = currentPlan[i];
        setActiveActionLabel(action.description || action.type);
        setActionTrail(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'running' } : a));
        await OmniBridge.pushOmniLog(`Executing: ${action.type}`, 'process');
        try {
          await performLocalAction(action);
          setActionTrail(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'done' } : a));
        } catch {
          setActionTrail(prev => prev.map((a, idx) => idx === i ? { ...a, status: 'error' } : a));
        }
      }
      await OmniBridge.executeBatch(userId, currentPlan);
      setCurrentPlan([]);
      setVisualAudit(null);
      setInput('');
      setActiveActionLabel('');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') setAuthError(true);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          layoutId="omni-panel"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="fixed left-0 top-0 bottom-0 w-full md:w-[500px] z-[200] p-6 flex flex-col"
        >
          <div className={`flex-1 backdrop-blur-3xl border rounded-[40px] shadow-2xl flex flex-col overflow-hidden transition-all duration-700 ${
            isThinking ? 'bg-purple-900/40 border-purple-500/50' : 
            isExecuting ? 'bg-blue-900/40 border-blue-500/50' : 
            'bg-white/80 dark:bg-black/80 border-white/20 dark:border-white/10'
          }`}>
            
            {/* Real Upload Progress */}
            {isExecuting && (
              <div className="absolute top-0 left-0 right-0 h-1 z-50 bg-white/10">
                <motion.div 
                  className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <header className="p-8 pb-4 flex justify-between items-center">
              <h2 className="text-2xl font-black font-display tracking-tight text-gray-900 dark:text-white uppercase">Reality Syncer</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><XIcon /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 no-scrollbar">
              
              {showCamera ? (
                <CameraCapture onCapture={handleCapture} onCancel={() => setShowCamera(false)} />
              ) : (
                <>
                  {activeActionLabel && (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">
                      Executing: {activeActionLabel}
                    </div>
                  )}

                  {/* Telemetry */}
                  <div className="h-24 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dataPoints}>
                        <Area type="monotone" dataKey="userValue" stroke="#0fb9b1" fill="#0fb9b133" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Audit Results */}
                  {visualAudit && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-primary/10 border border-primary/20 rounded-[28px]">
                      <h4 className="text-xs font-black uppercase text-primary mb-2 tracking-widest">Visual Forensic Audit</h4>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{visualAudit.itemName}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {visualAudit.flaws.map((flaw, i) => (
                          <span key={i} className="text-[10px] bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded-full border border-red-500/20">⚠ {flaw}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Logs */}
                  <div className="space-y-3">
                    {liveLogs.map(log => (
                      <div key={log.id} className="flex gap-3 items-center text-[11px] font-medium text-gray-600 dark:text-gray-400">
                        <span className={`w-1 h-1 rounded-full ${log.type === 'ai' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        {log.message}
                      </div>
                    ))}
                  </div>

                  {actionTrail.length > 0 && (
                    <div className="mt-4 bg-white/70 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">Omni Activity</p>
                      <div className="space-y-2 text-xs">
                        {actionTrail.map(step => (
                          <div key={step.id} className="flex items-center justify-between">
                            <span className="text-text-primary font-semibold">{step.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              step.status === 'done' ? 'bg-green-500/10 text-green-600' :
                              step.status === 'running' ? 'bg-blue-500/10 text-blue-600' :
                              step.status === 'error' ? 'bg-red-500/10 text-red-600' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>{step.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-8 pt-4">
               {currentPlan.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-primary mb-3">Authorize Execution</p>
                  {currentPlan.map((p, i) => <p key={i} className="text-sm font-bold mb-1">• {p.description}</p>)}
                  <button onClick={executePlan} className="w-full mt-4 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20">Sync Reality</button>
                </motion.div>
               )}

               <form onSubmit={handleCommand} className="relative group">
                  <div className="relative bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[28px] p-2 flex gap-3">
                    {/* Fix: changed 'inputValue' to 'input' and 'setInputValue' to 'setInput' */}
                    <input 
                      value={input} 
                      onChange={e => setInput(e.target.value)} 
                      placeholder="Start a sequence..." 
                      className="flex-1 bg-transparent px-4 text-sm dark:text-white outline-none"
                    />
                    <button className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-[22px] font-black uppercase text-[10px]">Run</button>
                  </div>
               </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OmniDashboard;
