import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/itemService';
import {
  defaultPixeStudioPreferences,
  loadPixeStudioPreferences,
  savePixeStudioPreferences,
  type PixeStudioModerationMode,
  type PixeStudioPreferences,
  type PixeStudioPrefetchMode
} from '../../../utils/pixeStudioPreferences';

const sectionClassName = 'pixe-noir-panel rounded-[30px] p-5 sm:p-6';
const inputClassName = 'pixe-noir-input h-11 rounded-2xl px-4 text-sm outline-none focus:border-white/20';

const ToggleCard: React.FC<{
  title: string;
  body: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ title, body, checked, onChange }) => (
  <label className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-2 text-xs leading-5 text-white/48">{body}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </div>
  </label>
);

const PixeStudioSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PixeStudioPreferences>(() => loadPixeStudioPreferences());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(loadPixeStudioPreferences()),
    [settings]
  );

  return (
    <div className="space-y-6">
      <section className="pixe-noir-panel rounded-[32px] p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_340px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Settings</p>
            <h2 className="mt-2 text-3xl font-semibold">Studio Defaults</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
              These defaults shape the upload form, moderation posture, and alert behavior across Pixe Studio.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Upload profile</p>
              <p className="mt-2 text-2xl font-semibold">{settings.defaultVisibility}</p>
              <p className="mt-2 text-xs leading-5 text-white/48">The upload page reads this as the default post visibility.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Delivery mode</p>
              <p className="mt-2 text-2xl font-semibold">{settings.prefetchMode}</p>
              <p className="mt-2 text-xs leading-5 text-white/48">Tune how aggressively the feed prepares the next video.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/25 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/42">Last save</p>
              <p className="mt-2 text-lg font-semibold">{savedAt ? new Date(savedAt).toLocaleTimeString() : 'Local defaults active'}</p>
              <p className="mt-2 text-xs leading-5 text-white/48">These settings are stored locally and used immediately by Studio.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <section className={sectionClassName}>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Upload defaults</p>
              <h3 className="mt-2 text-xl font-semibold">Post creation</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Default visibility</span>
                <select
                  value={settings.defaultVisibility}
                  onChange={(event) => setSettings((current) => ({ ...current, defaultVisibility: event.target.value as PixeStudioPreferences['defaultVisibility'] }))}
                  className={inputClassName}
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-semibold text-white">Feed prefetch</span>
                <select
                  value={settings.prefetchMode}
                  onChange={(event) => setSettings((current) => ({ ...current, prefetchMode: event.target.value as PixeStudioPrefetchMode }))}
                  className={inputClassName}
                >
                  <option value="lean">Lean</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ToggleCard
                title="Default comments on"
                body="New uploads start with comments enabled unless you override them."
                checked={settings.defaultAllowComments}
                onChange={(value) => setSettings((current) => ({ ...current, defaultAllowComments: value }))}
              />
              <ToggleCard
                title="Auto-caption preference"
                body="Surface auto-caption guidance by default in the upload workflow."
                checked={settings.autoCaptionPreference}
                onChange={(value) => setSettings((current) => ({ ...current, autoCaptionPreference: value }))}
              />
              <ToggleCard
                title="Duplicate clip check"
                body="Flag repeated uploads before publish so the feed stays cleaner."
                checked={settings.duplicateClipCheck}
                onChange={(value) => setSettings((current) => ({ ...current, duplicateClipCheck: value }))}
              />
              <ToggleCard
                title="Low-data review"
                body="Keep the mobile preview conservative so upload review reflects a lean feed profile."
                checked={settings.lowDataReview}
                onChange={(value) => setSettings((current) => ({ ...current, lowDataReview: value }))}
              />
            </div>
          </section>

          <section className={sectionClassName}>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Moderation and fraud</p>
              <h3 className="mt-2 text-xl font-semibold">Safety posture</h3>
            </div>

            <label className="space-y-2">
              <span className="block text-sm font-semibold text-white">Default moderation mode</span>
              <select
                value={settings.moderationMode}
                onChange={(event) => setSettings((current) => ({ ...current, moderationMode: event.target.value as PixeStudioModerationMode }))}
                className={inputClassName}
              >
                <option value="open">Open</option>
                <option value="hold-risky">Hold risky</option>
                <option value="followers-first">Followers first</option>
              </select>
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ToggleCard
                title="Processing alerts"
                body="Notify when long-running uploads become ready or fail processing."
                checked={settings.processingAlerts}
                onChange={(value) => setSettings((current) => ({ ...current, processingAlerts: value }))}
              />
              <ToggleCard
                title="Fraud alerts"
                body="Keep the studio warning cards active when suspicious traffic or replayed milestones show up."
                checked={settings.fraudAlerts}
                onChange={(value) => setSettings((current) => ({ ...current, fraudAlerts: value }))}
              />
              <ToggleCard
                title="Analytics digest"
                body="Keep daily retention and growth summary reminders enabled."
                checked={settings.analyticsDigest}
                onChange={(value) => setSettings((current) => ({ ...current, analyticsDigest: value }))}
              />
              <ToggleCard
                title="Product disclosure reminder"
                body="Prompt for tagged product disclosure when a clip contains commerce links."
                checked={settings.productDisclosureReminder}
                onChange={(value) => setSettings((current) => ({ ...current, productDisclosureReminder: value }))}
              />
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className={sectionClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Connected behavior</p>
            <div className="mt-4 space-y-3">
              {[
                ['Upload page', 'Uses visibility, comments, and creator guidance defaults immediately.'],
                ['Feed delivery', 'Prefetch mode informs how aggressively the next video should be prepared.'],
                ['Moderation posture', 'Fraud and moderation defaults keep the studio tuned toward suspicious activity.']
              ].map(([label, body]) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-white/48">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={sectionClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">Reset and save</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setSettings(defaultPixeStudioPreferences);
                  setSavedAt(null);
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/82"
              >
                Reset to defaults
              </button>
              <button
                type="button"
                onClick={() => {
                  savePixeStudioPreferences(settings);
                  setSavedAt(new Date().toISOString());
                }}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
              >
                Save settings
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/48">
              {hasChanges ? 'You have unsaved changes in the local studio defaults.' : 'Studio defaults are in sync with the saved local configuration.'}
            </p>
          </section>

          <section className={`${sectionClassName} border border-rose-500/22 bg-rose-500/[0.04]`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200/78">Account</p>
            <h3 className="mt-2 text-xl font-semibold">Delete account</h3>
            <p className="mt-3 text-sm leading-6 text-white/58">
              Enter your password to permanently remove this account and release its public Pixe handle.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => {
                  setDeleteError('');
                  setDeletePassword(event.target.value);
                }}
                placeholder="Current password"
                className={inputClassName}
              />
              {deleteError ? <p className="text-xs font-semibold text-rose-200">{deleteError}</p> : null}
              <button
                type="button"
                disabled={deletePending || !deletePassword.trim()}
                onClick={async () => {
                  try {
                    setDeletePending(true);
                    setDeleteError('');
                    await authService.deleteCurrentAccount(deletePassword);
                    navigate('/', { replace: true });
                  } catch (error: any) {
                    console.error('Unable to delete account:', error);
                    setDeleteError(error?.message || 'Unable to delete this account right now.');
                  } finally {
                    setDeletePending(false);
                  }
                }}
                className="rounded-full bg-rose-100 px-4 py-2.5 text-sm font-semibold text-rose-950 disabled:opacity-50"
              >
                {deletePending ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PixeStudioSettingsPage;
