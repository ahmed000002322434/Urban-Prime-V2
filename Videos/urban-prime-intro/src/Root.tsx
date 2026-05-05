import React from 'react';
import { Composition } from 'remotion';
import { UrbanPrimeFeatureIntro } from './UrbanPrimeFeatureIntro';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="UrbanPrimeFeatureIntro"
    component={UrbanPrimeFeatureIntro}
    durationInFrames={600}
    fps={30}
    width={1080}
    height={1920}
  />
);
