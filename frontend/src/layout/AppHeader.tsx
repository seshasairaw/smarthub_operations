/**
 * AppHeader component serves as the header for the Logistics Control Tower dashboard.
 * It displays the title of the dashboard and the authenticated user's name on the right side.
 * The header is styled using Ant Design's Space and Typography components to ensure a clean and professional look.
 * The title is prominently displayed with a larger font size and bold weight, while the subtitle provides additional context in a smaller, lighter font.
 * The user name is displayed on the right side in a secondary text style.
 */
import { Space, Typography } from "antd";
import type { User } from "../context/AuthContext";

type Props = {
  user: User;
};

export default function AppHeader({ user }: Props) {
  return (
    <Space style={{ width: "100%", justifyContent: "space-between" }}>
      <div>
        <Typography.Text style={{ fontSize: 16, fontWeight: 800, color: "#0b1b2b" }}>
          Logistics Control Tower
        </Typography.Text>
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
          Operations & Visibility Dashboard
        </div>
      </div>

      <Typography.Text type="secondary">
        {user.first_name} {user.last_name}
      </Typography.Text>
    </Space>
  );
}