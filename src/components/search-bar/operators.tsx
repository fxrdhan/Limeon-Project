import {
  TbContainer,
  TbContainerOff,
  TbEqual,
  TbEqualNot,
  TbMathEqualGreater,
  TbMathEqualLower,
  TbMathGreater,
  TbMathLower,
  TbMinus,
} from 'react-icons/tb';
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
    icon: <TbContainer className="w-4 h-4" />,
    activeColor: 'text-green-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'notContains',
    label: TEXT_OPERATOR_LABELS.notContains,
    description: 'Kolom tidak mengandung teks yang dicari',
    icon: <TbContainerOff className="w-4 h-4" />,
    activeColor: 'text-red-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'equals',
    label: TEXT_OPERATOR_LABELS.equals,
    description: 'Kolom sama persis dengan teks yang dicari',
    icon: <TbEqual className="w-3 h-3" />,
    activeColor: 'text-blue-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'notEqual',
    label: TEXT_OPERATOR_LABELS.notEqual,
    description: 'Kolom tidak sama dengan teks yang dicari',
    icon: <TbEqualNot className="w-3 h-3" />,
    activeColor: 'text-orange-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'startsWith',
    label: TEXT_OPERATOR_LABELS.startsWith,
    description: 'Kolom dimulai dengan teks yang dicari',
    icon: <TbMathGreater className="w-3 h-3" />,
    activeColor: 'text-purple-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'endsWith',
    label: TEXT_OPERATOR_LABELS.endsWith,
    description: 'Kolom diakhiri dengan teks yang dicari',
    icon: <TbMathLower className="w-3 h-3" />,
    activeColor: 'text-indigo-500',
    numberOfInputs: 1 as const,
  },
] as const;

export const NUMBER_FILTER_OPERATORS = [
  {
    value: 'equals',
    label: NUMBER_OPERATOR_LABELS.equals,
    description: 'Kolom sama persis dengan angka yang dicari',
    icon: <TbEqual className="w-3 h-3" />,
    activeColor: 'text-blue-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'notEqual',
    label: NUMBER_OPERATOR_LABELS.notEqual,
    description: 'Kolom tidak sama dengan angka yang dicari',
    icon: <TbEqualNot className="w-3 h-3" />,
    activeColor: 'text-orange-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'greaterThan',
    label: NUMBER_OPERATOR_LABELS.greaterThan,
    description: 'Kolom lebih besar dari angka yang dicari',
    icon: <TbMathGreater className="w-3 h-3" />,
    activeColor: 'text-green-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'greaterThanOrEqual',
    label: NUMBER_OPERATOR_LABELS.greaterThanOrEqual,
    description: 'Kolom lebih besar atau sama dengan angka yang dicari',
    icon: <TbMathEqualGreater className="w-3 h-3" />,
    activeColor: 'text-green-600',
    numberOfInputs: 1 as const,
  },
  {
    value: 'lessThan',
    label: NUMBER_OPERATOR_LABELS.lessThan,
    description: 'Kolom lebih kecil dari angka yang dicari',
    icon: <TbMathLower className="w-3 h-3" />,
    activeColor: 'text-red-500',
    numberOfInputs: 1 as const,
  },
  {
    value: 'lessThanOrEqual',
    label: NUMBER_OPERATOR_LABELS.lessThanOrEqual,
    description: 'Kolom lebih kecil atau sama dengan angka yang dicari',
    icon: <TbMathEqualLower className="w-3 h-3" />,
    activeColor: 'text-red-600',
    numberOfInputs: 1 as const,
  },
  {
    value: 'inRange',
    label: NUMBER_OPERATOR_LABELS.inRange,
    description: 'Kolom berada dalam rentang angka tertentu',
    icon: <TbMinus className="w-4 h-4" />,
    activeColor: 'text-purple-500',
    numberOfInputs: 2 as const, // Between operator needs 2 values
  },
] as const;

export const JOIN_OPERATORS = [
  {
    value: 'and',
    label: JOIN_OPERATOR_LABELS.and,
    description: 'Semua kondisi harus terpenuhi',
    icon: <TbMathGreater className="w-3 h-3 -rotate-90" />,
    activeColor: 'text-blue-600',
  },
  {
    value: 'or',
    label: JOIN_OPERATOR_LABELS.or,
    description: 'Salah satu kondisi harus terpenuhi',
    icon: <TbMathGreater className="w-3 h-3 rotate-90" />,
    activeColor: 'text-purple-600',
  },
] as const;

export type FilterOperator =
  | (typeof DEFAULT_FILTER_OPERATORS)[number]
  | (typeof NUMBER_FILTER_OPERATORS)[number];
export type JoinOperator = (typeof JOIN_OPERATORS)[number];
