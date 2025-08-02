# PharmaSys - Pharmacy and Clinic Management System

PharmaSys is a modern web-based application designed to streamline pharmacy and clinic operations. This comprehensive management system provides a complete suite of tools for managing master data, purchasing, inventory, sales, and more, all within an intuitive user interface.

## Key Features

- **Interactive Dashboard:** Overview of key metrics and activities
- **Master Data Management:** Items, Categories, Units, Types, Suppliers, Patients, and Doctors
- **Purchase Management:** Invoice data extraction from images, purchase order tracking, and reporting
- **Authentication & User Management:** Secure login and profile management
- **Real-time Data Synchronization:** Live updates across user sessions with presence tracking
- **Version Control System:** Complete entity history tracking with versioning and restoration capabilities
- **Text Comparison Engine:** Advanced diff analysis with general pharmaceutical terminology support
- **Performance Optimized:** Code-splitting, lazy loading, and multi-layer caching (client + Redis)

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

- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Linter:** [ESLint](https://eslint.org/)
- **Code Formatter:** [Prettier](https://prettier.io/)
- **Library:** [React](https://react.dev/)
- **Package Manager:** [Yarn](https://www.yarnpkg.com/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Compiler:** [SWC](https://swc.rs/) (via @vitejs/plugin-react-swc)
- **Schema Validation:** [Zod](https://zod.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **CSS Utilities:** [classnames](https://github.com/JedWatson/classnames)
- **Data Grid:** [AG Grid](https://ag-grid.com/)
- **Routing:** [React Router DOM](https://reactrouter.com/)
- **Data Fetching & Caching:** [TanStack Query](https://tanstack.com/query/latest)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Animation:** [Framer Motion](https://www.framer.com/motion/)
- **Database:** [Supabase](https://supabase.com/database)
- **Serverless Backend:** [Supabase Edge Functions](https://supabase.com/edge-functions)
- **Storage:** [Supabase Storage](https://supabase.com/storage)
- **Server Side Caching:** [Upstash Redis](https://upstash.com/)

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
  - `diff-analyzer`: Text comparison with general pharmaceutical support and Redis caching
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

- Heuristic algorithm for optimal diff strategy selection (character vs word level)
- Pharmaceutical terminology support
- Pattern detection for abbreviations, numbers, punctuation, and typo corrections
- Server-side processing via `diff-analyzer` edge function
- Multi-layer caching: client-side + Redis with request deduplication

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
