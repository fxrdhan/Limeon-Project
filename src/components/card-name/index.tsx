import React from "react";

export type CardItem = {
  id: string;
  name: string;
  [key: string]: unknown;
};

interface CardNameField {
  key: string;
  label: string;
  type?: string;
  render?: (value: unknown, item: CardItem) => React.ReactNode;
  useBlankImage?: boolean;
}

interface CardNameImageConfig {
  imageKey: string;
  blankImage?: string;
  isRounded?: boolean;
  altText: string;
}

interface CardNameProps {
  item: CardItem;
  index: number;
  debouncedSearch: string;
  onClick: (item: CardItem) => void;
  fields: CardNameField[];
  imageConfig?: CardNameImageConfig;
}

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
    const imageUrl = typeof item[imageKey] === "string" ? item[imageKey] : undefined;

    if (imageUrl || blankImage) {
      return (
        <img
          src={(imageUrl as string) || blankImage}
          alt={altText}
          className={`w-16 h-16 object-cover border-2 border-gray-200 ${
            isRounded ? "rounded-full" : "rounded-lg"
          }`}
          onError={(e) => {
            if (blankImage) {
              (e.target as HTMLImageElement).src = blankImage;
            }
          }}
        />
      );
    }

    return (
      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border-2 border-gray-200">
        <div className="text-2xl font-bold text-blue-600">
          {typeof item.name === "string" ? item.name.charAt(0).toUpperCase() : "?"}
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={() => onClick(item)}
      className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-200 ${
        index === 0 && debouncedSearch
          ? "ring-2 ring-emerald-400 bg-emerald-50"
          : "hover:border-blue-300"
      }`}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">{renderImage()}</div>
        <div className="flex-1 min-w-0">
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