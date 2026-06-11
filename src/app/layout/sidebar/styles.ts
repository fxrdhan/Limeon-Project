export const menuButtonStyle = {
  outline: 'none',
  border: 'none',
  borderLeft: '4px solid transparent',
} as const;

export const submenuLinkColors = {
  active: 'oklch(50.8% 0.118 165.612)',
  inactive: 'oklch(55.1% 0.027 264.364)',
} as const;

export const getMenuButtonClassName = ({
  isActive,
  isHighlighted,
}: {
  isActive: boolean;
  isHighlighted: boolean;
}) =>
  `relative flex h-10 w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl py-6 pl-2 pr-4 text-left transition-all duration-150 group focus-visible:outline-hidden outline-hidden border-0 focus:outline-hidden active:outline-hidden ${
    isActive || isHighlighted
      ? 'font-medium text-primary'
      : 'text-slate-600 hover:text-primary'
  }`;
