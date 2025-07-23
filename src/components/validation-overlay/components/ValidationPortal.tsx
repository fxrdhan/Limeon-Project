import { createPortal } from "react-dom";
import { ValidationPortalProps } from "../types";

const ValidationPortal: React.FC<ValidationPortalProps> = ({ children }) => {
  return createPortal(children, document.body);
};

export default ValidationPortal;