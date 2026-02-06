
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOmniPlan } from '../../services/OmniBrain';
import { OmniBridge, OmniAction } from '../../services/OmniBridge';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../Spinner';

interface OmniConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

const OmniConsole: React.FC<OmniConsoleProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<OmniAction[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsPlanning(true);
    setPlan([]);
    try {
      const calls = await generateOmniPlan(input);
      const newPlan: OmniAction[] = calls.map((call: any) => ({
        type: call.name,
        payload: call.args,
        status: 'pending',
        description: `Preparing ${call.name.replace('_', ' ')}...`
      }));
      setPlan(newPlan);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async () => {
    if (!user) return;
    setIsExecuting(true);
    try {
      await OmniBridge.executeBatch(user.id, plan);
      setPlan(prev => prev.map(a => ({ ...a, status: 'completed' })));
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
        >
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <div className="w-full max-w-3xl space-y-12">
            {/* Header */}
            <div className="text-center space-y-2">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="text-primary text-6xl mb-4"
              >
                O
              </motion.div>
              <h1 className="text-4xl font-black font-display tracking-tighter text-white">OMNI INTERFACE</h1>
              <p className="text-gray-500 uppercase tracking-[0.3em] text-xs font-bold">Autonomous Marketplace Engine</p>
            </div>

            {/* Input Bar */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
              <form onSubmit={handleCommand} className="relative bg-[#0a0a0a] rounded-2xl border border-white/10 p-2 flex gap-4">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Omni to list products, design your store, or run sales..."
                  className="flex-1 bg-transparent border-none text-white text-lg px-4 py-3 outline-none placeholder:text-gray-600"
                />
                <button 
                  disabled={isPlanning}
                  className="bg-white text-black px-8 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                  {isPlanning ? <Spinner size="sm" /> : 'Analyze'}
                </button>
              </form>
            </div>

            {/* Plan Feed */}
            <div className="space-y-4">
              <AnimatePresence>
                {plan.map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {action.type === 'list_product' ? '📦' : '🎨'}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm capitalize">{action.type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">{JSON.stringify(action.payload).slice(0, 50)}...</p>
                      </div>
                    </div>
                    {action.status === 'completed' && <span className="text-green-500 text-xs font-bold">DONE</span>}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Execution Control */}
            {plan.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="w-full py-5 bg-primary text-white font-black text-xl rounded-2xl shadow-[0_0_50px_rgba(15,185,177,0.4)] hover:shadow-[0_0_80px_rgba(15,185,177,0.6)] transition-all flex items-center justify-center gap-4"
                >
                  {isExecuting ? <Spinner size="md" /> : <>EXECUTE SYSTEM PLAN <ArrowRightIcon /></>}
                </button>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Batched Transactional Logic Enabled</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ArrowRightIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;

export default OmniConsole;
