import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type FeatureScene = {
  start: number;
  end: number;
  kicker: string;
  title: string;
  body: string;
  chips: string[];
  accent: string;
  secondary: string;
};

const scenes: FeatureScene[] = [
  {
    start: 54,
    end: 126,
    kicker: 'COMMERCE CORE',
    title: 'Buyables. Rentables. Auctions.',
    body: 'A premium marketplace for products, rentals, drops, deals, and category discovery.',
    chips: ['Browse', 'Compare', 'Checkout'],
    accent: '#00e5ff',
    secondary: '#ff4ecd',
  },
  {
    start: 126,
    end: 198,
    kicker: 'BRAND ENGINE',
    title: 'Stores and brands get their own world.',
    body: 'Flagship storefronts, brand catalogs, seller directories, and public discovery in one flow.',
    chips: ['Stores', 'Brands', 'Seller tools'],
    accent: '#ffe45e',
    secondary: '#00e676',
  },
  {
    start: 198,
    end: 270,
    kicker: 'PIXE VIDEO',
    title: 'Short video meets shopping.',
    body: 'Pixe feed, explore, watch pages, creators, studio upload, comments, analytics, and channels.',
    chips: ['Feed', 'Creators', 'Studio'],
    accent: '#ff4ecd',
    secondary: '#00e5ff',
  },
  {
    start: 270,
    end: 342,
    kicker: 'SERVICES MARKETPLACE',
    title: 'Book trusted providers.',
    body: 'Service profiles, job requests, ratings, secure escrow, and admin-vetted quality.',
    chips: ['Book', 'Escrow', 'Review'],
    accent: '#00e676',
    secondary: '#ffe45e',
  },
  {
    start: 342,
    end: 414,
    kicker: 'OPERATIONS',
    title: 'Ship, create, and manage at scale.',
    body: 'Shipper queues, POD studio, dashboards, listings, analytics, and admin oversight.',
    chips: ['Shipping', 'POD', 'Analytics'],
    accent: '#ff7a1a',
    secondary: '#7c5cff',
  },
];

const font = 'Inter, Arial, Helvetica, sans-serif';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const range = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing: (input: number) => number = Easing.out(Easing.cubic),
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

