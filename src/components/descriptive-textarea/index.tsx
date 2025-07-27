import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";
import classNames from "classnames";
import type { DescriptiveTextareaProps } from "@/types";

const DescriptiveTextarea: React.FC<DescriptiveTextareaProps> = ({
  label,
  value,
  onChange,
  name,
  placeholder,
  rows = 3,
  containerClassName,
  textareaClassName,
  labelClassName,
  showInitially = false,
  expandOnClick = false,
  tabIndex,
  ...props
}) => {
  const [showTextarea, setShowTextarea] = useState(showInitially);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showInitially && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showInitially]);

  return (
    <div className={classNames("mt-2 pt-2", containerClassName)}>
      <button
        type="button"
        tabIndex={tabIndex}
        onMouseEnter={() => !expandOnClick && setIsHovered(true)}
        onMouseLeave={() => !expandOnClick && setIsHovered(false)}
        className={classNames(
          "group flex items-center text-primary transition-colors focus:outline-hidden focus:text-primary",
          labelClassName,
        )}
        onClick={() => setShowTextarea(!showTextarea)}
      >
        <span className="mr-2 text-md text-primary focus:outline-hidden group-focus:text-primary">
          {label}
        </span>
        <motion.div
          animate={{
            rotate: expandOnClick ? (showTextarea ? 180 : 0) : (showTextarea || isHovered ? 180 : 0),
          }}
          transition={{ duration: 0.3 }}
          className="transform"
        >
          <FaChevronDown size={12} />
        </motion.div>
      </button>
      <AnimatePresence>
        {(expandOnClick ? showTextarea : (showTextarea || isHovered)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            onMouseEnter={() => !expandOnClick && setIsHovered(true)}
            onMouseLeave={() => !expandOnClick && setIsHovered(false)}
          >
            <div className="mt-2 min-h-[100px] max-h-[200px] p-1">
              <textarea
                ref={textareaRef}
                name={name}
                value={value}
                tabIndex={tabIndex}
                onChange={onChange}
                placeholder={placeholder}
                className={classNames(
                  "text-sm w-full h-full min-h-[100px] max-h-[200px] p-2 pl-3 border border-gray-300 rounded-lg focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200",
                  textareaClassName,
                )}
                rows={rows}
                spellCheck="false"
                onFocus={() => setShowTextarea(true)}
                {...props}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DescriptiveTextarea;
