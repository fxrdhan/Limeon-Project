import { forwardRef } from "react";
import Dropdown from "@/components/dropdown";
import Checkbox from "@/components/checkbox";
import FormSection from "@/components/form-section";
import FormField from "@/components/form-field";
import { MinStockEditor } from "../ui";
import FefoTooltip from "../FefoTooltip";
import type { ItemSettingsFormProps } from "../../types";

const ItemSettingsForm = forwardRef<HTMLLabelElement, ItemSettingsFormProps>(
  ({
    formData,
    minStockEditing,
    onFieldChange,
    onStartEditMinStock,
    onStopEditMinStock,
    onMinStockChange,
    onMinStockKeyDown,
  }, ref) => {
    return (
      <FormSection title="Pengaturan Tambahan">
        <div className="grid grid-cols-1 gap-6">
          <FormField label="Status" required={true}>
            <Dropdown
              name="is_active"
              tabIndex={10}
              value={formData.is_active ? "true" : "false"}
              onChange={(value) => {
                onFieldChange("is_active", value === "true");
              }}
              options={[
                { id: "true", name: "Masih dijual" },
                { id: "false", name: "Tidak Dijual" },
              ]}
              withRadio
              searchList={false}
            />
          </FormField>

          <MinStockEditor
            isEditing={minStockEditing.isEditing}
            minStockValue={minStockEditing.value}
            currentMinStock={formData.min_stock}
            onStartEdit={onStartEditMinStock}
            onStopEdit={onStopEditMinStock}
            onChange={onMinStockChange}
            onKeyDown={onMinStockKeyDown}
          />

          <div
            className={
              formData.is_medicine
                ? ""
                : "opacity-50 pointer-events-none"
            }
          >
            <Checkbox
              id="has_expiry_date"
              tabIndex={12}
              ref={ref}
              label="Memiliki Tanggal Kadaluarsa"
              checked={formData.has_expiry_date}
              disabled={!formData.is_medicine}
              onChange={(isChecked) =>
                onFieldChange("has_expiry_date", isChecked)
              }
              className="py-1"
            />
            <div className="mt-1 text-sm text-gray-500 flex items-center">
              Akan digunakan metode FEFO
              <FefoTooltip />
            </div>
          </div>
        </div>
      </FormSection>
    );
  }
);

ItemSettingsForm.displayName = "ItemSettingsForm";

export default ItemSettingsForm;