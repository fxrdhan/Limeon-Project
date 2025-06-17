# Tutorial Migrasi Tailwind CSS v3 ke v4

Tailwind CSS v4 adalah penulisan ulang framework yang menghadirkan engine "Oxide" baru dengan performa hingga 100x lebih cepat. Migrasi dari v3 ke v4 memerlukan perhatian khusus pada perubahan arsitektur dan konfigurasi CSS-first yang baru.

## 1. Persiapan Sebelum Migrasi

### Pemeriksaan Sistem dan Kompatibilitas
Sebelum memulai migrasi, pastikan sistem Anda memenuhi persyaratan berikut:

**Persyaratan Browser:**
- Safari 16.4+
- Chrome 111+
- Firefox 128+

**Persyaratan Node.js:**
- Node.js versi 20 atau lebih tinggi (wajib untuk tool upgrade)

**Checklist Persiapan:**
```bash
# Periksa versi Node.js
node --version  # Harus 20+

# Pastikan status Git bersih
git status
git add .
git commit -m "Checkpoint sebelum migrasi v4"

# Buat branch baru untuk migrasi
git checkout -b migrasi-tailwind-v4

# Backup file konfigurasi
cp tailwind.config.js tailwind.config.js.backup
cp package.json package.json.backup
cp postcss.config.js postcss.config.js.backup
```

### Analisis Dependency dan Persyaratan
Periksa dependency yang mungkin terpengaruh:

```bash
# Periksa plugin Tailwind yang digunakan
npm list | grep tailwindcss

# Identifikasi plugin yang perlu diperbarui
npm outdated | grep tailwindcss
```

**Plugin yang Perlu Diperhatikan:**
- `@tailwindcss/typography`
- `@tailwindcss/forms` 
- `@tailwindcss/aspect-ratio`
- Plugin custom yang menggunakan `addUtilities`

## 2. Breaking Changes dan Perubahan API Signifikan

### Perubahan Arsitektur Utama

**Engine Baru (Oxide):**
- Dibangun dengan Rust untuk performa maksimal
- Peningkatan kecepatan build hingga 5x untuk full build
- Peningkatan kecepatan incremental build hingga 100x

**Konfigurasi CSS-First:**
Perubahan paling mendasar adalah perpindahan dari konfigurasi JavaScript ke CSS:

```javascript
// v3 - Konfigurasi JavaScript
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6'
      }
    }
  }
}
```

```css
/* v4 - Konfigurasi CSS */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --font-display: "Inter", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

### Perubahan Import Statement

**v3:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**v4:**
```css
@import "tailwindcss";
```

### Utility Classes yang Berubah Nama

| Kelas v3 | Kelas v4 | Alasan Perubahan |
|----------|----------|------------------|
| `shadow` | `shadow-sm` | Konsistensi penamaan |
| `shadow-sm` | `shadow-xs` | Konsistensi penamaan |
| `rounded` | `rounded-sm` | Konsistensi penamaan |
| `rounded-sm` | `rounded-xs` | Konsistensi penamaan |
| `blur` | `blur-sm` | Konsistensi penamaan |
| `blur-sm` | `blur-xs` | Konsistensi penamaan |
| `ring` | `ring-3` | Membuat default eksplisit |
| `outline-none` | `outline-hidden` | Terminology yang lebih jelas |

### Utility Classes yang Dihapus

| Kelas v3 yang Dihapus | Replacement v4 | Contoh Penggunaan |
|----------------------|----------------|-------------------|
| `bg-opacity-50` | `bg-black/50` | `<div class="bg-black/50">` |
| `text-opacity-75` | `text-black/75` | `<div class="text-black/75">` |
| `border-opacity-25` | `border-black/25` | `<div class="border-black/25">` |
| `flex-shrink-0` | `shrink-0` | `<div class="shrink-0">` |
| `flex-grow` | `grow` | `<div class="grow">` |
| `overflow-ellipsis` | `text-ellipsis` | `<div class="text-ellipsis">` |

## 3. Langkah-langkah Migrasi Step-by-Step

### Langkah 1: Migrasi Otomatis (Recommended)

Gunakan tool migrasi resmi untuk menangani sebagian besar perubahan:

```bash
# Jalankan tool migrasi otomatis
npx @tailwindcss/upgrade

