import React, { useState } from 'react';
import type { CustomOffer } from '../../types';
import { CloseIcon, OfferIcon } from './MessageIcons';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (offer: Omit<CustomOffer, 'id' | 'status'>) => void;
}

const CreateOfferModal: React.FC<CreateOfferModalProps> = ({ isOpen, onClose, onSend }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('1');

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSend({
      title,
      description,
      price: Number(price),
      duration: Number(duration)
    });
    setTitle('');
    setDescription('');
    setPrice('');
    setDuration('1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-surface p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><OfferIcon /></span>
            <div>
              <p className="text-lg font-black text-text-primary">Create custom offer</p>
              <p className="text-sm text-text-secondary">Package the terms directly in this chat.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="messages-icon-button h-10 w-10 rounded-2xl">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Offer title" className="messages-passphrase-input" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={4} placeholder="Describe what is included" className="messages-passphrase-input resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={price} onChange={(event) => setPrice(event.target.value)} required placeholder="Total price" className="messages-passphrase-input" />
            <input type="number" value={duration} onChange={(event) => setDuration(event.target.value)} required placeholder="Duration (days)" className="messages-passphrase-input" />
          </div>
          <button type="submit" className="messages-primary-button w-full justify-center">
            Send offer
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateOfferModal;
