import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import Spinner from '../../components/Spinner';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';

const accountTips = [
  'Google sign-in now opens the account chooser so you can pick another Gmail session directly.',
  'Your workspaces stay connected to the active login, so switch workplace and switch accounts are separate actions.',
  'If popup auth is blocked by the browser, use the manual sign-out option and sign back in from the auth page.'
];

const SwitchGoogleAccountPage: React.FC = () => {
  const { user, activePersona, personas, signInWithGoogle, switchUser } = useAuth();
  const [isGoogleSwitching, setIsGoogleSwitching] = useState(false);
  const [isManualSwitching, setIsManualSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeWorkspaceLabel = useMemo(
    () => activePersona?.displayName || activePersona?.type || 'Consumer workspace',
    [activePersona?.displayName, activePersona?.type]
  );
  const highlightCards = useMemo(
    () => [
      {
        title: 'Profile',
        description: 'Open your public profile page and review how the account looks to everyone else.',
        href: user?.id ? `/user/${user.id}` : '/profile/settings'
      },
      {
        title: 'Switch workplace',
        description: 'Move between seller, provider, affiliate, or consumer workspaces.',
        href: '/profile/switch-accounts'
      }
    ],
    [user?.id]
  );

  const connectedAccounts = useMemo(() => {
    const providerRows = auth.currentUser?.providerData || [];
    if (providerRows.length === 0) {
      return [
        {
          id: 'current-session',
          providerId: 'google.com',
          email: user?.email || 'Current session',
          displayName: user?.name || 'UrbanPrime account'
        }
      ];
    }

    return providerRows.map((entry, index) => ({
      id: `${entry.providerId}-${index}`,
      providerId: entry.providerId || 'google.com',
      email: entry.email || user?.email || 'Connected session',
      displayName: entry.displayName || user?.name || 'UrbanPrime account'
    }));
  }, [user?.email, user?.name]);

  const handleGoogleSwitch = async () => {
    setError(null);
    setSuccess(null);
    setIsGoogleSwitching(true);
    try {
      await signInWithGoogle();
      setSuccess('Google account chooser opened successfully. If you selected a different account, the dashboard session is now updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open the Google account chooser.');
    } finally {
      setIsGoogleSwitching(false);
    }
  };

  const handleManualSwitch = async () => {
    if (!user?.id) return;
    setError(null);
    setSuccess(null);
    setIsManualSwitching(true);
    try {
      await switchUser(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out for manual account switching.');
      setIsManualSwitching(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="overflow-hidden rounded-[2rem] border border-[#eadfef] bg-[linear-gradient(145deg,#fffdfc,#f7f0ff_50%,#fff3e6)] shadow-[0_24px_60px_rgba(116,94,162,0.14)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(27,24,39,0.98),rgba(34,28,48,0.98)_55%,rgba(50,36,29,0.96))] dark:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
        <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:px-8 lg:py-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <BackButton text="Back" className="rounded-full border border-[#dbcfe7] bg-white/75 px-3 py-1.5 text-sm text-[#5f5169] shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-[#ece5dc]" />
              <span className="rounded-full bg-[#f1e7ff] px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.28em] text-[#7b5ca6] dark:bg-[#31283f] dark:text-[#d9c2ff]">
                Google account changer
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-[#362a42] dark:text-[#f7efe5] sm:text-4xl">
              Switch accounts without losing your workplace setup.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#73667f] dark:text-[#b4acb8] sm:text-[0.95rem]">
              Your active Google login and your active workplace are now treated as separate controls. Use this page to pick another Google account, then return to the workplace switcher if you want a different seller or provider environment.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/80 bg-white/80 p-4 shadow-[0_16px_34px_rgba(132,110,180,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#8d7d98] dark:text-[#a9a0ad]">Current account</p>
                <p className="mt-2 truncate text-sm font-semibold text-[#3f3349] dark:text-[#f5edde]">{user?.email || 'No email available'}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/80 bg-white/80 p-4 shadow-[0_16px_34px_rgba(132,110,180,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#8d7d98] dark:text-[#a9a0ad]">Active workplace</p>
                <p className="mt-2 truncate text-sm font-semibold capitalize text-[#3f3349] dark:text-[#f5edde]">{activeWorkspaceLabel}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/80 bg-white/80 p-4 shadow-[0_16px_34px_rgba(132,110,180,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[#8d7d98] dark:text-[#a9a0ad]">Available workplaces</p>
                <p className="mt-2 text-sm font-semibold text-[#3f3349] dark:text-[#f5edde]">{personas.length} connected</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/80 bg-white/78 p-4 shadow-[0_18px_36px_rgba(132,110,180,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_16px_32px_rgba(0,0,0,0.18)]">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.22em] text-[#8d7d98] dark:text-[#a9a0ad]">Connected navigation</p>
            <div className="mt-3 space-y-3">
              {highlightCards.map((card) => (
                <Link
                  key={card.href}
                  to={card.href}
                  className="block rounded-[1.25rem] border border-[#eadff0] bg-[linear-gradient(145deg,#fff,#f8f2ff)] p-4 transition-all hover:-translate-y-0.5 hover:border-[#d8cae8] hover:shadow-[0_14px_28px_rgba(123,101,179,0.12)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(33,28,46,0.96),rgba(25,21,35,0.94))] dark:hover:border-white/14"
                >
                  <p className="text-sm font-semibold text-[#40354b] dark:text-[#f5edde]">{card.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#7c6f88] dark:text-[#aea5b2]">{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[1.8rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">Accounts board</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Add or switch connected accounts</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                This page is the dedicated account switcher. Use it to add another Google account, reopen the chooser for a different one, or fall back to a full sign-out when you want a clean auth reset.
              </p>
            </div>
            <span className="rounded-full bg-[#8f6ce1]/10 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#7b5ca6] dark:text-[#d9c2ff]">
              New page
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-[1.5rem] border border-border bg-surface-soft p-4 sm:p-5">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.2em] text-text-secondary">Connected accounts</p>
              <div className="mt-4 space-y-3">
                {connectedAccounts.map((account, index) => (
                  <div key={account.id} className="rounded-[1.2rem] border border-border bg-surface px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{account.displayName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">
                          {account.providerId === 'google.com' ? 'Google account' : account.providerId}
                        </p>
                        <p className="mt-2 text-sm text-text-secondary">{account.email}</p>
                      </div>
                      {index === 0 ? (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                          Active
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-surface-soft p-4 sm:p-5">
              <div className="rounded-[1.2rem] border border-border bg-surface px-4 py-4">
                <p className="text-base font-semibold text-text-primary">Add another account</p>
                <p className="mt-1 text-sm text-text-secondary">Open the Google chooser and attach a different Gmail session to the current browser flow.</p>
                <button
                  type="button"
                  onClick={handleGoogleSwitch}
                  disabled={isGoogleSwitching || isManualSwitching}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#8f6ce1,#cf9a69)] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_34px_rgba(123,101,179,0.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGoogleSwitching ? <Spinner size="sm" /> : 'Add Google account'}
                </button>
              </div>

              <div className="mt-4 rounded-[1.2rem] border border-border bg-surface px-4 py-4">
                <p className="text-base font-semibold text-text-primary">Switch active account</p>
                <p className="mt-1 text-sm text-text-secondary">Reopen the chooser and pick the Google identity you want to use for this dashboard session right now.</p>
                <button
                  type="button"
                  onClick={handleGoogleSwitch}
                  disabled={isGoogleSwitching || isManualSwitching}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[1rem] border border-border bg-surface-soft px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGoogleSwitching ? <Spinner size="sm" /> : 'Switch Google account'}
                </button>
              </div>

              <div className="mt-4 rounded-[1.2rem] border border-dashed border-border bg-surface px-4 py-4">
                <p className="text-sm font-semibold text-text-primary">Manual fallback</p>
                <p className="mt-1 text-sm text-text-secondary">Only use this if the popup chooser is blocked and you need a clean sign-out before choosing another login.</p>
                <button
                  type="button"
                  onClick={handleManualSwitch}
                  disabled={isGoogleSwitching || isManualSwitching}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[1rem] border border-border bg-surface-soft px-5 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isManualSwitching ? <Spinner size="sm" /> : 'Sign out and choose manually'}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-[1.2rem] border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-[1.2rem] border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
          ) : null}
        </section>

        <aside className="rounded-[1.8rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-text-secondary">How it works</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-text-primary">Account switching rules</h2>
          <div className="mt-5 space-y-3">
            {accountTips.map((tip) => (
              <div key={tip} className="rounded-[1.2rem] border border-border bg-surface-soft px-4 py-3 text-sm leading-6 text-text-secondary">
                {tip}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SwitchGoogleAccountPage;
