# HESTEKA Admin Dashboard

Developed by **MASH TECH**

HESTEKA Admin Dashboard is a comprehensive and modern administrative interface built with React, Vite, and Tailwind CSS. It is designed to manage various aspects of the HESTEKA platform, providing features for user management, analytics, content administration, and real-time operations.

## 🚀 Technologies Used

- **Framework:** [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **State Management & Context:** React Context API
- **API & Data Fetching:** [Axios](https://axios-http.com/)
- **Real-time Communication:** [Socket.io Client](https://socket.io/)
- **Maps:** [React Leaflet](https://react-leaflet.js.org/) & Google Maps API
- **Charts:** [Recharts](https://recharts.org/)
- **Backend & Push Notifications:** [Firebase](https://firebase.google.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Toast Notifications:** [React Toastify](https://fkhadra.github.io/react-toastify/)

## 📁 Project Structure

The project follows a modular and scalable architecture:

```text
hestekaDashboard/
├── public/                 # Static assets
└── src/
    ├── components/         # Reusable React components
    │   ├── common/         # Generic UI components (Modals, Tables, Pagination, etc.)
    │   ├── dashboard/      # Dashboard-specific components (Cards, Sidebar, Topbar)
    │   └── ...             # Layout-specific components
    ├── context/            # React Context providers (Language, API Cache, Socket)
    ├── layouts/            # Application layout wrappers (e.g., DashboardLayout)
    ├── pages/              # Application screens and routes
    │   ├── AdminLoginPage, AnalyticsPage, CollectionPointsPage,
    │   ├── ContactsPage, CrowdfundingPage, DashboardPage,
    │   ├── DonationsPage, FAQPage, ForgotPasswordPage,
    │   ├── MissionsPage, NotificationsPage, PartnersPage,
    │   ├── PhysicalItemsPage, PointsPage, ReportsPage,
    │   ├── SettingsPage, ShopifyProductsPage, SupportMessagesPage,
    │   └── UsersPage, ValidationDonationsPage
    ├── utils/              # Utility functions and API configuration (e.g., api.js)
    ├── App.jsx             # Main application component & routing setup
    ├── main.jsx            # React application entry point
    ├── firebase.js         # Firebase configuration and initialization
    └── socket.js           # Socket.io connection setup
```

## 🛠️ Key Features

- **Comprehensive Dashboard:** Real-time metrics and activity monitoring with interactive charts.
- **User Management:** View, manage, and track users across the platform.
- **Content Administration:** Manage multilingual FAQs with nested content, Contacts, Missions, Partners, and Physical Items.
- **Partner Management:** Dedicated analytics and local mission management tools customized for partner accounts.
- **Donation & Crowdfunding:** Track and validate donations and crowdfunding campaigns.
- **Analytics & Reporting:** Detailed reports and analytics for platform activities.
- **Real-time Notifications:** Integrated Firebase Cloud Messaging (FCM) and WebSocket events.
- **Multi-language Support:** Built-in context for language localization (English/French).
- **Interactive Maps:** Collection points and activity tracking using interactive mapping tools with satellite view support.

## 🔒 Security & Performance

**Security:**
- **Route Protection:** Strict client-side route guards ensuring only authenticated users with specific roles (Admin vs. Partner) can access respective dashboard modules.
- **XSS & CSRF Mitigation:** React's built-in DOM sanitization combined with secure Axios interceptors that attach HttpOnly tokens securely without exposing them to XSS risks.
- **Data Validation:** Form submissions and inputs are strictly validated on the client side before any network requests are dispatched, reducing malicious payload risks.

**Performance:**
- **Optimized Rendering:** Built on **Vite**, offering near-instant Hot Module Replacement (HMR) during development and highly optimized rollup bundles for production.
- **State Management & Caching:** Global API responses are aggressively cached using custom Context APIs to prevent redundant network calls across paginated tables and maps.
- **Lazy Loading & Code Splitting:** Large components, dynamic routes, and heavy dependencies (like Maps and Charts) are lazily loaded to drastically reduce initial time-to-interactive.
- **Asset Optimization:** Integrated Cloudinary for serving perfectly scaled images instead of loading full-resolution assets, speeding up DataTable rendering.

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project folder:
   ```bash
   cd hestekaDashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Create a `.env` file in the root directory and fill in the necessary keys (Firebase, API URLs, etc.).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## 📜 Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the app for production.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run preview`: Locally previews the production build.
