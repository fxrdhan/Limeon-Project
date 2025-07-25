import { useState } from "react";
import { FaRedo } from "react-icons/fa";
import Input from "@/components/input";
import FormField from "@/components/form-field";

interface ItemCodeFieldProps {
  code: string;
  onRegenerate: () => void;
}

export default function ItemCodeField({ code, onRegenerate }: ItemCodeFieldProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <FormField label="Kode Item" className="md:col-span-1">
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Input
          name="code"
          value={code}
          readOnly={true}
          className={`w-full transition-all duration-200 ${isHovered ? "blur-sm" : ""}`}
        />
        {isHovered && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-1 cursor-pointer"
            onClick={onRegenerate}
            title="Regenerate kode item dari digit terendah"
          >
            <FaRedo size={16} className="text-blue-500" />
            <span className="text-sm text-blue-600 font-medium">
              Regenerate
            </span>
          </div>
        )}
      </div>
    </FormField>
  );
}