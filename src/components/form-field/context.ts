import { createContext, useContext } from 'react';

export interface FormFieldContextValue {
  controlId: string;
  label: string;
  labelId: string;
  required: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export const FormFieldProvider = FormFieldContext.Provider;

export const useFormFieldContext = () => useContext(FormFieldContext);
