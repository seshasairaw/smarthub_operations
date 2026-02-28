/**
 * AppSidebar component renders a sidebar navigation menu for the Logistics Control Tower dashboard.
 * It displays different menu items based on the user's role, allowing for role-based access control.
 * The sidebar includes a header with the dashboard title and a footer with user information and role display.
 * The menu items are defined with icons and paths, and clicking on them navigates to the corresponding routes using React Router's useNavigate hook.
 * The selected menu item is highlighted based on the current URL path, providing visual feedback to the user about their current location in the app.
 */
import React, { useMemo } from "react";
import { Menu, Avatar, Typography, Button, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
    DashboardOutlined,
    DeploymentUnitOutlined,
    TeamOutlined,
    FileSearchOutlined,
    BarChartOutlined,
    UserOutlined,
    LogoutOutlined,
} from "@ant-design/icons";
import { useAuth, type User } from "../context/AuthContext";


type Role = "SUPER_ADMIN" | "OPS_MANAGER" | "VENDOR_USER" | "ANALYST";
type Props = {
    role: Role | string;
    user: User;
};

type Item = { key: string; label: string; icon: React.ReactNode; path: string; roles: Role[] };

// Define the AppSidebar component which takes a user role as a prop and renders a sidebar with navigation items based on that role
export default function AppSidebar({ role, user }: Props) {
    const nav = useNavigate();
    const { pathname } = useLocation();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        nav('/login');
    };

    const items: Item[] = useMemo(
        () => [
            { key: "home", label: "Dashboard", icon: <DashboardOutlined />, path: "/", roles: ["SUPER_ADMIN","OPS_MANAGER","VENDOR_USER","ANALYST"] },
            { key: "ops", label: "Operations", icon: <DeploymentUnitOutlined />, path: "/operations", roles: ["SUPER_ADMIN","OPS_MANAGER"] },
            { key: "vendors", label: "Vendors", icon: <TeamOutlined />, path: "/vendors", roles: ["SUPER_ADMIN","VENDOR_USER"] },
            { key: "docs", label: "Documents", icon: <FileSearchOutlined />, path: "/documents", roles: ["SUPER_ADMIN","OPS_MANAGER","VENDOR_USER"] },
            { key: "analytics", label: "Analytics", icon: <BarChartOutlined />, path: "/analytics", roles: ["SUPER_ADMIN","ANALYST"] },
        ],
        [] // static items, no dependencies needed
    );
    
    const filtered = items.filter((i) => i.roles.includes(role as Role));
    const menuItems: MenuProps["items"] = filtered.map((i) => ({
        key: i.path,
        icon: i.icon,
        label: i.label,
        onClick: () => nav(i.path),
    }));

    const selectedKey = filtered.some((i) => i.path === pathname) ? pathname : "/"; // default to home if current path isn't in menu
    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                <Typography.Text style={{
                    color: "#ffffff",
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    fontSize: 16,}}>
                    Smart Operations Hub
                </Typography.Text>
            </div>

            <div style={{ flex: 1, padding: "8px 0", overflow: "auto" }}>
                <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems} />
            </div>

            <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar icon={<UserOutlined />} />
                    <div style={{ flex: 1, lineHeight: 1.1 }}>
                        <Typography.Text style={{ color: "#ffffff", fontWeight: 600 }}>
                            {user ? `${user.first_name} ${user.last_name}` : "User"}
                        </Typography.Text>
                        <br />
                        <Typography.Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                            {String(role)}
                        </Typography.Text>
                    </div>
                    <Tooltip title="Logout">
                        <Button
                            type="text"
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{ color: "rgba(255,255,255,0.65)" }}
                        />
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}