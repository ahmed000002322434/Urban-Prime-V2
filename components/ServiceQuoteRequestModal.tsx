import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import providerWorkspaceService from '../services/providerWorkspaceService';
import type { Service } from '../types';
import Spinner from './Spinner';

interface ServiceQuoteRequestModalProps {
  service: Service;
  onClose: () => void;
}

const ServiceQuoteRequestModal: React.FC<ServiceQuoteRequestModalProps> = ({ service, onClose }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [brief, setBrief] = useState('');
  const [budgetMin, setBudgetMin] = useState(String(service.pricingModels?.[0]?.price || 0));
  const [budgetMax, setBudgetMax] = useState(String(service.pricingModels?.[0]?.price || 0));
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredTime, setDesiredTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOwnService = Boolean(user?.id && String(user.id) === String(service.provider?.id || ''));

  const submit = async () => {
    if (!user) return;
    if (isOwnService) {
      showNotification('You cannot request a quote from your own service.');
      return;
    }
    if (!brief.trim()) {
      showNotification('Please describe the project scope.');
      return;
    }
    setIsSubmitting(true);
    try {
      await providerWorkspaceService.createQuoteRequest(service, {
        brief,
        budgetMin: Number(budgetMin || 0),
        budgetMax: Number(budgetMax || budgetMin || 0),
        desiredDate,
        desiredTime
      }, user);
      showNotification('Quote request sent.');
      onClose();
    } catch (error) {
      console.error(error);
      showNotification('Unable to send quote request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border border-border bg-surface p-6 shadow-soft"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Request Quote</p>
            <h2 className="mt-1 text-2xl font-black text-text-primary">{service.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">Send scope, budget, and timing. The provider will answer in the shared inbox and proposals workflow.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-border bg-surface-soft p-2 text-text-secondary">&times;</button>
        </div>

        <div className="mt-5 grid gap-4">
          {isOwnService ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
              This is your own service. Open the provider hub to manage it instead of requesting a quote.
            </div>
          ) : null}
          <label className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Project brief</span>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Budget min</span>
              <input type="number" min={0} value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Budget max</span>
              <input type="number" min={0} value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Target date</span>
              <input type="date" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-text-primary">Preferred time</span>
              <input type="time" value={desiredTime} onChange={(event) => setDesiredTime(event.target.value)} className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary">
            Cancel
          </button>
          <button onClick={() => void submit()} disabled={isSubmitting || isOwnService} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSubmitting ? <span className="inline-flex items-center gap-2"><Spinner size="sm" /> Sending</span> : 'Send quote request'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ServiceQuoteRequestModal;
