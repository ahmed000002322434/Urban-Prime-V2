import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import profileOnboardingService from '../../services/profileOnboardingService';
import messagePreferencesService, { type WhatsAppPreferenceSnapshot } from '../../services/messagePreferencesService';
import { useAuth } from '../../hooks/useAuth';

const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ title, description, checked, onChange, disabled = false }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-gray-700 dark:bg-dark-surface/80">
    <div>
      <h3 className="text-sm font-semibold text-light-text dark:text-dark-text">{title}</h3>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>
    </div>
    <label className={`relative inline-flex h-6 w-11 cursor-pointer items-center ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary dark:bg-slate-600" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
    </label>
  </div>
);

const NotificationsSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    notificationSettings,
    updateNotificationSettings,
    desktopPermission,
    requestDesktopPermission,
    showMessageBanner
  } = useNotification();
  const [presenceVisible, setPresenceVisible] = useState(true);
  const [whatsAppPreferences, setWhatsAppPreferences] = useState<WhatsAppPreferenceSnapshot>({
    authentication: false,
    security: false,
    utility: false,
    marketing: false
  });
  const [whatsAppMaskedPhone, setWhatsAppMaskedPhone] = useState('');
  const [whatsAppConfigured, setWhatsAppConfigured] = useState(false);
  const [whatsAppSaving, setWhatsAppSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadPresencePreference = async () => {
      try {
        const unified = await profileOnboardingService.getProfileMe();
        if (cancelled) return;
        const value = unified?.profile?.preferences?.chatPresenceVisible;
        if (typeof value === 'boolean') {
          setPresenceVisible(value);
        }
      } catch {
        // leave default
      }
    };
    if (user) {
      void loadPresencePreference();
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadWhatsAppPreferences = async () => {
      if (!user) return;
      try {
        const response = await messagePreferencesService.getWhatsAppPreferences();
        if (cancelled) return;
        setWhatsAppPreferences(response.preferences);
        setWhatsAppMaskedPhone(response.maskedPhone || '');
        setWhatsAppConfigured(response.configured === true || response.dryRun === true);
      } catch {
        if (!cancelled) {
          setWhatsAppConfigured(false);
        }
      }
    };
    void loadWhatsAppPreferences();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePresenceVisibility = async (value: boolean) => {
    setPresenceVisible(value);
    try {
      await profileOnboardingService.patchProfileMe({
        preferences: {
          chatPresenceVisible: value
        }
      });
    } catch {
      // keep local toggle even if backend sync fails
    }
  };

  const desktopSupported = desktopPermission !== 'unsupported';

  const updateWhatsAppPreference = async (category: keyof WhatsAppPreferenceSnapshot, value: boolean) => {
    const previous = whatsAppPreferences;
    const next = { ...previous, [category]: value };
    setWhatsAppPreferences(next);
    setWhatsAppSaving(true);
    try {
      const response = await messagePreferencesService.updateWhatsAppPreferences({ [category]: value });
      setWhatsAppPreferences(response.preferences);
      setWhatsAppMaskedPhone(response.maskedPhone || '');
      setWhatsAppConfigured(response.configured === true || response.dryRun === true);
    } catch (error) {
      setWhatsAppPreferences(previous);
      showMessageBanner({
        title: 'WhatsApp settings not saved',
        message: error instanceof Error ? error.message : 'Unable to update WhatsApp notifications.',
        tone: 'error'
      });
    } finally {
      setWhatsAppSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-700 dark:bg-dark-surface">
      <div className="mb-6 flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-light-text dark:text-dark-text">Notifications</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Chat push banners are enabled by default. You can change these controls any time.
          </p>
        </div>
        <Link
          to="/profile/notifications"
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          Open notification inbox
        </Link>
      </div>

      <div className="space-y-4">
        <ToggleRow
          title="In-app chat banners"
          description="Show floating message banners with quick actions when you are outside the chat page."
          checked={notificationSettings.chatBannersEnabled}
          onChange={(value) => updateNotificationSettings({ chatBannersEnabled: value })}
        />

        <ToggleRow
          title="Quick actions on banners"
          description="Enable Reply, Mark read, and React directly from the banner."
          checked={notificationSettings.quickActionsEnabled}
          onChange={(value) => updateNotificationSettings({ quickActionsEnabled: value })}
          disabled={!notificationSettings.chatBannersEnabled}
        />

        <ToggleRow
          title="Notification sound"
          description="Play a short sound when a new chat message banner appears."
          checked={notificationSettings.soundEnabled}
          onChange={(value) => updateNotificationSettings({ soundEnabled: value })}
          disabled={!notificationSettings.chatBannersEnabled}
        />

        <ToggleRow
          title="Desktop notifications"
          description="Show browser notifications when tab is not active."
          checked={notificationSettings.desktopNotificationsEnabled}
          onChange={(value) => updateNotificationSettings({ desktopNotificationsEnabled: value })}
          disabled={!desktopSupported}
        />

        <ToggleRow
          title="Show online / last seen"
          description="Allow others to see your online and last-seen status in chat."
          checked={presenceVisible}
          onChange={(value) => {
            void updatePresenceVisibility(value);
          }}
        />

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/70 dark:bg-emerald-950/30">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">WhatsApp Business alerts</h3>
            <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">
              Send Urban Prime OTPs, security notices, marketplace updates, and opted-in offers on WhatsApp
              {whatsAppMaskedPhone ? ` to ${whatsAppMaskedPhone}` : ' after you add a phone number'}.
            </p>
            {!whatsAppConfigured && (
              <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                WhatsApp Business is not configured on the backend yet. These preferences will save, but messages need Meta credentials before delivery.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <ToggleRow
              title="Authentication PINs"
              description="Receive sign-in and sign-up PINs on WhatsApp."
              checked={whatsAppPreferences.authentication}
              onChange={(value) => void updateWhatsAppPreference('authentication', value)}
              disabled={whatsAppSaving}
            />
            <ToggleRow
              title="Security alerts"
              description="Receive login alerts and account protection notices."
              checked={whatsAppPreferences.security}
              onChange={(value) => void updateWhatsAppPreference('security', value)}
              disabled={whatsAppSaving}
            />
            <ToggleRow
              title="Marketplace updates"
              description="Receive offers, seller updates, verification updates, and rental reminders."
              checked={whatsAppPreferences.utility}
              onChange={(value) => void updateWhatsAppPreference('utility', value)}
              disabled={whatsAppSaving}
            />
            <ToggleRow
              title="Offers and discounts"
              description="Opt in to marketing messages for discounts, feed alerts, and promotions."
              checked={whatsAppPreferences.marketing}
              onChange={(value) => void updateWhatsAppPreference('marketing', value)}
              disabled={whatsAppSaving}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {desktopSupported ? (
          <button
            type="button"
            onClick={() => {
              void requestDesktopPermission();
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Desktop permission: {desktopPermission}
          </button>
        ) : (
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Desktop notifications are not supported in this browser.
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            showMessageBanner({
              title: 'Preview message',
              message: 'This is how your chat banner will appear.',
              tone: 'message',
              actions: notificationSettings.quickActionsEnabled
                ? [
                    { id: 'preview-reply', label: 'Reply', variant: 'primary', onClick: () => {} },
                    { id: 'preview-read', label: 'Mark read', onClick: () => {} },
                    { id: 'preview-react', label: 'React +1', onClick: () => {} }
                  ]
                : []
            });
          }}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Preview banner
        </button>
      </div>
    </div>
  );
};

export default NotificationsSettingsPage;
