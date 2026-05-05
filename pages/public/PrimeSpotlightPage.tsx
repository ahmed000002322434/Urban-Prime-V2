import React from 'react';
import SpotlightHomeFeed from '../../components/spotlight/SpotlightHomeFeed';
import SpotlightNoirBlankSurface from '../../components/spotlight/SpotlightNoirBlankSurface';

const PrimeSpotlightPage: React.FC = () => (
  <SpotlightNoirBlankSurface>
    <SpotlightHomeFeed />
  </SpotlightNoirBlankSurface>
);

export default PrimeSpotlightPage;
