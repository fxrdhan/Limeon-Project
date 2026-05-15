const listOptionTransition = {
  layout: {
    type: 'spring' as const,
    stiffness: 520,
    damping: 38,
    mass: 0.7,
  },
  opacity: {
    duration: 0.1,
  },
  y: {
    duration: 0.1,
    ease: 'easeOut' as const,
  },
};

export const getComboboxOptionMotionFrameProps = ({
  shouldAnimate,
  shouldTrackLayout = shouldAnimate,
}: {
  shouldAnimate: boolean;
  shouldTrackLayout?: boolean;
}) => ({
  animate: { opacity: 1, y: 0 },
  'data-pharma-combobox-option-frame': shouldAnimate ? '' : undefined,
  'data-pharma-combobox-option-layout': shouldTrackLayout ? '' : undefined,
  initial: shouldAnimate ? { opacity: 0, y: 6 } : false,
  layout: shouldTrackLayout ? ('position' as const) : false,
  transition: listOptionTransition,
});
