import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";
import { classNames } from "@/lib/classNames";
import type { DescriptiveTextareaProps } from "@/types";

export const DescriptiveTextarea: React.FC<DescriptiveTextareaProps> = ({
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
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={classNames(
                    "flex items-center text-primary transition-colors",
                    labelClassName
                )}
                onClick={() => setShowTextarea(!showTextarea)}
            >
                <span className="mr-2 text-md text-primary hover:text-blue-600">
                    {label}
                </span>
                <motion.div
                    animate={{
                        rotate: showTextarea || isHovered ? 180 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="transform"
                >
                    <FaChevronDown size={12} />
                </motion.div>
            </button>
            <AnimatePresence>
                {(showTextarea || isHovered) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <div className="mt-2 min-h-[100px] max-h-[200px] p-1">
                            <textarea
                                ref={textareaRef}
                                name={name}
                                value={value}
                                onChange={onChange}
                                placeholder={placeholder}
                                className={classNames(
                                    "w-full h-full min-h-[100px] max-h-[200px] p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-300",
                                    textareaClassName
                                )}
                                rows={rows}
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
