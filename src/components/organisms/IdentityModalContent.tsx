import React from "react";
import IdentityModalHeader from "@/components/molecules/IdentityModalHeader";
import IdentityImageUploader from "@/components/molecules/IdentityImageUploader";
import IdentityFormField from "@/components/molecules/IdentityFormField";
import IdentityModalFooter from "@/components/molecules/IdentityModalFooter";
import { useIdentityModalContext } from "@/contexts/IdentityModalContext";

const IdentityModalContent: React.FC = () => {
  const { fields } = useIdentityModalContext();

  return (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden relative mx-4 flex flex-col">
      <IdentityModalHeader />

      <div className="p-6 overflow-y-auto grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <IdentityImageUploader />

        <div className="space-y-4">
          {fields.map((field) => (
            <IdentityFormField key={field.key} field={field} />
          ))}
        </div>
      </div>

      <IdentityModalFooter />
    </div>
  );
};

export default IdentityModalContent;
