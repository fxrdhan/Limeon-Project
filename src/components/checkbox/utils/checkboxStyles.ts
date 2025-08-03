import classNames from 'classnames';

export const getContainerStyles = (disabled: boolean, className?: string) => {
  return classNames(
    'inline-flex items-center group focus:outline-hidden',
    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
    className
  );
};
