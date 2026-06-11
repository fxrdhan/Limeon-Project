import { TbUpload } from 'react-icons/tb';
import { motion } from 'motion/react';
import Button from '@/components/button';

interface UploadInvoiceActionsProps {
  file: File | null;
  loading: boolean;
  onCancel: () => void;
  onUpload: () => void;
}

export function UploadInvoiceActions({
  file,
  loading,
  onCancel,
  onUpload,
}: UploadInvoiceActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="border-t-2 border-slate-200"
    >
      <div className="flex justify-between mt-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button type="button" variant="text" onClick={onCancel}>
            Batal
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="button"
            onClick={onUpload}
            disabled={!file || loading}
            isLoading={loading}
            className="bg-primary text-white"
            aria-live="polite"
            withGlow
          >
            <motion.div
              animate={loading ? { rotate: 360 } : {}}
              transition={
                loading
                  ? {
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }
                  : {}
              }
            >
              <TbUpload className="mr-2" />
            </motion.div>
            Ekspor Data
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
