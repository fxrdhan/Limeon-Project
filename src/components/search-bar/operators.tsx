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
    icon: <LuSearch className="w-4 h-4" />,
    activeColor: 'text-green-500',
  },
  {
    value: 'notContains',
    label: 'Not Contains',
    description: 'Kolom tidak mengandung teks yang dicari',
    icon: <LuSearch className="w-4 h-4" />,
    activeColor: 'text-red-500',
  },
  {
    value: 'equals',
    label: 'Equals',
    description: 'Kolom sama persis dengan teks yang dicari',
    icon: <LuCheck className="w-4 h-4" />,
    activeColor: 'text-blue-500',
  },
  {
    value: 'notEqual',
    label: 'Not Equal',
    description: 'Kolom tidak sama dengan teks yang dicari',
    icon: <LuX className="w-4 h-4" />,
    activeColor: 'text-orange-500',
  },
  {
    value: 'startsWith',
    label: 'Starts With',
    description: 'Kolom dimulai dengan teks yang dicari',
    icon: <LuChevronRight className="w-4 h-4" />,
    activeColor: 'text-purple-500',
  },
  {
    value: 'endsWith',
    label: 'Ends With',
    description: 'Kolom diakhiri dengan teks yang dicari',
    icon: <LuChevronLeft className="w-4 h-4" />,
    activeColor: 'text-indigo-500',
  },
] as const;

export const NUMBER_FILTER_OPERATORS = [
  {
    value: 'equals',
    label: 'Equals',
    description: 'Kolom sama persis dengan angka yang dicari',
    icon: <LuEqual className="w-4 h-4" />,
    activeColor: 'text-blue-500',
  },
  {
    value: 'notEqual',
    label: 'Not Equal',
    description: 'Kolom tidak sama dengan angka yang dicari',
    icon: <LuX className="w-4 h-4" />,
    activeColor: 'text-orange-500',
  },
  {
    value: 'greaterThan',
    label: 'Greater Than',
    description: 'Kolom lebih besar dari angka yang dicari',
    icon: <LuChevronRight className="w-4 h-4" />,
    activeColor: 'text-green-500',
  },
  {
    value: 'greaterThanOrEqual',
    label: 'Greater Than or Equal',
    description: 'Kolom lebih besar atau sama dengan angka yang dicari',
    icon: <span className="font-bold text-sm">≥</span>,
    activeColor: 'text-green-600',
  },
  {
    value: 'lessThan',
    label: 'Less Than',
    description: 'Kolom lebih kecil dari angka yang dicari',
    icon: <LuChevronLeft className="w-4 h-4" />,
    activeColor: 'text-red-500',
  },
  {
    value: 'lessThanOrEqual',
    label: 'Less Than or Equal',
    description: 'Kolom lebih kecil atau sama dengan angka yang dicari',
    icon: <span className="font-bold text-sm">≤</span>,
    activeColor: 'text-red-600',
  },
  {
    value: 'inRange',
    label: 'In Range',
    description: 'Kolom berada dalam rentang angka tertentu',
    icon: <LuMinus className="w-4 h-4" />,
    activeColor: 'text-purple-500',
  },
] as const;

export const JOIN_OPERATORS = [
  {
    value: 'and',
    label: 'AND',
    description: 'Semua kondisi harus terpenuhi',
    icon: <span className="text-sm font-bold">∧</span>,
    activeColor: 'text-blue-600',
  },
  {
    value: 'or',
    label: 'OR',
    description: 'Salah satu kondisi harus terpenuhi',
    icon: <span className="text-sm font-bold">∨</span>,
    activeColor: 'text-purple-600',
  },
] as const;

export type FilterOperator =
  | (typeof DEFAULT_FILTER_OPERATORS)[number]
  | (typeof NUMBER_FILTER_OPERATORS)[number];
export type JoinOperator = (typeof JOIN_OPERATORS)[number];