const sceneOpacity = (frame: number, start: number, end: number) => {
  const fadeIn = range(frame, [start, start + 14], [0, 1]);
  const fadeOut = range(frame, [end - 16, end], [1, 0], Easing.in(Easing.cubic));
  return Math.min(fadeIn, fadeOut);
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = frame * 0.42;
  const gridShift = frame * 1.2;
  const rotate = frame * 0.18;

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 28% 18%, rgba(0,229,255,0.20), transparent 28%), radial-gradient(circle at 76% 42%, rgba(255,78,205,0.18), transparent 26%), radial-gradient(circle at 36% 84%, rgba(255,228,94,0.18), transparent 26%), #050507',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -140,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          transform: `translate3d(${-gridShift % 72}px, ${gridShift % 72}px, 0) rotate(-6deg)`,
          opacity: 0.54,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1320,
          height: 1320,
          left: -250,
          top: 96,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.14)',
          transform: `rotate(${rotate}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 860,
          height: 860,
          right: -250,
          bottom: 200,
          borderRadius: '50%',
          background:
            'conic-gradient(from 140deg, rgba(0,229,255,0.0), rgba(0,229,255,0.44), rgba(255,78,205,0.0), rgba(255,228,94,0.32), rgba(0,229,255,0.0))',
          filter: 'blur(6px)',
          opacity: 0.38,
          transform: `rotate(${-rotate * 1.7}deg) translateY(${Math.sin(frame / 42) * 28}px)`,
        }}
      />
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: 1080,
            height: 22,
            left: -60,
            top: 250 + index * 390 + Math.sin((frame + index * 22) / 32) * 26,
            background:
              index % 2 === 0
                ? 'linear-gradient(90deg, transparent, rgba(0,229,255,0.24), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,78,205,0.22), transparent)',
            transform: `translateX(${Math.sin((drift + index * 30) / 28) * 90}px) rotate(-16deg)`,
            opacity: 0.75,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const TopHud: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = clamp(frame / 600);

  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: 64,
        right: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: font,
        color: '#f7f7f2',
        zIndex: 20,
      }}
    >
      <div style={{ fontSize: 23, fontWeight: 900, letterSpacing: 0 }}>URBAN PRIME</div>
      <div
        style={{
          width: 312,
          height: 8,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.16)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00e5ff, #ff4ecd, #ffe45e)',
          }}
        />
      </div>
    </div>
  );
};

const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 15, mass: 0.7 } });
  const opacity = sceneOpacity(frame, 0, 70);
  const titleY = range(frame, [0, 24], [94, 0]);
  const scale = range(frame, [0, 34], [0.9, 1]);
  const slash = range(frame, [12, 40], [-920, 0]);

  return (
    <AbsoluteFill style={{ opacity, fontFamily: font, color: '#fff', zIndex: 10 }}>
      <div
        style={{
          position: 'absolute',
          top: 330,
          left: 64,
          right: 64,
          transform: `translateY(${titleY}px) scale(${scale})`,
          transformOrigin: 'left center',
        }}
      >
        <div
          style={{
            fontSize: 46,
            fontWeight: 900,
            color: '#00e5ff',
            marginBottom: 22,
            textTransform: 'uppercase',
          }}
        >
          Feature Intro
        </div>
        <div
          style={{
            fontSize: 150,
            lineHeight: 0.9,
            fontWeight: 950,
            letterSpacing: 0,
            maxWidth: 950,
          }}
        >
          ONE SOCIAL MARKETPLACE
        </div>
        <div
          style={{
            marginTop: 44,
            width: 710 * pop,
            height: 16,
            background: 'linear-gradient(90deg, #00e5ff, #ff4ecd, #ffe45e)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          width: 1080,
          height: 250,
          left: slash,
          top: 1020,
          transform: 'rotate(-13deg)',
          background: 'rgba(255,255,255,0.92)',
          mixBlendMode: 'difference',
        }}
      />
    </AbsoluteFill>
  );
};

const FeaturePanel: React.FC<{ scene: FeatureScene; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const local = frame - scene.start;
  const opacity = sceneOpacity(frame, scene.start, scene.end);
  const x = range(frame, [scene.start, scene.start + 18], [180, 0]);
  const cardY = range(frame, [scene.start + 12, scene.start + 30], [120, 0]);
  const bar = range(frame, [scene.start + 14, scene.start + 34], [0, 1]);
  const wordScale = range(frame, [scene.start, scene.start + 24], [0.86, 1]);
  const exitX = range(frame, [scene.end - 18, scene.end], [0, -150], Easing.in(Easing.cubic));

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateX(${x + exitX}px)`,
        fontFamily: font,
        color: '#f7f7f2',
        zIndex: 12,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 250,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: scene.accent,
            color: '#050507',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 950,
            fontSize: 28,
          }}
        >
          {index + 1}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: scene.accent }}>{scene.kicker}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 390,
          transform: `scale(${wordScale})`,
          transformOrigin: 'left center',
        }}
      >
        <div
          style={{
            fontSize: scene.title.length > 31 ? 94 : 112,
            lineHeight: 0.96,
            fontWeight: 950,
            letterSpacing: 0,
            maxWidth: 940,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            marginTop: 34,
            height: 12,
            width: 850 * bar,
            background: `linear-gradient(90deg, ${scene.accent}, ${scene.secondary})`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 885,
          transform: `translateY(${cardY}px)`,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 22,
        }}
      >
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(5,5,7,0.72)',
            backdropFilter: 'blur(14px)',
            borderRadius: 8,
            padding: '42px 44px',
            boxShadow: `0 0 80px ${scene.accent}22`,
          }}
        >
          <div style={{ fontSize: 39, lineHeight: 1.28, fontWeight: 780, color: '#ffffff' }}>{scene.body}</div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {scene.chips.map((chip, chipIndex) => {
            const chipIn = range(frame, [scene.start + 22 + chipIndex * 5, scene.start + 36 + chipIndex * 5], [40, 0]);
            return (
              <div
                key={chip}
                style={{
                  transform: `translateY(${chipIn}px)`,
                  padding: '18px 24px',
                  borderRadius: 999,
                  background: chipIndex === 0 ? scene.accent : 'rgba(255,255,255,0.10)',
                  color: chipIndex === 0 ? '#050507' : '#f7f7f2',
                  fontWeight: 900,
                  fontSize: 28,
                }}
              >
                {chip}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          width: 430,
          height: 430,
          right: -90,
          bottom: 90,
          borderRadius: 8,
          border: `3px solid ${scene.accent}`,
          transform: `rotate(${local * 0.8 + index * 20}deg)`,
          opacity: 0.52,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 250,
          height: 250,
          right: 108,
          bottom: 272,
          borderRadius: '50%',
          border: `28px solid ${scene.secondary}`,
          opacity: 0.3,
          transform: `scale(${1 + Math.sin(local / 12) * 0.08})`,
        }}
      />
    </AbsoluteFill>
  );
};

