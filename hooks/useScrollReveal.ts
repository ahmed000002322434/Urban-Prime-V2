
import { useEffect, useRef } from 'react';

export const useScrollReveal = <T extends HTMLElement>() => {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add('is-visible');
            // Once visible, we don't need to observe it anymore
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return elementRef;
};
