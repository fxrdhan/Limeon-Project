import {
  LuSearch,
  LuCheck,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuEqual,
  LuMinus,
} from 'react-icons/lu';
import {
  TEXT_OPERATOR_LABELS,
  NUMBER_OPERATOR_LABELS,
  JOIN_OPERATOR_LABELS,
} from './operatorConstants';

export const DEFAULT_FILTER_OPERATORS = [
  {
    value: 'contains',
    label: TEXT_OPERATOR_LABELS.contains,
    description: 'Kolom mengandung teks yang dicari',
    icon: <LuSearch className="w-4 h-4" />,
    activeColor: 'text-green-500',
  },
  {
    value: 'notContains',
    label: TEXT_OPERATOR_LABELS.notContains,
    description: 'Kolom tidak mengandung teks yang dicari',
    icon: <LuSearch className="w-4 h-4" />,
    activeColor: 'text-red-500',
  },
  {
    value: 'equals',
    label: TEXT_OPERATOR_LABELS.equals,
    description: 'Kolom sama persis dengan teks yang dicari',
    icon: <LuCheck className="w-4 h-4" />,
    activeColor: 'text-blue-500',
  },
  {
    value: 'notEqual',
    label: TEXT_OPERATOR_LABELS.notEqual,
    description: 'Kolom tidak sama dengan teks yang dicari',
    icon: <LuX className="w-4 h-4" />,
    activeColor: 'text-orange-500',
  },
  {
    value: 'startsWith',
    label: TEXT_OPERATOR_LABELS.startsWith,
    description: 'Kolom dimulai dengan teks yang dicari',
    icon: <LuChevronRight className="w-4 h-4" />,
    activeColor: 'text-purple-500',
  },
  {
    value: 'endsWith',
    label: TEXT_OPERATOR_LABELS.endsWith,
    description: 'Kolom diakhiri dengan teks yang dicari',
    icon: <LuChevronLeft className="w-4 h-4" />,
    activeColor: 'text-indigo-500',
  },
] as const;

export const NUMBER_FILTER_OPERATORS = [
  {
    value: 'equals',
    label: NUMBER_OPERATOR_LABELS.equals,
    description: 'Kolom sama persis dengan angka yang dicari',
    icon: <LuEqual className="w-4 h-4" />,
    activeColor: 'text-blue-500',
  },
  {
    value: 'notEqual',
    label: NUMBER_OPERATOR_LABELS.notEqual,
    description: 'Kolom tidak sama dengan angka yang dicari',
    icon: <LuX className="w-4 h-4" />,
    activeColor: 'text-orange-500',
  },
  {
    value: 'greaterThan',
    label: NUMBER_OPERATOR_LABELS.greaterThan,
    description: 'Kolom lebih besar dari angka yang dicari',
    icon: <LuChevronRight className="w-4 h-4" />,
    activeColor: 'text-green-500',
  },
  {
    value: 'greaterThanOrEqual',
    label: NUMBER_OPERATOR_LABELS.greaterThanOrEqual,
    description: 'Kolom lebih besar atau sama dengan angka yang dicari',
    icon: <span className="font-bold text-sm">≥</span>,
    activeColor: 'text-green-600',
  },
  {
    value: 'lessThan',
    label: NUMBER_OPERATOR_LABELS.lessThan,
    description: 'Kolom lebih kecil dari angka yang dicari',
    icon: <LuChevronLeft className="w-4 h-4" />,
    activeColor: 'text-red-500',
  },
  {
    value: 'lessThanOrEqual',
    label: NUMBER_OPERATOR_LABELS.lessThanOrEqual,
    description: 'Kolom lebih kecil atau sama dengan angka yang dicari',
    icon: <span className="font-bold text-sm">≤</span>,
    activeColor: 'text-red-600',
  },
  {
    value: 'inRange',
    label: NUMBER_OPERATOR_LABELS.inRange,
    description: 'Kolom berada dalam rentang angka tertentu',
    icon: <LuMinus className="w-4 h-4" />,
    activeColor: 'text-purple-500',
  },
] as const;

export const JOIN_OPERATORS = [
  {
    value: 'and',
    label: JOIN_OPERATOR_LABELS.and,
    description: 'Semua kondisi harus terpenuhi',
    icon: <span className="text-sm font-bold">∧</span>,
    activeColor: 'text-blue-600',
  },
  {
    value: 'or',
    label: JOIN_OPERATOR_LABELS.or,
    description: 'Salah satu kondisi harus terpenuhi',
    icon: <span className="text-sm font-bold">∨</span>,
    activeColor: 'text-purple-600',
  },
] as const;

export type FilterOperator =
  | (typeof DEFAULT_FILTER_OPERATORS)[number]
  | (typeof NUMBER_FILTER_OPERATORS)[number];
export type JoinOperator = (typeof JOIN_OPERATORS)[number];
