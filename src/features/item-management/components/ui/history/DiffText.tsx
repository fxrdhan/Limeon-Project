import React from "react";
import { createCharacterDiff, createWordDiff, DiffSegment } from "@/utils/diff";

interface LocalDiffTextProps {
  oldText: string;
  newText: string;
  mode?: "character" | "word";
  className?: string;
}

const DiffText: React.FC<LocalDiffTextProps> = ({
  oldText,
  newText,
  mode = "character",
  className = "",
}) => {
  const segments: DiffSegment[] =
    mode === "character"
      ? createCharacterDiff(oldText, newText)
      : createWordDiff(oldText, newText);

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
