import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type PriceOverride = {
  code: string;
  sell_price_idr: number;
};

type SeedItem = {
  code: string;
  base_price: number;
  sell_price: number;
};

type SeedFile = {
  items: SeedItem[];
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const overridesPath = args[1];
  const outputPath = args[2] ?? inputPath;

  if (!inputPath || !overridesPath) {
    throw new Error(
      'Usage: bun scripts/apply-item-price-overrides.ts <seed-json> <overrides-json> [output-json]'
    );
  }

  return {
    inputPath: path.resolve(inputPath),
    overridesPath: path.resolve(overridesPath),
    outputPath: path.resolve(outputPath),
  };
};

const calculateBasePrice = (sellPrice: number): number =>
  Math.round(sellPrice * 0.85);

const main = () => {
  const { inputPath, overridesPath, outputPath } = parseArgs();
  const seed = JSON.parse(readFileSync(inputPath, 'utf8')) as SeedFile;
  const overrides = JSON.parse(
    readFileSync(overridesPath, 'utf8')
  ) as PriceOverride[];

  const overrideMap = new Map(
    overrides
      .filter(override => override.code && Number(override.sell_price_idr) > 0)
      .map(override => [override.code, Math.round(override.sell_price_idr)])
  );

  let updated = 0;

  for (const item of seed.items) {
    const sellPrice = overrideMap.get(item.code);

    if (!sellPrice) {
      continue;
    }

    item.sell_price = sellPrice;
    item.base_price = calculateBasePrice(sellPrice);
    updated += 1;
  }

  writeFileSync(outputPath, `${JSON.stringify(seed, null, 2)}\n`);

  console.log(`Overrides loaded : ${overrideMap.size}`);
  console.log(`Items updated    : ${updated}`);
  console.log(`Output file      : ${outputPath}`);
};

main();
