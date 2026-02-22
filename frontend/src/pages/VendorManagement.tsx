/**
 * VendorManagement page component for the Logistics Control Tower dashboard.
 * This page displays a list of vendors in a table format, allowing users to view key information such as vendor code, name, location, and status.
 * The data is fetched from the backend API and displayed using Ant Design's Table component for a clean and organized presentation.
 * The page also includes a section for a vendor scorecard, which can be expanded in the future to show detailed performance metrics for each vendor.
 */
import { Card, Table, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { api } from "../api/client";


type VendorRow = {
    id: number;
    vendor_code: string;
    name: string;
    city?: string;
    state?: string;
    is_active: number;
    updated_ts: string;
};

// Helper function to render active status with color-coded tags
export default function VendorManagement() {
    const [vendors, setVendors] = useState<VendorRow[]>([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setLoading(true);
        api
            .get("/api/vendors")
            .then((res) => {
                setVendors(res.data);
            })
            .catch((err) => {
                console.error("Failed to fetch vendors:", err);
            })
            .finally(() => {
            setLoading(false);
        });
    }, []);

    // Define columns for the vendors table
    const columns: ColumnsType<VendorRow> = [
        { title: "ID", dataIndex: "id", key: "id", width: 80 },
        { title: "Vendor Code", dataIndex: "vendor_code", key: "vendor_code", width: 140 },
        { title: "Name", dataIndex: "name", key: "name", width: 220 },
        { title: "City", dataIndex: "city", key: "city", width: 140 },
        { title: "State", dataIndex: "state", key: "state", width: 140 },
        { title: "Active", dataIndex: "is_active", key: "is_active", width: 90 },
        { title: "Updated", dataIndex: "updated_ts", key: "updated_ts", width: 180 },
    ];

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                    Vendor Management
                </Typography.Title>

                <Typography.Text type="secondary">Vendor Performance Overview</Typography.Text>
            </Space>

            <Card title="Vendors">
                <Table<VendorRow>
                    rowKey="id"
                    columns={columns}
                    dataSource={vendors}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1000 }}
                    locale={{ emptyText: "No vendors loaded yet" }}
                />
            </Card>

            <Card title="Vendor Scorecard">
                <Typography.Text type="secondary">
                    Select a vendor to view detailed performance metrics
                </Typography.Text>
            </Card>
        </Space>
    );
}
