export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getInitialsColor = (userId: string) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-slate-500',
  ];

  const index = userId
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};
