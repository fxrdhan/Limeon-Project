import { useState, useEffect } from "react";
import { 
  generateCompleteItemCode, 
  generateItemCodeForEdit 
} from "@/utils/itemCodeGeneration";
import type { Category, MedicineType, Unit, FormData } from "@/types";

interface UseItemCodeGenerationProps {
  isEditMode: boolean;
  itemId?: string;
  formData: FormData;
  initialFormData: FormData | null;
  categories: Category[];
  types: MedicineType[];
  units: Unit[];
  updateFormData: (data: Partial<FormData>) => void;
}

/**
 * Hook for managing item code generation
 */
export const useItemCodeGeneration = ({
  isEditMode,
  itemId,
  formData,
  initialFormData,
  categories,
  types,
  units,
  updateFormData,
}: UseItemCodeGenerationProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Auto-generates item code when dependencies change (for new items)
   */
  useEffect(() => {
    const generateItemCode = async () => {
      if (!formData.type_id || !formData.category_id || !formData.unit_id) {
        return;
      }

      try {
        const generatedCode = await generateCompleteItemCode(
          formData.type_id,
          formData.unit_id,
          formData.category_id,
          types,
          units,
          categories,
        );

        updateFormData({ code: generatedCode });
      } catch (error) {
        console.error("Error generating item code:", error);
      }
    };

    // Only auto-generate for new items
    if (
      !isEditMode &&
      formData.type_id &&
      formData.category_id &&
      formData.unit_id &&
      categories.length > 0 &&
      types.length > 0 &&
      units.length > 0
    ) {
      generateItemCode();
    }
  }, [
    isEditMode,
    formData.type_id,
    formData.category_id,
    formData.unit_id,
    categories,
    types,
    units,
    updateFormData,
  ]);

  /**
   * Manually regenerates item code with user feedback
   */
  const regenerateItemCode = async (): Promise<void> => {
    if (!formData.type_id || !formData.category_id || !formData.unit_id) {
      alert("Silakan pilih jenis, kategori, dan satuan terlebih dahulu");
      return;
    }

    setIsGenerating(true);

    try {
      if (isEditMode && itemId && initialFormData) {
        // Handle edit mode with smart preservation logic
        const result = await generateItemCodeForEdit(
          formData.type_id,
          formData.unit_id,
          formData.category_id,
          types,
          units,
          categories,
          initialFormData.code,
          formData.name,
          initialFormData.name,
          itemId,
        );

        updateFormData({ code: result.code });

        if (result.wasPreserved) {
          alert(`Kode item berhasil dipertahankan: ${result.code}`);
        } else {
          alert(`Kode item berhasil diperbarui: ${result.code}`);
        }
      } else {
        // Handle new item mode
        const generatedCode = await generateCompleteItemCode(
          formData.type_id,
          formData.unit_id,
          formData.category_id,
          types,
          units,
          categories,
        );

        updateFormData({ code: generatedCode });
        alert(`Kode item berhasil diperbarui: ${generatedCode}`);
      }
    } catch (error) {
      console.error("Error regenerating item code:", error);

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message?.includes("network")) {
          alert("Gagal memperbarui kode item: Masalah koneksi internet");
        } else if (error.message?.includes("permission")) {
          alert("Gagal memperbarui kode item: Tidak memiliki izin akses");
        } else {
          alert(`Gagal memperbarui kode item: ${error.message || "Terjadi kesalahan tak terduga"}`);
        }
      } else {
        alert("Gagal memperbarui kode item: Terjadi kesalahan tak terduga");
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
      formData.type_id &&
      formData.category_id &&
      formData.unit_id &&
      categories.length > 0 &&
      types.length > 0 &&
      units.length > 0
    );
  };

  return {
    isGenerating,
    regenerateItemCode,
    canGenerateCode,
  };
};