import React from 'react';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';
import MessagesPage from '../protected/MessagesPage';

const SpotlightMessagesPage: React.FC = () => (
  <SpotlightNoirBlankSurface>
    <MessagesPage />
  </SpotlightNoirBlankSurface>
);

export default SpotlightMessagesPage;
