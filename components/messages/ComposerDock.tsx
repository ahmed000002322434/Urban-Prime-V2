import React, { useEffect, useRef, useState } from 'react';
import EmojiPicker from './EmojiPicker';
import { AttachmentIcon, CloseIcon, EmojiIcon, ImageIcon, MicIcon, OfferIcon, PlusIcon, SendIcon, TrashIcon, VoiceWaveIcon } from './MessageIcons';

interface ComposerDockProps {
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  imageToSend: string | null;
  onRemoveImage: () => void;
  sendError: string | null;
  typingLabel: string | null;
  replyPreview: { senderLabel: string; text: string } | null;
  editPreview: { text: string } | null;
  isRecordingVoice: boolean;
  recordingLabel: string;
  isSendingVoice: boolean;
  isActionsOpen: boolean;
  onToggleActions: () => void;
  onCloseActions: () => void;
  onOpenOffer: () => void;
  onTriggerImageUpload: () => void;
  onToggleVoiceRecording: () => void;
  onCancelVoiceRecording: () => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onOpenDetails: () => void;
}

const ActionButtons: React.FC<{
  onOpenOffer: () => void;
  onTriggerImageUpload: () => void;
  onToggleVoiceRecording: () => void;
  onOpenDetails: () => void;
  isRecordingVoice: boolean;
  isSendingVoice: boolean;
}> = ({
  onOpenOffer,
  onTriggerImageUpload,
  onToggleVoiceRecording,
  onOpenDetails,
  isRecordingVoice,
  isSendingVoice
}) => (
  <div className="grid gap-2">
    <button type="button" onClick={onOpenOffer} className="messages-action-button">
      <OfferIcon />
      <span>Create offer</span>
    </button>
    <button type="button" onClick={onTriggerImageUpload} className="messages-action-button">
      <AttachmentIcon />
      <span>Attach image</span>
    </button>
    <button
      type="button"
      disabled={isSendingVoice}
      onClick={onToggleVoiceRecording}
      className="messages-action-button disabled:cursor-not-allowed disabled:opacity-50"
    >
      <MicIcon />
      <span>{isRecordingVoice ? 'Stop voice note' : 'Record voice note'}</span>
    </button>
    <button type="button" onClick={onOpenDetails} className="messages-action-button">
      <ImageIcon />
      <span>Conversation details</span>
    </button>
  </div>
);

