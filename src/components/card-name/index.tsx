import React from "react";
import { CardNameField, CardNameProps } from "@/types";

const CardName: React.FC<CardNameProps> = ({
  item,
  index,
  debouncedSearch,
  onClick,
  fields,
  imageConfig,
}: CardNameProps) => {
  const renderImage = () => {
    if (!imageConfig) return null;

    const { imageKey, blankImage, isRounded = false, altText } = imageConfig;
    const imageUrl =
      typeof item[imageKey] === "string" ? item[imageKey] : undefined;

    // Ukuran gambar yang berbeda untuk rounded vs non-rounded
    const imageClasses = isRounded
      ? "w-24 h-24 object-cover border-2 border-gray-200 rounded-full"
      : "w-16 h-16 object-cover border-2 border-gray-200 rounded-lg";

    if (imageUrl || blankImage) {
      return (
        <img
          src={(imageUrl as string) || blankImage}
          alt={altText}
          className={imageClasses}
          onError={(e) => {
            if (blankImage) {
              (e.target as HTMLImageElement).src = blankImage;
            }
          }}
        />
      );
    }

    return (
      <div
        className={`bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-gray-200 ${
          isRounded ? "w-24 h-24 rounded-full" : "w-16 h-16 rounded-lg"
        }`}
      >
        <div className="text-2xl font-bold text-blue-600">
          {typeof item.name === "string"
            ? item.name.charAt(0).toUpperCase()
            : "?"}
        </div>
      </div>
    );
  };

  const getBackgroundImage = () => {
    if (!imageConfig) return "";

    const { imageKey, blankImage } = imageConfig;
    const imageUrl =
      typeof item[imageKey] === "string" ? item[imageKey] : undefined;

    return (imageUrl as string) || blankImage || "";
  };

  const backgroundImage = getBackgroundImage();

  return (
    <div
      onClick={() => onClick(item)}
      className={`relative border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-200 overflow-hidden min-h-[120px] ${
        index === 0 && debouncedSearch
          ? "ring-2 ring-emerald-400"
          : "hover:border-blue-300"
      }`}
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40"
        style={{
          background:
            index === 0 && debouncedSearch
              ? "linear-gradient(to right, rgba(236, 253, 245, 0.95), rgba(236, 253, 245, 0.8), rgba(236, 253, 245, 0.4))"
              : "linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))",
        }}
      />
      <div className="relative z-10 flex items-start">
        <div className="flex-shrink-0">{renderImage()}</div>
        <div
          className={`flex-1 min-w-0 ${imageConfig?.isRounded ? "ml-8" : "ml-4"}`}
        >
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {String(item.name || "")}
          </h3>
          <div className="mt-1 space-y-1">
            {fields.map((field: CardNameField) => {
              const value = item[field.key];
              const displayValue = field.render
                ? field.render(value, item)
                : String(value || "-");

              return (
                <p
                  key={field.key}
                  className={`text-sm text-gray-600 ${
                    field.type === "long" ? "line-clamp-2" : "truncate"
                  }`}
                >
                  <span className="font-medium">{field.label}:</span>{" "}
                  {displayValue}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardName;
