import type { PixeHeaderLink } from './PixeTopHeader';

export const pixeLibraryHeaderLink: PixeHeaderLink = {
  type: 'menu',
  label: 'Library',
  match: ['/pixe/saved', '/pixe/activity'],
  items: [
    { to: '/pixe/saved', label: 'Saved Pixe' },
    { to: '/pixe/activity', label: 'Activity' }
  ]
};
