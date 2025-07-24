import React from "react";
import DetailModalHeader from "@/components/molecules/DetailModalHeader";
import DetailImageUploader from "@/components/molecules/DetailImageUploader";
import DetailFormField from "@/components/molecules/DetailFormField";
import DetailModalFooter from "@/components/molecules/DetailModalFooter";
import { useDetailModalContext } from "@/contexts/DetailModalContext";

const DetailModalContent: React.FC = () => {
  const { fields } = useDetailModalContext();

  return (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden relative mx-4 flex flex-col">
      <DetailModalHeader />
      
      <div className="p-6 overflow-y-auto grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <DetailImageUploader />
        
        <div className="space-y-4">
          {fields.map((field) => (
            <DetailFormField key={field.key} field={field} />
          ))}
        </div>
      </div>
      
      <DetailModalFooter />
    </div>
  );
};

export default DetailModalContent;