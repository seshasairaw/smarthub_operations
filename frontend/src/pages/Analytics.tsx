/**
 * Analytics component serves as a placeholder for the analytics dashboard in the Logistics Control Tower application.
 * It displays a title and a subtitle, along with a card that indicates where the Kibana dashboard will be embedded in the future.
 * The component is styled using Ant Design's Space, Typography, and Card components to maintain consistency with the overall design of the application.
 * Currently, it does not fetch or display any real analytics data, but it sets up the structure for integrating an embedded Kibana dashboard in the future.
 */
import { Card, Space, Typography } from "antd";

export default function Analytics() {
    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                    Analytics
                </Typography.Title>

                <Typography.Text type="secondary">
                    Embedded Operational Dashboards
                </Typography.Text>
            </Space>
        
            <Card title="Logistics Analytics Dashboard">
                <div
                    style={{
                        height: "600px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px dashed #d9d9d9",
                        color: "#8c8c8c",
                    }}
                >
                Kibana Dashboard will be embedded here
                </div>
            </Card>
        </Space>
    );
}