const ComposerDock: React.FC<ComposerDockProps> = ({
  newMessage,
  onMessageChange,
  onSubmit,
  imageToSend,
  onRemoveImage,
  sendError,
  typingLabel,
  replyPreview,
  editPreview,
  isRecordingVoice,
  recordingLabel,
  isSendingVoice,
  isActionsOpen,
  onToggleActions,
  onCloseActions,
  onOpenOffer,
  onTriggerImageUpload,
  onToggleVoiceRecording,
  onCancelVoiceRecording,
  onCancelReply,
  onCancelEdit,
  onOpenDetails
}) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActionsOpen) setIsEmojiPickerOpen(false);
  }, [isActionsOpen]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 144);
    textarea.style.height = `${nextHeight}px`;
  }, [newMessage]);

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? newMessage.length;
    const selectionEnd = textarea?.selectionEnd ?? newMessage.length;
    const nextValue = `${newMessage.slice(0, selectionStart)}${emoji}${newMessage.slice(selectionEnd)}`;
    onMessageChange(nextValue);
    setIsEmojiPickerOpen(false);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      const caretPosition = selectionStart + emoji.length;
      textarea?.setSelectionRange(caretPosition, caretPosition);
    });
  };

  return (
    <footer className="messages-composer-shell relative">
      {typingLabel ? (
        <div className="messages-typing-pill">
          <span className="messages-typing-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>{typingLabel}</span>
        </div>
      ) : null}

      {replyPreview ? (
        <div className="messages-composer-context mb-3">
          <div className="min-w-0 flex-1">
            <p className="messages-composer-context-label">Replying to {replyPreview.senderLabel}</p>
            <p className="messages-composer-context-copy">{replyPreview.text}</p>
          </div>
          <button type="button" onClick={onCancelReply} className="messages-icon-button h-9 w-9 rounded-xl text-text-secondary" aria-label="Cancel reply">
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {editPreview ? (
        <div className="messages-composer-context is-editing mb-3">
          <div className="min-w-0 flex-1">
            <p className="messages-composer-context-label">Editing message</p>
            <p className="messages-composer-context-copy">{editPreview.text}</p>
          </div>
          <button type="button" onClick={onCancelEdit} className="messages-icon-button h-9 w-9 rounded-xl text-text-secondary" aria-label="Cancel edit">
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {imageToSend ? (
        <div className="messages-image-preview-card mb-3 flex items-center gap-3 p-2.5">
          <img src={imageToSend} alt="preview" className="h-14 w-14 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">Image attached</p>
            <p className="text-xs text-text-secondary">Ready to send with your next message.</p>
          </div>
          <button type="button" onClick={onRemoveImage} className="messages-icon-button h-9 w-9 rounded-xl text-text-secondary">
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {isRecordingVoice ? (
        <div className="messages-recorder-dock mb-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="messages-recorder-live">
              <MicIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="messages-recorder-wave" aria-hidden="true">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span key={`recorder-wave-${index}`} style={{ animationDelay: `${index * 70}ms` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-text-primary">{recordingLabel}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  <VoiceWaveIcon />
                  Live
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancelVoiceRecording} className="messages-call-button is-secondary px-3 py-2">
              <TrashIcon />
              <span>Discard</span>
            </button>
            <button
              type="button"
              onClick={onToggleVoiceRecording}
              disabled={isSendingVoice}
              className="messages-call-button is-primary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendIcon />
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : null}

      {sendError ? (
        <div className="mb-3 rounded-[1.1rem] border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {sendError}
        </div>
      ) : null}

      <div className="relative">
        {isActionsOpen ? (
          <>
            <button type="button" className="messages-mobile-overlay sm:hidden" onClick={onCloseActions} />
            <div className="messages-actions-sheet sm:hidden">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-text-primary">More actions</p>
                <button type="button" onClick={onCloseActions} className="messages-icon-button h-9 w-9 rounded-xl">
                  <CloseIcon />
                </button>
              </div>
              <ActionButtons
                onOpenOffer={() => { onOpenOffer(); onCloseActions(); }}
                onTriggerImageUpload={() => { onTriggerImageUpload(); onCloseActions(); }}
                onToggleVoiceRecording={() => { onToggleVoiceRecording(); onCloseActions(); }}
                onOpenDetails={() => { onOpenDetails(); onCloseActions(); }}
                isRecordingVoice={isRecordingVoice}
                isSendingVoice={isSendingVoice}
              />
            </div>
            <div className="messages-actions-sheet absolute bottom-full left-0 z-30 mb-3 hidden w-72 sm:block">
              <ActionButtons
                onOpenOffer={() => { onOpenOffer(); onCloseActions(); }}
                onTriggerImageUpload={() => { onTriggerImageUpload(); onCloseActions(); }}
                onToggleVoiceRecording={() => { onToggleVoiceRecording(); onCloseActions(); }}
                onOpenDetails={() => { onOpenDetails(); onCloseActions(); }}
                isRecordingVoice={isRecordingVoice}
                isSendingVoice={isSendingVoice}
              />
            </div>
          </>
        ) : null}

        <EmojiPicker isOpen={isEmojiPickerOpen} onClose={() => setIsEmojiPickerOpen(false)} onSelect={handleEmojiSelect} />

        <form ref={formRef} onSubmit={onSubmit} className="messages-composer-bar">
          <button
            type="button"
            onClick={() => {
              setIsEmojiPickerOpen((current) => !current);
              onCloseActions();
            }}
            className={`messages-icon-button h-10 w-10 rounded-full ${isEmojiPickerOpen ? 'is-active' : ''}`}
            title="Open emoji picker"
          >
            <EmojiIcon />
          </button>

          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(event) => onMessageChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              rows={1}
              placeholder={editPreview ? 'Update your message' : 'Write a message'}
              className="messages-composer-input"
            />
          </div>

          <button type="button" onClick={onTriggerImageUpload} className="messages-icon-button h-10 w-10 rounded-full" title="Attach image">
            <AttachmentIcon />
          </button>
          <button
            type="button"
            onClick={onToggleVoiceRecording}
            disabled={isSendingVoice}
            className={`messages-icon-button h-10 w-10 rounded-full ${isRecordingVoice ? 'is-active text-red-500' : ''}`}
            title={isRecordingVoice ? 'Stop voice note and send' : 'Record voice note'}
          >
            <MicIcon />
          </button>
          <button type="button" onClick={onToggleActions} className={`messages-icon-button hidden h-10 w-10 rounded-full sm:inline-flex ${isActionsOpen ? 'is-active' : ''}`} title="More actions">
            <PlusIcon />
          </button>
          <button
            type="submit"
            disabled={(!newMessage.trim() && !imageToSend) || isSendingVoice}
            className="messages-send-button"
            title={editPreview ? 'Save message' : 'Send message'}
          >
            <SendIcon />
          </button>
        </form>
        <button type="button" onClick={onToggleActions} className={`messages-icon-button mt-2 h-9 w-9 rounded-full sm:hidden ${isActionsOpen ? 'is-active' : ''}`} title="More actions">
          <PlusIcon />
        </button>
      </div>
    </footer>
  );
};

export default ComposerDock;
