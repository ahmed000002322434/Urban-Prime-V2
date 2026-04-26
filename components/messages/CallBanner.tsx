import React from 'react';
import { PhoneIcon, PhoneOffIcon, VideoIcon } from './MessageIcons';

interface CallBannerProps {
  mode: 'voice' | 'video';
  state: 'incoming' | 'outgoing' | 'active';
  participantName: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onSilent?: () => void;
  onCancel?: () => void;
  onHangup?: () => void;
}

const CallBanner: React.FC<CallBannerProps> = ({
  mode,
  state,
  participantName,
  onAccept,
  onDecline,
  onSilent,
  onCancel,
  onHangup
}) => {
  const isVideo = mode === 'video';
  const modeLabel = isVideo ? 'Video' : 'Voice';

  const config = {
    incoming: {
      badge: 'Incoming call',
      title: `${participantName} is calling`,
      subtitle: `${modeLabel} call request waiting for your response.`
    },
    outgoing: {
      badge: 'Calling',
      title: `Calling ${participantName}`,
      subtitle: `${modeLabel} call invite sent. Waiting for them to answer.`
    },
    active: {
      badge: 'Live now',
      title: `${modeLabel} call in progress`,
      subtitle: `You are connected with ${participantName}.`
    }
  }[state];

  return (
    <div className={`messages-call-banner is-${state}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="messages-call-orb">
          {isVideo ? <VideoIcon /> : <PhoneIcon />}
        </div>
        <div className="min-w-0">
          <div className="messages-call-badge">{config.badge}</div>
          <p className="messages-call-title">{config.title}</p>
          <p className="messages-call-subtitle">{config.subtitle}</p>
        </div>
      </div>

      <div className="messages-call-actions">
        {state === 'incoming' ? (
          <>
            <button type="button" onClick={onDecline} className="messages-call-button is-danger">
              <PhoneOffIcon />
              <span>Decline</span>
            </button>
            <button type="button" onClick={onSilent} className="messages-call-button is-secondary">
              <span>Silent</span>
            </button>
            <button type="button" onClick={onAccept} className="messages-call-button is-primary">
              {isVideo ? <VideoIcon /> : <PhoneIcon />}
              <span>Answer</span>
            </button>
          </>
        ) : null}
        {state === 'outgoing' ? (
          <button type="button" onClick={onCancel} className="messages-call-button is-danger">
            <PhoneOffIcon />
            <span>Cancel</span>
          </button>
        ) : null}
        {state === 'active' ? (
          <button type="button" onClick={onHangup} className="messages-call-button is-danger">
            <PhoneOffIcon />
            <span>Hang up</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default CallBanner;
