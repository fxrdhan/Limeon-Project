# convert-to-oklch

Local CLI package for migrating CSS color literals to `oklch()`.

It converts these source formats:

- Hex: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`
- RGB: `rgb()`, `rgba()`, including modern slash-alpha syntax
- HSL: `hsl()`, `hsla()`, including modern slash-alpha syntax

The package is registered in the root project as a local `file:` dependency, so it can be called directly from the repo:

```sh
npx convert-to-oklch ./src/**/*.css
bunx convert-to-oklch ./src/**/*.css
```

## Usage

Convert CSS files matched by a glob:

```sh
npx convert-to-oklch ./src/**/*.css
```

Convert one file and one directory:

```sh
npx convert-to-oklch src/App.css src/components
```

Scan from the current working directory:

```sh
npx convert-to-oklch --all
```

Preview changes without writing:

```sh
npx convert-to-oklch --all --dry-run
```

Use a custom precision:

```sh
npx convert-to-oklch ./src/**/*.css --precision 2
npx convert-to-oklch ./src/**/*.css -p 2
```

Use it in CI as a guard:

```sh
npx convert-to-oklch --all --check
```

`--check` is a dry run that exits with status `1` when any conversion would be made.

## CLI Options

- `--all` or `all`: scan all text files under the current working directory.
- `<file-or-folder-or-glob>`: scan explicit files, directories, or glob patterns.
- `-p`, `--precision <1-21>`: set output precision. Default: `1`.
- `--dry-run`: report files that would change without writing.
- `--check`: dry-run mode that exits with `1` when changes are needed.
- `--write`, `-w`: accepted for compatibility. Writing is already the default.
- `--help`, `-h`: print CLI help.

## Write Behavior

The default behavior matches the public `convert-to-oklch` tool: files are rewritten in place.

Run with `--dry-run` first when you want an inventory:

```sh
npx convert-to-oklch --all --dry-run
```

The command prints each changed file and the number of converted color literals:

```txt
updated src/App.css (9)
write: 1 file(s), 9 conversion(s)
```

## Precision

Precision controls OKLCH component rounding:

- `L`: `precision` decimal places, formatted as a percentage.
- `C`: `precision + 2` decimal places.
- `H`: `precision` decimal places, formatted in degrees without a unit.
- Alpha: up to `4` decimal places.

With the default `-p 1`:

```diff
- background: rgb(102, 173, 221);
+ background: oklch(72% 0.1 239.8);
```

With `-p 2`, the same color keeps more detail:

```css
background: oklch(72.01% 0.1036 239.77);
```

The conversion math itself is not approximate string mapping. The CLI converts source colors through:

1. CSS color syntax parsing.
2. sRGB channel normalization.
3. sRGB transfer-function expansion into linear sRGB.
4. linear sRGB to OKLab matrix conversion.
5. OKLab polar conversion to OKLCH.
6. final formatting with the requested precision.

## Ignore Files

When scanning directories or `--all`, the CLI reads ignore rules from the project where it is invoked:

1. `.gitignore`
2. `.ignore`

Rules are applied in that order, so `.ignore` can override `.gitignore` with negated patterns.

Supported ignore syntax:

- blank lines
- comments starting with `#`
- negation with `!`
- directory patterns ending in `/`
- root-relative patterns starting with `/`
- `*`, `**`, and `?` wildcards

The CLI intentionally does not hardcode project-specific generated outputs such as `dist`, `coverage`, lockfiles, or generated CSS. If those paths should be skipped, put them in `.gitignore` or `.ignore`.

The only built-in directory exclusion is `.git`, because scanning VCS internals is never useful for source color migration.

Explicit file paths bypass ignore matching. For example, this processes the file even if it is ignored:

```sh
npx convert-to-oklch dist/output.css
```

Directory and glob scans still respect ignore files:

```sh
npx convert-to-oklch dist
npx convert-to-oklch './dist/**/*.css'
```

## Tailwind Arbitrary Values

Tailwind arbitrary values cannot contain raw spaces inside class names. When the CLI detects a color inside an arbitrary value bracket, it formats OKLCH with underscores:

```diff
- shadow-[0_0_12px_rgba(192,132,252,0.5)]
+ shadow-[0_0_12px_oklch(72.2%_0.177_305.5_/_0.5)]
```

Attribute selector brackets are skipped to avoid corrupting selectors:

```txt
[&_.recharts-dot[stroke='#fff']]
```

## Skipped Inputs

The CLI skips color functions that contain dynamic or custom-property expressions:

```css
color: rgb(102, 173, 221, var(--opacity));
color: rgb(from var(--brand) r g b);
color: color-mix(in oklch, red, blue);
```

It also skips:

- binary files
- `url(...)` contents
- likely CSS ID selectors
- hex values inside likely attribute selectors

## Limitations

The ignore parser supports the gitignore patterns commonly used in this project, but it is not a complete reimplementation of Git's ignore engine. In particular, deeply nested re-inclusion inside an ignored parent directory follows normal traversal limits: if a parent directory is ignored and skipped, descendants are not scanned unless the parent itself is unignored.

The CLI is designed for source migration, not CSS parsing. It preserves file text and performs targeted literal replacement rather than rebuilding AST output.
