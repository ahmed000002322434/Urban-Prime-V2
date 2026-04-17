import React from 'react';
import { useHeroStyle } from '../../context/HeroStyleContext';
import CinematicHero from './CinematicHero';

const HeroSwitcher = ({ OldHero }) => {
  const { heroStyle } = useHeroStyle();

  return heroStyle === 'card' ? <OldHero /> : <CinematicHero />;
};

export default HeroSwitcher;
