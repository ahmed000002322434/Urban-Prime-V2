import React, { useEffect, useState } from 'react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc = '/icons/urbanprime.svg',
  alt = '',
  onError,
  ...rest
}) => {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc || '');
  const [isVisible, setIsVisible] = useState(Boolean(src || fallbackSrc));

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc || '');
    setIsVisible(Boolean(src || fallbackSrc));
  }, [fallbackSrc, src]);

  if (!isVisible) return null;

  return (
    <img
      {...rest}
      alt={alt}
      src={currentSrc}
      onError={(event) => {
        onError?.(event);
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        setIsVisible(false);
      }}
    />
  );
};

export default SafeImage;
