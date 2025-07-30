# PharmaSys - Pharmacy and Clinic Management System

PharmaSys is a modern web-based application designed to streamline pharmacy and clinic operations. This comprehensive management system provides a complete suite of tools for managing master data, purchasing, inventory, sales, and more, all within an intuitive user interface.

## Key Features

-   **Interactive Dashboard:** Get a quick overview of key metrics and activities.
-   **Master Data Management:** Centralized control over essential data:
    -   Items, Categories, Units, and Types
    -   Suppliers, Patients, and Doctors
-   **Purchase Management:**
    -   Automatic invoice data extraction from images.
    -   Manage purchase orders and track their status.
    -   View and print purchase details.
-   **Authentication:** Secure login for authorized personnel.
-   **User Profile Management:** Users can manage their own profile information.
-   **Real-time Data Synchronization:** Data is automatically updated across all active user sessions. When one user makes changes, others see updates instantly without needing to refresh the page. This is combined with user presence features to show who is currently online.
-   **Advanced Version Control & Comparison:** Intelligent history tracking with smart diff algorithms for comparing different versions of data entries. Features adaptive text comparison that automatically chooses between character-level and word-level diff based on content context.
-   **Performance Optimized:** Built with code-splitting and lazy loading to ensure fast loading times, enhanced with Redis caching for server-side operations.
---

## Tech Stack

<div align="center">

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
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

-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Linter:** [ESLint](https://eslint.org/)
-   **Library:** [React](https://react.dev/)
-   **Package Manager:** [Yarn](https://www.yarnpkg.com/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Compiler:** [SWC](https://swc.rs/) (via @vitejs/plugin-react-swc)
-   **Schema Validation:** [Zod](https://zod.dev/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **CSS Utilities:** [classnames](https://github.com/JedWatson/classnames)
-   **Data Grid:** [AG Grid](https://ag-grid.com/)
-   **Routing:** [React Router DOM](https://reactrouter.com/)
-   **Data Fetching & Caching:** [TanStack Query](https://tanstack.com/query/latest)
-   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
-   **Animation:** [Framer Motion](https://www.framer.com/motion/)
-   **Database:** [Supabase](https://supabase.com/database)
-   **Serverless Backend:** [Supabase Edge Functions](https://supabase.com/edge-functions)
-   **Storage:** [Supabase Storage](https://supabase.com/storage)
-   **Server Side Caching:** [Upstash Redis](https://upstash.com/)

---

## Supabase Integration

PharmaSys leverages the full power of [Supabase](https://supabase.com/) as its backend, providing a scalable and integrated solution.

-   **Database:** PostgreSQL database for storing all application data, from master data (items, suppliers) to transactional data (purchases, sales).
-   **Authentication:** Manages user authentication and authorization, ensuring secure access to the application.
-   **User Presence:** Uses Supabase Realtime to track which users are currently active in the application, displaying online user count in real-time.
-   **Storage:** Used for handling file uploads, specifically for invoice images that are then processed.
-   **Edge Functions:** Serverless functions that execute complex backend logic. Main functions include:
    -   `extract-invoice`: Processes uploaded invoice images to extract data.
    -   `confirm-invoice`: Stores extracted invoice data to the database.
    -   `regenerate-invoice`: Reprocesses existing invoices from storage.
    -   `diff-analyzer`: Performs intelligent text comparison with smart adaptive algorithms, supporting both character-level and word-level diff with Redis caching for performance.
    -   `metrics`: Collects and reports function usage and performance.

### Database Migrations

All database schema changes (e.g., adding tables or columns) are managed through manual SQL migration scripts. It's important to write these scripts defensively using `IF NOT EXISTS` or similar checks to prevent errors in different environments. Apply these scripts directly through the Supabase SQL Editor.

**Important:** The `supabase/**` directory is used for data export and local development state; it should not be modified directly for schema migrations.

### Diff Analyzer & Caching System

The application includes an advanced text comparison system powered by server-side processing and Redis caching:

-   **Smart Adaptive Algorithm:** Automatically chooses between character-level and word-level diff based on content analysis (abbreviation expansions, punctuation changes, number/unit changes, word replacements).
-   **Server-side Processing:** The `diff-analyzer` edge function handles complex text comparison operations with optimized performance.
-   **Redis Caching:** Upstash Redis provides high-performance caching for diff results, reducing computation time for repeated comparisons.
-   **Client-side Fallback:** If server-side processing fails, the application gracefully falls back to client-side diff computation.
-   **Pattern Detection:** Intelligent detection of different text change patterns to optimize highlighting accuracy.

This system is primarily used in the item management module for version comparison and history tracking.

---

## Getting Started

Follow these instructions to get a local copy up and running for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or newer recommended)
-   [Yarn](https://yarnpkg.com/) (v3.x)

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

-   `yarn dev`: Starts the application in development mode with hot-reloading.
-   `yarn build`: Compiles and bundles the application for production.
-   `yarn preview`: Serves the production build locally for preview.
-   `yarn lint`: Runs ESLint to check for code quality and style issues.

### Utility Scripts

These scripts interact with the backend and require `tsx` to run.

-   `yarn add-admin`: CLI script to create a new admin user.
-   `yarn update-password`: CLI script to update user password.
-   `yarn export`: CLI script to export data.

For help with these scripts, you can run `yarn <script-name>:help`.

---

## Project Structure

The source code is located in the `src/` directory and follows feature-based organization.

```
src/
├── components/      # Reusable UI components (Alerts, Dialogs, Loaders, etc.)
├── hooks/           # Custom React hooks
├── layout/          # Main application layout (sidebar, header)
├── lib/             # Library configurations (e.g., Supabase client)
├── pages/           # Page components, organized by feature
│   ├── auth/
│   ├── dashboard/
│   ├── master-data/
│   └── ...
├── services/        # API call logic for interacting with Supabase
├── store/           # Zustand state management stores
├── types/           # Global TypeScript type definitions
├── utils/           # Utility functions
├── App.css          # Main stylesheet for Tailwind CSS
├── App.tsx          # Root component with routing setup
└── main.tsx         # Application entry point
```
