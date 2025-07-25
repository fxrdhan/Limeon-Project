import React from "react";
import EntityModalHeader from "../ui/EntityModalHeader";
import EntityFormFields from "../ui/EntityFormFields";
import EntityModalFooter from "../ui/EntityModalFooter";

interface EntityModalContentProps {
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

const EntityModalContent: React.FC<EntityModalContentProps> = ({ nameInputRef }) => {
  return (
    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
      <EntityModalHeader />
      <EntityFormFields nameInputRef={nameInputRef} />
      <EntityModalFooter />
    </div>
  );
};

export default EntityModalContent;