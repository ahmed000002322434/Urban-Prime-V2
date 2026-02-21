import React from 'react';

const AUTH_BACKGROUND_VIDEO_SRC = '/videos/auth-background.webm';

const AuthVideoBackdrop: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <video
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={AUTH_BACKGROUND_VIDEO_SRC} type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/15 via-transparent to-black/35" />
    </div>
  );
};

export default AuthVideoBackdrop;
