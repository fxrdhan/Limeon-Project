import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ItemFormData } from '../../../shared/types';

interface UseItemCodeGenerationProps {
  isEditMode: boolean;
  itemId?: string;
  formData: ItemFormData;
  updateFormData: (data: Partial<ItemFormData>) => void;
}

interface EdgeFunctionResponse {
  success: boolean;
  data?: {
    code: string;
    prefix: string;
    sequence: number;
  };
  error?: string;
}

/**
 * Calls edge function to generate item code
 */
const generateItemCodeViaEdgeFunction = async (
  type_id: string,
  unit_id: string,
  category_id: string,
  exclude_item_id?: string
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke(
    'generate-item-code',
    {
      body: {
        type_id,
        unit_id,
        category_id,
        exclude_item_id,
      },
    }
  );

  if (error) {
    throw new Error(`Edge function error: ${error.message}`);
  }

  const response = data as EdgeFunctionResponse;

  if (!response.success) {
    throw new Error(response.error || 'Failed to generate item code');
  }

  return response.data!.code;
};

/**
 * Hook for managing item code generation
 */
export const useItemCodeGeneration = ({
  isEditMode,
  itemId,
  formData,
  updateFormData,
}: UseItemCodeGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Code generation is handled manually or during save/submit process

  /**
   * Manually regenerates item code with user feedback
   */
  const regenerateItemCode = async (): Promise<void> => {
    if (!formData.type_id || !formData.category_id || !formData.unit_id) {
      alert('Silakan pilih jenis, kategori, dan satuan terlebih dahulu');
      return;
    }

    setIsGenerating(true);

    try {
      const generatedCode = await generateItemCodeViaEdgeFunction(
        formData.type_id,
        formData.unit_id,
        formData.category_id,
        isEditMode && itemId ? itemId : undefined
      );

      updateFormData({ code: generatedCode });
      alert(`Kode item berhasil diperbarui: ${generatedCode}`);
    } catch (error) {
      console.error('Error regenerating item code:', error);

      // Provide specific error messages
      if (error instanceof Error) {
        if (
          error.message?.includes('network') ||
          error.message?.includes('fetch')
        ) {
          alert('Gagal memperbarui kode item: Masalah koneksi internet');
        } else if (
          error.message?.includes('permission') ||
          error.message?.includes('unauthorized')
        ) {
          alert('Gagal memperbarui kode item: Tidak memiliki izin akses');
        } else {
          alert(
            `Gagal memperbarui kode item: ${error.message || 'Terjadi kesalahan tak terduga'}`
          );
        }
      } else {
        alert('Gagal memperbarui kode item: Terjadi kesalahan tak terduga');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Checks if code generation is available
   */
  const canGenerateCode = (): boolean => {
    return Boolean(
      formData.type_id && formData.category_id && formData.unit_id
    );
  };

  return {
    isGenerating,
    regenerateItemCode,
    canGenerateCode,
  };
};
