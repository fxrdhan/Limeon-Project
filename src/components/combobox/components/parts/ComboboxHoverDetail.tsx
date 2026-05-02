import HoverDetailPortal from '../HoverDetailPortal';
import { useComboboxContext } from '../../hooks/useComboboxContext';

const ComboboxHoverDetail = () => {
  const { hoverDetail } = useComboboxContext();

  if (!hoverDetail.enabled) {
    return null;
  }

  return (
    <HoverDetailPortal
      isVisible={hoverDetail.isVisible}
      position={hoverDetail.position}
      data={hoverDetail.data}
    />
  );
};

export default ComboboxHoverDetail;
