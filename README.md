# PharmaSys - Pharmacy & Clinic Management System

PharmaSys is a modern, web-based application designed to streamline the operational management of pharmacies and clinics. It provides a comprehensive suite of tools for managing master data, purchases, inventory, sales, and more, all within a user-friendly interface.

## ✨ Key Features

-   **📊 Interactive Dashboard:** Get a quick overview of key metrics and activities.
-   **🗃️ Master Data Management:** Centralized control over essential data:
    -   Items, Categories, Units, and Types
    -   Suppliers, Patients, and Doctors
-   **🛒 Purchase Management:**
    -   Automated invoice data extraction from images.
    -   Manage purchase orders and track their status.
    -   View and print purchase details.
-   **🔐 Authentication:** Secure login for authorized personnel.
-   **👤 User Profile Management:** Users can manage their own profile information.
-   **🔄 Real-time Data Synchronization:** Data is automatically updated across all active user sessions. When one user makes a change, others see the update instantly without needing to refresh the page. This is coupled with a user presence feature to show who is currently online.
-   **📱 Responsive Design:** Fully accessible on both desktop and mobile devices.
-   **⚡ Performance Optimized:** Built with code-splitting and lazy loading to ensure fast load times.

*(Note: Some features like Inventory, Sales, Clinic, and Reports are currently under development as indicated by "Coming Soon" pages.)*

---

## 🚀 Tech Stack

This project is built with a modern and robust technology stack:

-   **Library:** [React](https://react.dev/)
-   **Build Tool:** [Vite](https://vitejs.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database:** [Supabase](https://supabase.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Routing:** [React Router DOM](https://reactrouter.com/)
-   **Data Fetching & Caching:** [TanStack Query](https://tanstack.com/query/latest)
-   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
-   **UI Components:** [Headless UI](https://headlessui.com/)
-   **Charting:** [Chart.js](https://www.chartjs.org/) with [react-chartjs-2](https://react-chartjs-2.js.org/)
-   **Icons:** [React Icons](https://react-icons.github.io/react-icons)

---

## 🔗 Supabase Integration

PharmaSys leverages the full power of [Supabase](https://supabase.com/) as its backend, providing a scalable and integrated solution.

-   **Database:** PostgreSQL database for storing all application data, from master data (items, suppliers) to transactional data (purchases, sales).
-   **Authentication:** Manages user authentication and authorization, ensuring secure access to the application.
-   **Realtime:** This feature is at the core of the application's collaborative nature.
    -   **Live Data Sync:** The application subscribes to `postgres_changes` events from the Supabase Realtime API. When a user creates, updates, or deletes data, the backend notifies all connected clients.
    -   **Automatic UI Updates:** A custom React hook (`useRealtimeSubscription`) receives these events and automatically invalidates the relevant data caches in TanStack Query. This triggers a seamless and efficient refetch, ensuring the UI always reflects the latest database state without requiring a manual refresh.
    -   **User Presence:** The same Realtime channels are used to track which users are currently active in the application, displaying a live count of online users.
-   **Storage:** Utilized for handling file uploads, particularly for invoice images that are later processed.
-   **Edge Functions:** Serverless functions that run complex backend logic. Key functions include:
    -   `extract-invoice`: Processes uploaded invoice images to extract data.
    -   `confirm-invoice`: Saves the extracted invoice data into the database.
    -   `regenerate-invoice`: Re-processes an existing invoice from storage.
    -   `metrics`: Gathers and reports on function usage and performance.

### Database Migrations

All database schema changes (e.g., adding tables or columns) are managed through manual SQL migration scripts. It is crucial to write these scripts defensively using `IF NOT EXISTS` or similar checks to prevent errors in different environments. Apply these scripts directly via the Supabase SQL Editor.

**Important:** The `supabase/**` directory is used for data exports and local development state; it should not be modified directly for schema migrations.

---

## 🛠️ Getting Started

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
    Create a `.env` file in the root of the project by copying the example file:
    ```sh
    cp .env.example .env
    ```
    You will need to populate this file with your Supabase project credentials.
    ```ini
    # .env
    VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```

4.  **Run the development server:**
    This command starts the Vite development server and the Tailwind CSS watcher concurrently.
    ```sh
    yarn dev
    ```
    The application will be available at `http://localhost:5173` (or the next available port).

---

## 📜 Available Scripts

The `package.json` file includes several scripts to help with development:

-   `yarn dev`: Starts the application in development mode with hot-reloading.
-   `yarn build`: Compiles and bundles the application for production.
-   `yarn preview`: Serves the production build locally to preview it.
-   `yarn lint`: Runs ESLint to check for code quality and style issues.

### Utility Scripts

These scripts interact with the backend and require `tsx` to run.

-   `yarn add-admin`: A CLI script to create a new admin user.
-   `yarn update-password`: A CLI script to update a user's password.
-   `yarn export`: A CLI script to export data.

For help with these scripts, you can run `yarn <script-name>:help`.

---

## 📂 Project Structure

The source code is located in the `src/` directory and follows a feature-based organization.

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
