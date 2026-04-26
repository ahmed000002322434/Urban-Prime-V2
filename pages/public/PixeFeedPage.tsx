import React from 'react';
import type { PixeFeedMode } from '../../services/pixeService';
import PixeFeedExperience from '../../components/pixe/PixeFeedExperience';

const PixeFeedPage: React.FC<{ mode?: PixeFeedMode }> = ({ mode = 'for_you' }) => {
  return <PixeFeedExperience mode={mode} />;
};

export default PixeFeedPage;
