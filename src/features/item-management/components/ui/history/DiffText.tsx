import React from "react";
import { createCharacterDiff, createWordDiff, createSmartDiff, DiffSegment } from "@/utils/diff";

interface LocalDiffTextProps {
  oldText: string;
  newText: string;
  mode?: "character" | "word" | "smart";
  className?: string;
}

const DiffText: React.FC<LocalDiffTextProps> = ({
  oldText,
  newText,
  mode = "smart",
  className = "",
}) => {
  const segments: DiffSegment[] =
    mode === "character"
      ? createCharacterDiff(oldText, newText)
      : mode === "word"
      ? createWordDiff(oldText, newText)
      : createSmartDiff(oldText, newText);

  return (
    <span className={`font-mono text-sm ${className}`}>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case "added":
            return (
              <span
                key={index}
                className="bg-green-400 text-gray-900 py-0.5 font-medium"
                title="Ditambahkan"
                style={{ backgroundColor: "#4ade80" }}
              >
                {segment.text}
              </span>
            );
          case "removed":
            return (
              <span
                key={index}
                className="bg-red-400 text-gray-900 py-0.5 font-medium"
                title="Dihapus"
                style={{ backgroundColor: "#f87171" }}
              >
                {segment.text}
              </span>
            );
          case "unchanged":
            return (
              <span key={index} className="text-gray-800">
                {segment.text}
              </span>
            );
          default:
            return null;
        }
      })}
    </span>
  );
};

export default DiffText;
