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
-   **Performance Optimized:** Built with code-splitting and lazy loading to ensure fast loading times.
---

## Tech Stack

<div align="center">

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Yarn](https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![React Query](https://img.shields.io/badge/-React%20Query-FF4154?style=for-the-badge&logo=react%20query&logoColor=white)
![Framer](https://img.shields.io/badge/Framer-black?style=for-the-badge&logo=framer&logoColor=blue)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

</div>

This project is built with:

-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Linter:** [ESLint](https://eslint.org/)
-   **Library:** [React](https://react.dev/)
-   **Package Manager:** [Yarn](https://www.yarnpkg.com/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Schema Validation:** [Zod](https://zod.dev/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Data Grid:** [AG Grid](https://ag-grid.com/)
-   **Routing:** [React Router DOM](https://reactrouter.com/)
-   **Data Fetching & Caching:** [TanStack Query](https://tanstack.com/query/latest)
-   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
-   **Animation:** [Framer Motion](https://www.framer.com/motion/)
-   **Database:** [Supabase](https://supabase.com/database)
-   **Serverless Backend:** [Supabase Edge Functions](https://supabase.com/edge-functions)
-   **Storage:** [Supabase Storage](https://supabase.com/storage)

---

## Supabase Integration

PharmaSys leverages the full power of [Supabase](https://supabase.com/) as its backend, providing a scalable and integrated solution.

-   **Database:** PostgreSQL database for storing all application data, from master data (items, suppliers) to transactional data (purchases, sales).
-   **Authentication:** Manages user authentication and authorization, ensuring secure access to the application.
-   **Realtime:** This feature is at the core of the application's collaborative nature.
    -   **Live Data Sync:** The application subscribes to `postgres_changes` events from the Supabase Realtime API. When users create, update, or delete data, the backend notifies all connected clients.
    -   **Automatic UI Updates:** Custom React hooks (`useRealtimeSubscription`) receive these events and automatically invalidate relevant data cache in TanStack Query. This triggers smooth and efficient refetching, ensuring the UI always reflects the latest database state without manual refresh.
    -   **User Presence:** The same Realtime channel is used to track which users are currently active in the application, displaying online user count in real-time.
-   **Storage:** Used for handling file uploads, specifically for invoice images that are then processed.
-   **Edge Functions:** Serverless functions that execute complex backend logic. Main functions include:
    -   `extract-invoice`: Processes uploaded invoice images to extract data.
    -   `confirm-invoice`: Stores extracted invoice data to the database.
    -   `regenerate-invoice`: Reprocesses existing invoices from storage.
    -   `metrics`: Collects and reports function usage and performance.

### Database Migrations

All database schema changes (e.g., adding tables or columns) are managed through manual SQL migration scripts. It's important to write these scripts defensively using `IF NOT EXISTS` or similar checks to prevent errors in different environments. Apply these scripts directly through the Supabase SQL Editor.

**Important:** The `supabase/**` directory is used for data export and local development state; it should not be modified directly for schema migrations.

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
    You need to fill this file with your Supabase project credentials.
    ```ini
    # .env
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```

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
