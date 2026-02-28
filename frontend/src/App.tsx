/**
 * App component serves as the main entry point for the Logistics Control Tower dashboard.
 * It sets up the overall layout of the application using Ant Design's Layout components, including a sidebar for navigation and a header for the dashboard title.
 * The content area is managed using React Router's Routes and Route components to render different pages based on the URL path.
 * Authentication is now handled via AuthContext, and all dashboard routes are protected by ProtectedRoute wrapper.
 * The layout is designed to be responsive and visually appealing, with a consistent color scheme and spacing throughout the application.
 */
import { Layout } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppSidebar from "./layout/AppSidebar";
import AppHeader from "./layout/AppHeader";

import Login from "./pages/Login";
import DashboardHome from "./pages/DashboardHome";
import OperationsView from "./pages/OperationsView";
import VendorManagement from "./pages/VendorManagement";
import Documents from "./pages/Documents";
import Analytics from "./pages/Analytics";
import Chatbot from "./components/Chatbot";

const { Sider, Header, Content } = Layout;

// Main layout wrapper for authenticated pages - wraps each page with sidebar and header
function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) return null; // Should never happen due to ProtectedRoute, but TypeScript needs this

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <Sider
        width={280}
        theme="dark"
        collapsible={false}
        trigger={null}
        style={{
          background: "#0f1115",
          height: "100vh",
          position: "fixed",
          left: 0,
          overflow: "hidden"
        }}
      >
        <AppSidebar role={user.role_code} user={user} />
      </Sider>

      <Layout style={{ background: "#f5f7fa", marginLeft: 280 }}>
        <Header
          style={{
            background: "#fff",
            padding: "12px 20px",
            height: "auto",
            lineHeight: "normal",
            borderBottom: "1px solid #e9edf3",
          }}
        >
          <AppHeader user={user} />
        </Header>

        <Content style={{ padding: 20, background: "#f5f7fa", minHeight: "calc(100vh - 64px)" }}>
          {children}
        </Content>
      </Layout>
      <Chatbot />
    </Layout>
  );
}

// Define the main App component which sets up routing with authentication
export default function App() {
  return (
    <Routes>
      {/* Public route: Login page */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes: All dashboard pages require authentication */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
        <Route path="/operations" element={<DashboardLayout><OperationsView /></DashboardLayout>} />
        <Route path="/vendors" element={<DashboardLayout><VendorManagement /></DashboardLayout>} />
        <Route path="/documents" element={<DashboardLayout><Documents /></DashboardLayout>} />
        <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