# Jika mengalami error, gunakan force flag
npx @tailwindcss/upgrade --force
```

**Apa yang Dilakukan Tool Ini:**
- Memperbarui dependency di `package.json`
- Mengkonversi konfigurasi dari JS ke CSS
- Memperbarui template files dengan utility classes baru
- Menangani perubahan PostCSS configuration
- Memperbarui import statements di CSS files

### Langkah 2: Verifikasi Hasil Migrasi

```bash
# Periksa perubahan yang dibuat
git diff

# Review perubahan package.json
cat package.json

# Periksa file CSS utama
cat src/index.css
```

### Langkah 3: Migrasi Manual (Jika Diperlukan)

Jika tool otomatis gagal atau tidak lengkap, lakukan migrasi manual:

**Update Package.json:**
```bash
# Hapus dependency lama
npm uninstall tailwindcss autoprefixer postcss-import

# Install package v4 baru
npm install -D tailwindcss@latest

# Untuk PostCSS (jika tidak menggunakan Vite)
npm install -D @tailwindcss/postcss

# Untuk CLI standalone
npm install -D @tailwindcss/cli

# Untuk integrasi Vite (sangat direkomendasikan)
npm install -D @tailwindcss/vite
```

**Update CSS File:**
```css
/* Sebelum - v3 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Sesudah - v4 */
@import "tailwindcss";

@theme {
  --color-brand: #3b82f6;
  --color-secondary: #10b981;
  --font-display: "Inter", sans-serif;
  --breakpoint-3xl: 1920px;
}
```

## 4. Perubahan Konfigurasi tailwind.config.js

### Migrasi ke CSS-First Configuration

**Konfigurasi Lama (v3):**
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          900: '#0c4a6e'
        },
        secondary: '#10b981'
      },
      fontFamily: {
        'display': ['Inter', 'sans-serif']
      },
      screens: {
        '3xl': '1920px'
      }
    }
  },
  plugins: []
}
```

**Konfigurasi Baru (v4):**
```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-brand-50: #f0f9ff;
  --color-brand-100: #e0f2fe;
  --color-brand-500: #0ea5e9;
  --color-brand-900: #0c4a6e;
  --color-secondary: #10b981;
  
  /* Fonts */
  --font-display: "Inter", sans-serif;
  
  /* Breakpoints */
  --breakpoint-3xl: 1920px;
  
  /* Custom shadows */
  --shadow-custom: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

@custom-variant dark {
  &:where(.dark, .dark *) {
    @slot;
  }
}
```

### Backward Compatibility

Jika Anda masih perlu menggunakan konfigurasi JavaScript:

```css
@import "tailwindcss";
@config "./tailwind.config.js";
```

**Catatan:** Ini tidak direkomendasikan untuk proyek baru dan mungkin tidak mendukung semua fitur v4.

## 5. Update Dependency dan package.json

### Package.json Lengkap untuk v4

```json
{
  "name": "my-tailwind-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build-css": "npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css",
    "watch-css": "npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@tailwindcss/cli": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

### Integrasi Build Tools

**Vite Configuration (Direkomendasikan):**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss() // Plugin Vite first-party
  ]
});
```

**PostCSS Configuration:**
```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {}
    // Tidak perlu autoprefixer atau postcss-import lagi
  }
};
```

**Webpack Configuration:**
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  '@tailwindcss/postcss'
                ]
              }
            }
          }
        ]
      }
    ]
  }
};
```

## 6. Perubahan Utility Classes dan Deprecation

### Modifier Opacity Baru

**Sintaks Lama:**
```html
<div class="bg-blue-500 bg-opacity-50">
<div class="text-gray-900 text-opacity-75">
<div class="border-red-500 border-opacity-25">
```

**Sintaks Baru:**
```html
<div class="bg-blue-500/50">
<div class="text-gray-900/75">
<div class="border-red-500/25">
```

### Perubahan CSS Variable Syntax

**v3:**
```html
<div class="bg-[--brand-color]">
<div class="w-[--sidebar-width]">
```

**v4:**
```html
<div class="bg-(--brand-color)">
<div class="w-(--sidebar-width)">
```

### Default Value Changes

**Border dan Divide Utilities:**
```html
<!-- v3 - Default ke gray-200 -->
<div class="border">

