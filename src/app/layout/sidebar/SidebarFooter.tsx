import { AnimatePresence, motion } from 'motion/react';
import { BRAND_NAME } from './constants';

interface SidebarFooterProps {
  showExpandedContent: boolean;
}

const SidebarFooter = ({ showExpandedContent }: SidebarFooterProps) => (
  <div className="mt-auto border-t border-slate-200 p-4 text-xs text-slate-500">
    <div className="h-4">
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <AnimatePresence initial={false}>
          {showExpandedContent ? (
            <motion.div
              key="pharmasys-text"
              initial={{ opacity: 0, width: 0, marginRight: 0 }}
              animate={{
                opacity: 1,
                width: 'auto',
                marginRight: '0.25em',
              }}
              exit={{ opacity: 0, width: 0, marginRight: 0 }}
              transition={{ duration: 0.3 }}
              style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
            >
              {BRAND_NAME}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <span>v2.3.0</span>
      </div>
    </div>
  </div>
);

export default SidebarFooter;
