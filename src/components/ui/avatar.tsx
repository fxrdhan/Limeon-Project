import * as React from 'react';
import { cn } from '@/lib/utils';

const Avatar = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    className={cn(
      'relative flex shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
);

const AvatarImage = ({
  className,
  alt = '',
  ...props
}: React.ComponentProps<'img'>) => (
  <img
    className={cn('size-full object-cover', className)}
    alt={alt}
    draggable={false}
    {...props}
  />
);

const AvatarFallback = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    className={cn(
      'flex size-full items-center justify-center font-medium',
      className
    )}
    {...props}
  />
);

export { Avatar, AvatarFallback, AvatarImage };
