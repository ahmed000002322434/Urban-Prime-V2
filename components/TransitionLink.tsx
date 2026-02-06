
import React from 'react';
import { Link, useNavigate, type LinkProps } from 'react-router-dom';

type TransitionLinkProps = LinkProps & {
  transitionName: string;
};

// Type guard to check if the browser supports view transitions
const isViewTransitionApiSupported = () => 'startViewTransition' in document;

const TransitionLink: React.FC<TransitionLinkProps> = ({ children, to, transitionName, ...props }) => {
  const navigate = useNavigate();

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // If the browser doesn't support the API, let the link work normally
    if (!isViewTransitionApiSupported()) {
      return;
    }

    event.preventDefault();
    document.documentElement.style.setProperty('--item-image-transition-name', transitionName);

    (document as any).startViewTransition(() => {
      navigate(to);
    });
  };

  return (
    <Link to={to} {...props} onClick={handleLinkClick}>
      {children}
    </Link>
  );
};

export default TransitionLink;