const FeatureMatrix: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, 410, 534);
  const y = range(frame, [410, 432], [90, 0]);
  const labels = ['Marketplace', 'Stores', 'Brands', 'Pixe', 'Services', 'Shipping', 'POD', 'Analytics'];

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)`, fontFamily: font, color: '#fff', zIndex: 13 }}>
      <div style={{ position: 'absolute', left: 64, right: 64, top: 260 }}>
        <div style={{ fontSize: 38, color: '#00e5ff', fontWeight: 950 }}>CONNECTED PLATFORM</div>
        <div style={{ fontSize: 104, lineHeight: 0.96, fontWeight: 950, marginTop: 24 }}>Every feature feeds the next action.</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 735,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 18,
        }}
      >
        {labels.map((label, index) => {
          const delay = 430 + index * 6;
          const inY = range(frame, [delay, delay + 16], [70, 0]);
          const accent = ['#00e5ff', '#ff4ecd', '#ffe45e', '#00e676'][index % 4];
          return (
            <div
              key={label}
              style={{
                minHeight: 122,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.07)',
                transform: `translateY(${inY}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '0 28px',
              }}
            >
              <div style={{ width: 18, height: 74, background: accent, borderRadius: 999 }} />
              <span style={{ fontSize: 34, fontWeight: 900 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, 520, 600);
  const scale = range(frame, [520, 548], [0.82, 1]);
  const words = ['DISCOVER', 'SELL', 'CREATE', 'DELIVER'];

  return (
    <AbsoluteFill style={{ opacity, fontFamily: font, color: '#f7f7f2', zIndex: 15 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 44%, rgba(255,255,255,0.12), transparent 32%), linear-gradient(180deg, rgba(0,229,255,0.16), transparent 42%, rgba(255,78,205,0.16))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 365,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 128, lineHeight: 0.88, fontWeight: 950, letterSpacing: 0 }}>URBAN PRIME</div>
        <div style={{ margin: '42px auto 0', width: 560, height: 14, background: 'linear-gradient(90deg, #00e5ff, #ff4ecd, #ffe45e, #00e676)' }} />
        <div style={{ marginTop: 46, fontSize: 40, lineHeight: 1.2, fontWeight: 850 }}>One platform for commerce, creators, services, and operations.</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 220,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 18,
        }}
      >
        {words.map((word, index) => {
          const y = range(frame, [545 + index * 5, 565 + index * 5], [90, 0]);
          return (
            <div
              key={word}
              style={{
                transform: `translateY(${y}px)`,
                height: 102,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: index % 2 === 0 ? '#f7f7f2' : 'rgba(255,255,255,0.10)',
                color: index % 2 === 0 ? '#050507' : '#f7f7f2',
                fontSize: 32,
                fontWeight: 950,
              }}
            >
              {word}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Ticker: React.FC = () => {
  const frame = useCurrentFrame();
  const x = -((frame * 8) % 1120);
  const text = 'BUYABLES   RENTABLES   STORES   BRANDS   PIXE   SERVICES   SHIPPING   ANALYTICS   ';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 64,
        height: 52,
        overflow: 'hidden',
        fontFamily: font,
        fontSize: 28,
        fontWeight: 950,
        color: 'rgba(255,255,255,0.42)',
        whiteSpace: 'nowrap',
        zIndex: 30,
      }}
    >
      <div style={{ transform: `translateX(${x}px)` }}>{text.repeat(4)}</div>
    </div>
  );
};

export const UrbanPrimeFeatureIntro: React.FC = () => (
  <AbsoluteFill style={{ background: '#050507' }}>
    <Background />
    <TopHud />
    <Opening />
    {scenes.map((scene, index) => (
      <FeaturePanel key={scene.kicker} scene={scene} index={index} />
    ))}
    <FeatureMatrix />
    <Closing />
    <Ticker />
  </AbsoluteFill>
);
