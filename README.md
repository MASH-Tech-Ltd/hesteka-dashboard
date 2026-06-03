# EmmaFVE Admin Dashboard

EmmaFVE Admin Dashboard is a comprehensive and modern administrative interface built with React, Vite, and Tailwind CSS. It is designed to manage various aspects of the EmmaFVE platform, providing features for user management, analytics, content administration, and real-time operations.

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
emmafveAdminDashboard/
├── public/                 # Static assets
└── src/
    ├── components/         # Reusable React components
    │   ├── common/         # Generic UI components (Modals, Tables, Pagination, etc.)
    │   ├── dashboard/      # Dashboard-specific components (Cards, Sidebar, Topbar)
    │   └── ...             # Chat and layout-specific components
    ├── context/            # React Context providers (Language, API Cache, Socket)
    ├── layouts/            # Application layout wrappers (e.g., DashboardLayout)
    ├── pages/              # Application screens and routes
    │   ├── AnalyticsPage, DashboardPage, UsersPage,
    │   ├── ContactsPage, CrowdfundingPage, DonationsPage,
    │   └── ... (and more modular pages)
    ├── utils/              # Utility functions and API configuration (e.g., api.js)
    ├── App.jsx             # Main application component & routing setup
    ├── main.jsx            # React application entry point
    ├── firebase.js         # Firebase configuration and initialization
    └── socket.js           # Socket.io connection setup
```

## 🛠️ Key Features

- **Comprehensive Dashboard:** Real-time metrics and activity monitoring with interactive charts.
- **User Management:** View, manage, and track users across the platform.
- **Content Administration:** Manage FAQs, Contacts, Missions, Partners, and Physical Items.
- **Donation & Crowdfunding:** Track and validate donations and crowdfunding campaigns.
- **Analytics & Reporting:** Detailed reports and analytics for platform activities.
- **Real-time Notifications:** Integrated Firebase Cloud Messaging (FCM) and WebSocket events.
- **Multi-language Support:** Built-in context for language localization.
- **Interactive Maps:** Collection points and activity tracking using interactive mapping tools.

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project folder:
   ```bash
   cd emmafveAdminDashboard
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
