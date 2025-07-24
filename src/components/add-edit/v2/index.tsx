// Re-export the new page component for backward compatibility
import ItemManagementPage from "@/pages/ItemManagementPage";
import type { AddItemPortalProps } from "@/types";

// Simple re-export wrapper for backward compatibility
// The actual implementation has been moved to src/pages/ItemManagementPage.tsx
// following proper atomic design principles
const AddItemPortal: React.FC<AddItemPortalProps> = (props) => {
  return <ItemManagementPage {...props} />;
};

export default AddItemPortal;