<!-- v4 - Default ke currentColor -->
<div class="border border-gray-200">
```

**Ring Utilities:**
```html
<!-- v3 - Default ring-3 ring-blue-500 -->
<button class="focus:ring">

<!-- v4 - Default ring-1 ring-currentColor -->
<button class="focus:ring-3 focus:ring-blue-500">
```

## 7. Handling Compatibility Issues dan Troubleshooting

### Masalah Umum dan Solusi

**1. Error "addUtilities dengan selector tidak valid"**
```bash
# Hapus plugin bermasalah sebelum migrasi
# Komen plugin yang menggunakan addUtilities dengan :root
```

**2. Styles Tidak Terapply**
```css
/* Tambahkan source directive eksplisit jika perlu */
@import "tailwindcss";
@source "src/**/*.{js,jsx,ts,tsx,vue,svelte}";
```

**3. PostCSS Plugin Error**
```bash
# Install package PostCSS terpisah
npm install -D @tailwindcss/postcss

# Update postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

**4. Build Process Gagal**
```bash
# Clear cache dan reinstall
rm -rf node_modules package-lock.json
npm install

# Periksa konflik dependency
npm ls
```

### Framework-Specific Issues

**React (Create React App):**
```bash
# CRA memiliki masalah dengan v4
# Pertimbangkan migrasi ke Vite
npm install -D vite @vitejs/plugin-react
```

**Vue.js:**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()]
});
```

**Angular:**
```bash
# Convert SCSS ke CSS (v4 tidak support preprocessor)
# Rename file .scss menjadi .css
# Hapus dependency Sass
```

## 8. Testing dan Validation Setelah Migrasi

### Automated Testing

**Build Process Testing:**
```bash
# Test development build
npm run dev

# Test production build
npm run build

