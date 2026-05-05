import React from 'react';
import type { PixeFeedMode } from '../../services/pixeService';
import PixeMixedFeedExperience from '../../components/pixe/PixeMixedFeedExperience';

const PixeFeedPage: React.FC<{ mode?: PixeFeedMode }> = ({ mode = 'for_you' }) => {
  return <PixeMixedFeedExperience mode={mode} />;
};

export default PixeFeedPage;
