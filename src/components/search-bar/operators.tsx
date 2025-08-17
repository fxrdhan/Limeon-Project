import {
  LuSearch,
  LuCheck,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuEqual,
  LuMinus,
} from 'react-icons/lu';

export const DEFAULT_FILTER_OPERATORS = [
  {
    value: 'contains',
    label: 'Contains',
    description: 'Kolom mengandung teks yang dicari',
    icon: <LuSearch className="w-3 h-3 text-green-500" />,
  },
  {
    value: 'notContains',
    label: 'Not Contains',
    description: 'Kolom tidak mengandung teks yang dicari',
    icon: <LuSearch className="w-3 h-3 text-red-500" />,
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'Kolom sama persis dengan teks yang dicari',
    icon: <LuCheck className="w-3 h-3 text-blue-500" />,
  },
  {
    value: 'notEqual',
    label: 'Not Equal',
    description: 'Kolom tidak sama dengan teks yang dicari',
    icon: <LuX className="w-3 h-3 text-orange-500" />,
  },
  {
    value: 'startsWith',
    label: 'Starts With',
    description: 'Kolom dimulai dengan teks yang dicari',
    icon: <LuChevronRight className="w-3 h-3 text-purple-500" />,
  },
  {
    value: 'endsWith',
    label: 'Ends With',
    description: 'Kolom diakhiri dengan teks yang dicari',
    icon: <LuChevronLeft className="w-3 h-3 text-indigo-500" />,
  },
] as const;

export const NUMBER_FILTER_OPERATORS = [
  {
    value: 'equals',
    label: 'Equals',
    description: 'Kolom sama persis dengan angka yang dicari',
    icon: <LuEqual className="w-3 h-3 text-blue-500" />,
  },
  {
    value: 'notEqual',
    label: 'Not Equal',
    description: 'Kolom tidak sama dengan angka yang dicari',
    icon: <LuX className="w-3 h-3 text-orange-500" />,
  },
  {
    value: 'greaterThan',
    label: 'Greater Than',
    description: 'Kolom lebih besar dari angka yang dicari',
    icon: <LuChevronRight className="w-3 h-3 text-green-500" />,
  },
  {
    value: 'greaterThanOrEqual',
    label: 'Greater Than or Equal',
    description: 'Kolom lebih besar atau sama dengan angka yang dicari',
    icon: <span className="text-green-600 font-bold text-xs">≥</span>,
  },
  {
    value: 'lessThan',
    label: 'Less Than',
    description: 'Kolom lebih kecil dari angka yang dicari',
    icon: <LuChevronLeft className="w-3 h-3 text-red-500" />,
  },
  {
    value: 'lessThanOrEqual',
    label: 'Less Than or Equal',
    description: 'Kolom lebih kecil atau sama dengan angka yang dicari',
    icon: <span className="text-red-600 font-bold text-xs">≤</span>,
  },
  {
    value: 'inRange',
    label: 'In Range',
    description: 'Kolom berada dalam rentang angka tertentu',
    icon: <LuMinus className="w-3 h-3 text-purple-500" />,
  },
] as const;
