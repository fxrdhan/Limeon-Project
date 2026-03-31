import { useRef, type CSSProperties } from 'react';
import { TbChevronDown } from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import Input from '@/components/input';
import FormField from '@/components/form-field';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import {
  COLLAPSIBLE_SECTION_HEADER_CLASS,
  SURFACE_CARD_CLASS,
} from '@/styles/uiPrimitives';

interface ItemAdditionalInfoFormProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: CSSProperties;
  formData: {
    barcode: string;
    description: string;
  };
  disabled?: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}

const ItemAdditionalInfoForm: React.FC<ItemAdditionalInfoFormProps> = ({
  isExpanded = true,
  onExpand,
  stackClassName,
  stackStyle,
  formData,
  disabled = false,
  onChange,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const focusFirstField = () => {
    const container = sectionRef.current?.querySelector<HTMLElement>(
      '[data-section-content]'
    );
    if (!container) return;
    const firstFocusable = container.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  };

  return (
    <div
      ref={sectionRef}
      className={`${SURFACE_CARD_CLASS} ${stackClassName || ''}`}
      style={stackStyle}
      data-stack-card="true"
    >
      <div
        className={COLLAPSIBLE_SECTION_HEADER_CLASS}
        onClick={() => onExpand?.()}
        onFocus={event => {
          if (!isExpanded && event.currentTarget.matches(':focus-visible')) {
            onExpand?.();
            setTimeout(focusFirstField, 0);
          }
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onExpand?.();
            setTimeout(focusFirstField, 0);
          }
        }}
        tabIndex={12}
        role="button"
        aria-expanded={isExpanded}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Info Tambahan
        </h2>
        <TbChevronDown
          size={16}
          className={`text-slate-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="additional-info-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-4 md:p-5 space-y-5" data-section-content="true">
              <FormField label="Barcode">
                <Input
                  name="barcode"
                  value={formData.barcode}
                  tabIndex={13}
                  onChange={onChange}
                  className="w-full"
                  placeholder="Masukkan barcode item"
                  readOnly={disabled}
                />
              </FormField>

              <DescriptiveTextarea
                label="Keterangan"
                tabIndex={16}
                name="description"
                value={formData.description}
                onChange={onChange}
                placeholder="Masukkan keterangan atau deskripsi tambahan untuk item ini..."
                expandOnClick={true}
                readOnly={disabled}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default ItemAdditionalInfoForm;
