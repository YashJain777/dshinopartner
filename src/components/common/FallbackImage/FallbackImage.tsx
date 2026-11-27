import React, {useState, memo, useEffect} from 'react';
import {Image} from 'react-native';
import {FallbackImageProps} from './FallbackImage.types';

const DEFAULT_FALLBACK = require('../../../assets/images/profile_manager.png');

const FallbackImageComponent: React.FC<FallbackImageProps> = ({
  source,
  fallbackSource = DEFAULT_FALLBACK,
  style,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [source]);

  const isInvalidSource =
    !source ||
    (typeof source === 'object' && 'uri' in source && (!source.uri || typeof source.uri !== 'string'));

  if (hasError || isInvalidSource) {
    return <Image source={fallbackSource} style={style} {...props} />;
  }

  return (
    <Image
      source={source as any}
      style={style}
      onError={e => {
        setHasError(true);
        onError?.(e);
      }}
      {...props}
    />
  );
};

export const FallbackImage = memo(FallbackImageComponent);

export type {FallbackImageProps} from './FallbackImage.types';
