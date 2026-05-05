import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';
import SpotlightProfileCardModal from '../../components/spotlight/SpotlightProfileCardModal';
import { useAuth } from '../../hooks/useAuth';

const panelClass =
  'rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),rgba(255,255,255,0)_35%),linear-gradient(180deg,rgba(18,18,22,0.98),rgba(7,8,10,0.96))] shadow-[0_26px_56px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[24px]';

const SpotlightProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username?: string }>();
  const { user } = useAuth();
  const lookupKey = username || (user ? 'me' : '');

  if (!lookupKey) {
    return (
      <SpotlightNoirBlankSurface>
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <section className={`${panelClass} p-8 text-center`}>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/34">Spotlight profile</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white">Open a creator profile by handle.</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/56">
              Public profile routes still work at `/profile/:username`, and your own Spotlight profile unlocks after sign in.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/spotlight" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
                Back to feed
              </Link>
              <Link to="/auth" className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/74">
                Sign in
              </Link>
            </div>
          </section>
        </div>
      </SpotlightNoirBlankSurface>
    );
  }

  return (
    <>
      <SpotlightNoirBlankSurface>
        <div className="mx-auto w-full max-w-5xl py-12" />
      </SpotlightNoirBlankSurface>
      <SpotlightProfileCardModal
        open
        username={lookupKey}
        onClose={() => navigate('/spotlight')}
        onOpenItem={(item) => navigate(`/spotlight/post/${item.id}`)}
        onOpenMessage={(creator) => navigate(`/spotlight/messages?sellerId=${encodeURIComponent(creator.firebase_uid || creator.id)}`)}
        onBlocked={() => navigate('/spotlight')}
      />
    </>
  );
};

export default SpotlightProfilePage;
