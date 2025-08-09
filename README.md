# PharmaSys - Pharmacy and Clinic Management System

PharmaSys is a modern web-based application designed to streamline pharmacy and clinic operations. This comprehensive management system provides a complete suite of tools for managing master data, purchasing, inventory, sales, and more, all within an intuitive user interface.

## Key Features

- **Interactive Dashboard:** Overview of key metrics and activities
- **Master Data Management:** Items, Categories, Units, Types, Suppliers, Patients, and Doctors
- **Purchase Management:** Invoice data extraction from images, purchase order tracking, and reporting
- **Authentication & User Management:** Secure login and profile management
- **Real-time Data Synchronization:** Live updates across user sessions with presence tracking
- **Version Control System:** Complete entity history tracking with versioning and restoration capabilities
- **Text Comparison Engine:** Client-side character diff using Myers O(ND) algorithm with instant processing
- **Performance Optimized:** Code-splitting, lazy loading, and local processing without server dependencies

---

## Tech Stack

<div align="center">

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/prettier-%23F7B93E.svg?style=for-the-badge&logo=prettier&logoColor=black)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Yarn](https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![SWC](https://img.shields.io/badge/swc-%23FFFFFF.svg?style=for-the-badge&logo=swc&logoColor=black)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![React Query](https://img.shields.io/badge/-React%20Query-FF4154?style=for-the-badge&logo=react%20query&logoColor=white)
![Zustand](https://img.shields.io/badge/zustand-%233068b7.svg?style=for-the-badge&logo=zustand&logoColor=white)
![Framer](https://img.shields.io/badge/Framer-black?style=for-the-badge&logo=framer&logoColor=blue)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)

</div>

This project is built with:

| Technology                  | Link                                           | Description                                                      |
| --------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| **TypeScript**              | [Website](https://www.typescriptlang.org/)     | Typed programming language that builds on JavaScript             |
| **TypeScript ESLint**       | [Website](https://typescript-eslint.io/)       | Linter for code quality                                          |
| **Prettier**                | [Website](https://prettier.io/)                | Code formatter for consistent styling                            |
| **React**                   | [Website](https://react.dev/)                  | UI library for building user interfaces                          |
| **Yarn**                    | [Website](https://www.yarnpkg.com/)            | Package manager for dependency management                        |
| **Vite**                    | [Website](https://vitejs.dev/)                 | Build tool for fast development and bundling                     |
| **SWC**                     | [Website](https://swc.rs/)                     | Fast TypeScript/JavaScript compiler via @vitejs/plugin-react-swc |
| **Zod**                     | [Website](https://zod.dev/)                    | Schema validation library for type-safe data handling            |
| **Tailwind CSS**            | [Website](https://tailwindcss.com/)            | Utility-first CSS framework for styling                          |
| **React Router DOM**        | [Website](https://reactrouter.com/)            | Client-side routing for single page applications                 |
| **TanStack Query**          | [Website](https://tanstack.com/query/latest)   | Data fetching and caching library                                |
| **Zustand**                 | [Website](https://zustand-demo.pmnd.rs/)       | Bear necessities for state management in React                   |
| **Framer Motion**           | [Website](https://www.framer.com/motion/)      | Animation library for React components                           |
| **Supabase Database**       | [Website](https://supabase.com/database)       | PostgreSQL database with real-time capabilities                  |
| **Supabase Edge Functions** | [Website](https://supabase.com/edge-functions) | Serverless backend functions                                     |
| **Supabase Storage**        | [Website](https://supabase.com/storage)        | File storage and management                                      |
| **Upstash Redis**           | [Website](https://upstash.com/)                | Server-side caching                                              |

### Additional Libraries

This project incorporates and builds upon several outstanding open-source libraries:

| Library            | Link                                                    | Description                                                                    |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **AG Grid**        | [Website](https://ag-grid.com/)                         | High-performance, feature rich, and fully customisable Data Grids              |
| **classnames**     | [GitHub](https://github.com/JedWatson/classnames)       | Utility for conditionally joining CSS class names by Jed Watson                |
| **jsdiff**         | [GitHub](https://github.com/kpdecker/jsdiff)            | Text diff implementation using Myers O(ND) algorithm by Kevin Decker           |
| **fuzzysort**      | [GitHub](https://github.com/farzher/fuzzysort)          | Fast SublimeText-like fuzzy search with intelligent ranking by Stephen Kamenar |
| **React Icons**    | [GitHub](https://github.com/react-icons/react-icons)    | Popular icon libraries as React components                                     |
| **CompressorJS**   | [GitHub](https://github.com/fengyuanchen/compressorjs)  | Client-side image compression by Chen Fengyuan                                 |
| **React Spinners** | [GitHub](https://github.com/davidhu2000/react-spinners) | Collection of loading spinner components by David Hu                           |

We are grateful to all maintainers and contributors of these projects for their excellent work that has accelerated the development process of PharmaSys.

---

## Supabase Integration

PharmaSys leverages the full power of [Supabase](https://supabase.com/) as its backend, providing a scalable and integrated solution.

- **Database:** PostgreSQL database for storing all application data, from master data (items, suppliers) to transactional data (purchases, sales).
- **Authentication:** Manages user authentication and authorization, ensuring secure access to the application.
- **User Presence:** Uses Supabase Realtime to track which users are currently active in the application, displaying online user count in real-time.
- **Storage:** Used for handling file uploads, specifically for invoice images that are then processed.
- **Edge Functions:** Serverless functions for backend logic:
  - `extract-invoice`: Process invoice images to extract data
  - `confirm-invoice`: Store extracted invoice data
  - `regenerate-invoice`: Reprocess existing invoices
  - `metrics`: Function usage and performance tracking

### Database Migrations

All database schema changes (e.g., adding tables or columns) are managed through manual SQL migration scripts. It's important to write these scripts defensively using `IF NOT EXISTS` or similar checks to prevent errors in different environments. Apply these scripts directly through the Supabase SQL Editor.

**Important:** The `supabase/**` directory is used for data export and local development state; it should not be modified directly for schema migrations.

### Version Control & Diff Analysis System

**Entity History:**

- Automatic versioning for all entity changes (INSERT/UPDATE/DELETE)
- Complete data snapshots stored for each version
- Field-level change tracking and version restoration
- Database triggers for automated history capture

**Diff Analysis Engine:**

- Pure client-side character-level diffing using Myers O(ND) algorithm
- 100% exact implementation from jsdiff library (https://github.com/kpdecker/jsdiff)
- Real-time local processing with instant results
- Complete support for ignoreCase, oneChangePerToken, timeout, and maxEditLength options
- No server dependencies - fully offline capable

**User Interface:**

- Dual version comparison with side-by-side view
- Visual diff highlighting with color coding
- Interactive timeline browser
- One-click version restoration

---

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Yarn](https://yarnpkg.com/) (v3.x)

### Installation

1.  **Clone the repository:**

    ```sh
    git clone <repository-url>
    cd PharmaSys
    ```

2.  **Install dependencies:**

    ```sh
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the project root by copying the example file:

    ```sh
    cp .env.example .env
    ```

    You need to fill with your Supabase project credentials and Redis configuration.

4.  **Run the development server:**
    This command starts the Vite development server and Tailwind CSS watcher simultaneously.
    ```sh
    yarn dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

---

## Available Scripts

The `package.json` file includes several scripts to help with development:

- `yarn dev`: Starts the application in development mode with hot-reloading.
- `yarn build`: Compiles and bundles the application for production.
- `yarn preview`: Serves the production build locally for preview.
- `yarn lint`: Runs ESLint to check for code quality and style issues.

### Utility Scripts

These scripts interact with the backend and require `tsx` to run.

- `yarn add-admin`: CLI script to create a new admin user.
- `yarn update-password`: CLI script to update user password.
- `yarn export`: CLI script to export data.

For help with these scripts, you can run `yarn <script-name>:help`.

---

## Project Structure

The source code follows feature-based organization with Clean Architecture principles.

```
src/
├── components/      # Reusable UI components
├── hooks/           # Global custom React hooks
├── layout/          # Main application layout
├── lib/             # Library configurations
├── pages/           # Page components by feature
├── services/        # API logic for Supabase
├── store/           # Zustand state management
├── types/           # Global TypeScript definitions
├── utils/           # Global utility functions
└── features/        # Feature modules
    └── item-management/  # Entity management with version control
        ├── domain/       # Business logic (entities, use-cases)
        ├── application/  # Hooks (core, entity, form, ui, utils)
        ├── presentation/ # UI components (atoms, molecules, organisms, templates)
        └── shared/       # Contexts, types, utilities
```

**Architecture Benefits:**

- Clean separation of concerns
- Atomic design component hierarchy
- Testable business logic
- Scalable feature organization