# Verify output files
ls -la dist/
```

**Visual Regression Testing:**
```javascript
// playwright.config.js
module.exports = {
  testDir: './tests',
  use: {
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
};
```

```javascript
// tests/visual-regression.spec.js
const { test, expect } = require('@playwright/test');

test('visual regression test', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### Manual Testing Checklist

**UI Components:**
- [ ] Semua halaman render dengan benar
- [ ] Dark mode berfungsi normal
- [ ] Responsive design tetap konsisten
- [ ] Custom components masih berfungsi
- [ ] Animasi dan transisi berjalan normal
- [ ] Form styling terjaga
- [ ] Typography rendering benar

**Performance Testing:**
```bash
# Ukur waktu build
time npm run build

# Periksa ukuran bundle
npx bundlesize

# Test di browser target
# Safari 16.4+, Chrome 111+, Firefox 128+
```

## 9. Performance Improvements dan Fitur Baru

### Peningkatan Performa Signifikan

**Benchmark Performa:**
- **Full builds**: 5x lebih cepat (contoh: 960ms → 105ms)
- **Incremental builds**: 100x lebih cepat (dari milidetik ke mikrodetik)
- **Ukuran instalasi**: 35% lebih kecil
- **Bundle size**: Kebanyakan proyek <10KB CSS

### Fitur-Fitur Baru v4

**1. Container Queries Built-in:**
```html
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4">
    <!-- Responsive berdasarkan container, bukan viewport -->
  </div>
</div>
```

**2. Modern CSS Features:**
```html
<!-- Text shadow utilities -->
<h1 class="text-shadow-lg">Heading dengan shadow</h1>

<!-- Color scheme utilities -->
<form class="scheme-light">
  <input type="text" class="form-input">
</form>

<!-- 3D transforms -->
<div class="transform-gpu rotate-x-45 rotate-y-12">
```

**3. Enhanced Variants:**
```html
<!-- not-* variant -->
<div class="not-first:border-t">

<!-- nth-* variants -->
<li class="nth-3n:bg-gray-100">

<!-- Composable variants -->
<div class="group-has-focus:opacity-100">
```

**4. OKLCH Color System:**
```css
@theme {
  --color-vibrant: oklch(0.84 0.18 117.33);
  --color-subtle: oklch(0.95 0.02 180);
}
```

**5. Automatic Content Detection:**
- Tidak perlu konfigurasi `content` array
- Otomatis mendeteksi file template
- Mengabaikan file binary dan `.gitignore`
- Integrasi dengan module graph Vite

## 10. Best Practices dan Tips untuk Migrasi Smooth

### Pre-Migration Best Practices

**1. Gunakan Git Branching:**
```bash
git checkout -b tailwind-v4-migration
git commit -m "Pre-migration checkpoint"
```

**2. Update Node.js:**
```bash
# Pastikan Node.js 20+
nvm install 20
nvm use 20
```

**3. Clean Up Dependencies:**
```bash
# Hapus plugin yang tidak perlu
npm uninstall @tailwindcss/aspect-ratio
# (aspect-ratio sekarang built-in)
```

### Migration Strategy

**1. Incremental Migration:**
- Mulai dengan tool otomatis
- Test setiap komponen secara individual
- Fix issue satu per satu
- Commit perubahan secara bertahap

**2. Leverage New Features:**
```css
/* Gunakan konfigurasi CSS-first */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --font-heading: "Poppins", sans-serif;
}

/* Custom utilities */
@utility btn-primary {
  background-color: theme(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}
```

**3. Performance Optimization:**
```javascript
// Vite config untuk performa maksimal
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    cssCodeSplit: false
  }
});
```

### Development Workflow

**1. Hot Reload Optimization:**
```css
/* Gunakan import statement yang efisien */
@import "tailwindcss";
/* Hindari import yang berlebihan */
```

**2. IntelliSense Configuration:**
```json
// .vscode/settings.json
{
  "tailwindCSS.experimental.configFile": "src/styles/tailwind.css",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## 11. Common Pitfalls dan Cara Menghindarinya

### Pitfall 1: Browser Compatibility

**Masalah:**
Mengabaikan persyaratan browser modern v4

**Solusi:**
```javascript
// Periksa target browser di browserslist
// package.json
{
  "browserslist": [
    "Safari >= 16.4",
    "Chrome >= 111",
    "Firefox >= 128"
  ]
}
```

### Pitfall 2: Plugin Incompatibility

**Masalah:**
Plugin v3 tidak bekerja dengan v4

**Solusi:**
```css
/* Migrasi plugin ke CSS-first */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";

/* Untuk plugin custom, gunakan @utility */
@utility glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Pitfall 3: SCSS/SASS Dependency

**Masalah:**
v4 tidak mendukung preprocessor

**Solusi:**
```bash
# Convert SCSS ke CSS
find src -name "*.scss" -exec sh -c 'mv "$1" "${1%.scss}.css"' _ {} \;

# Update import statements
sed -i 's/\.scss/.css/g' src/**/*.{js,jsx,ts,tsx}
```

### Pitfall 4: Forgotten Utility Updates

**Masalah:**
Tidak mengupdate utility classes yang berubah nama

**Solusi:**
```bash
# Script untuk find dan replace otomatis
sed -i 's/\bshadow\b/shadow-sm/g' src/**/*.{html,js,jsx,ts,tsx}
sed -i 's/\bshadow-sm\b/shadow-xs/g' src/**/*.{html,js,jsx,ts,tsx}
sed -i 's/\bring\b/ring-3/g' src/**/*.{html,js,jsx,ts,tsx}
```

### Pitfall 5: Configuration Conflicts

**Masalah:**
Mixing CSS dan JavaScript configuration

**Solusi:**
```css
/* Pilih satu metode - preferably CSS-first */
@import "tailwindcss";

@theme {
  /* Semua konfigurasi di sini */
}

/* Atau jika harus legacy: */
@config "./tailwind.config.js";
```

## 12. Contoh-contoh Praktis dan Code Examples

### Contoh 1: Migrasi Component Library

**Sebelum (v3):**
```javascript
// Button.jsx
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary'
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);
```

**Sesudah (v4):**
```css
/* styles.css */
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;
}

@utility btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: colors 0.2s;
}

@utility btn-primary {
  background-color: theme(--color-primary);
  color: theme(--color-primary-foreground);
  &:hover {
    background-color: color-mix(in srgb, theme(--color-primary) 90%, black);
  }
}
```

```javascript
// Button.jsx - v4
const buttonVariants = cva(
  'btn-base focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'btn-primary',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-gray-200 hover:bg-gray-50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-gray-50',
        link: 'underline-offset-4 hover:underline text-primary'
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-sm',
        lg: 'h-11 px-8 rounded-sm'
      }
    }
  }
);
```

### Contoh 2: Dark Mode Implementation

**v3 Setup:**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
}
```

**v4 Setup:**
```css
@import "tailwindcss";

@custom-variant dark {
  &:where(.dark, .dark *) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:not(.light, .light *) {
      @slot;
    }
  }
}

@theme {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  --color-border: #e2e8f0;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: #0f172a;
    --color-foreground: #f8fafc;
    --color-card: #1e293b;
    --color-card-foreground: #f8fafc;
    --color-border: #334155;
    --color-muted: #1e293b;
    --color-muted-foreground: #94a3b8;
  }
}
```

```html
<!-- Usage tetap sama -->
<div class="bg-background text-foreground dark:bg-background dark:text-foreground">
  <div class="border border-border dark:border-border">
    Content
  </div>
</div>
```

### Contoh 3: Custom Animation dan Transitions

**v3:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        }
      }
    }
  }
}
```

**v4:**
```css
@import "tailwindcss";

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@utility animate-fade-in {
  animation: fade-in 0.5s ease-in-out;
}

@utility animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

/* Starting style untuk smooth transitions */
@starting-style {
  .animate-fade-in {
    opacity: 0;
  }
  .animate-slide-up {
    transform: translateY(100%);
  }
}
```

### Contoh 4: Responsive Design dengan Container Queries

**Fitur baru v4:**
```html
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4">
    <div class="@container">
      <img class="w-full @sm:w-1/2" src="image.jpg" alt="Responsive image">
      <div class="p-4 @sm:p-6">
        <h3 class="text-lg @sm:text-xl @md:text-2xl">Title</h3>
        <p class="text-sm @sm:text-base @md:text-lg">Description</p>
      </div>
    </div>
  </div>
</div>
```

### Contoh 5: Plugin Migration - Typography

**v3:**
```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/typography')({
      modifiers: ['lg', 'xl'],
    }),
  ]
}
```

**v4:**
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Custom typography configuration */
@config "./tailwind.config.js";
```

```javascript
// tailwind.config.js (untuk kustomisasi)
module.exports = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--color-foreground)',
            h1: {
              color: 'var(--color-foreground)',
              fontWeight: 700
            },
            h2: {
              color: 'var(--color-foreground)',
              fontWeight: 600
            },
            strong: {
              color: 'var(--color-foreground)',
              fontWeight: 600
            },
            a: {
              color: 'var(--color-primary)',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            },
            code: {
              color: 'var(--color-foreground)',
              backgroundColor: 'var(--color-muted)',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              fontWeight: 500
            },
            pre: {
              backgroundColor: 'var(--color-muted)',
              color: 'var(--color-foreground)'
            }
          }
        }
      }
    }
  }
};
```

## Kesimpulan

Migrasi dari Tailwind CSS v3 ke v4 merupakan investasi yang sangat berharga untuk pengembangan web modern. Dengan peningkatan performa hingga 100x untuk incremental builds dan arsitektur CSS-first yang lebih intuitif, v4 memberikan pengalaman developer yang jauh lebih baik.

**Ringkasan Manfaat:**
- **Performa**: Build times 5x lebih cepat untuk full builds
- **Modern CSS**: Dukungan native untuk container queries, cascade layers, dan color-mix()
- **Developer Experience**: Konfigurasi CSS-first yang lebih mudah dipahami
- **Bundle Size**: Optimasi otomatis menghasilkan CSS yang lebih kecil
- **Maintainability**: Arsitektur yang lebih bersih dan modern

**Estimasi Waktu Migrasi:**
- Proyek kecil: 1-2 jam
- Proyek menengah: 2-4 jam  
- Proyek besar: 4-8 jam

Tool migrasi otomatis menangani 90% dari pekerjaan, sehingga mayoritas waktu dihabiskan untuk testing dan fine-tuning. Dengan mengikuti panduan ini secara sistematis, Anda dapat melakukan migrasi dengan sukses dan memanfaatkan semua keunggulan Tailwind CSS v4.

Jangan ragu untuk memulai dengan tool migrasi otomatis, lalu gunakan panduan manual ini untuk menangani kasus-kasus spesifik yang tidak tertangani otomatis. Selamat mengembangkan dengan Tailwind CSS v4!