/**
 * Documents page component for the Logistics Control Tower dashboard.
 * Allows users to search for Proof of Delivery (POD) documents by AWB number.
 * Displays matching shipment details with POD availability status and an inline PDF viewer.
 */
import { useState } from "react";
import { Card, Space, Typography, Form, Input, Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { api } from "../api/client";

type ShipmentResult = {
    id: number;
    awb_number: string;
    origin_city: string;
    destination_city: string;
    current_status: string;
    pod_document_url: string | null;
    pod_upload_timestamp: string | null;
};

export default function Documents() {
    const [form] = Form.useForm();
    const [results, setResults] = useState<ShipmentResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

    const handleSearch = (values: { awb_number: string }) => {
        setLoading(true);
        setSelectedPdfUrl(null);
        api.get("/api/pod/search", { params: { q: values.awb_number } })
            .then((res) => setResults(res.data))
            .catch((err) => console.error("POD search failed", err))
            .finally(() => setLoading(false));
    };

    const handleReset = () => {
        form.resetFields();
        setResults([]);
        setSelectedPdfUrl(null);
    };

    const handleViewPdf = (record: ShipmentResult) => {
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        setSelectedPdfUrl(`${baseUrl}/pod_docs/${record.pod_document_url}`);
    };

    const columns: ColumnsType<ShipmentResult> = [
        { title: "Shipment ID", dataIndex: "id", key: "id", width: 120 },
        { title: "AWB Number", dataIndex: "awb_number", key: "awb_number", width: 140 },
        { title: "Origin", dataIndex: "origin_city", key: "origin_city", width: 130 },
        { title: "Destination", dataIndex: "destination_city", key: "destination_city", width: 130 },
        { title: "Status", dataIndex: "current_status", key: "current_status", width: 140 },
        {
            title: "POD Status",
            key: "pod_status",
            width: 120,
            render: (_, record) =>
                record.pod_document_url ? (
                    <Tag color="green">AVAILABLE</Tag>
                ) : (
                    <Tag color="orange">PENDING</Tag>
                ),
        },
        {
            title: "Action",
            key: "action",
            width: 110,
            render: (_, record) =>
                record.pod_document_url ? (
                    <Button type="primary" size="small" onClick={() => handleViewPdf(record)}>
                        View PDF
                    </Button>
                ) : null,
        },
    ];

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                    Documents
                </Typography.Title>
                <Typography.Text type="secondary">POD Search & Viewer</Typography.Text>
            </Space>

            {/* Search */}
            <Card title="POD Search">
                <Form form={form} layout="vertical" onFinish={handleSearch}>
                    <Form.Item
                        label="AWB Number"
                        name="awb_number"
                        rules={[{ required: true, message: "Please enter an AWB number" }]}
                    >
                        <Input placeholder="e.g. AWB-88912" style={{ maxWidth: 360 }} />
                    </Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Search
                        </Button>
                        <Button onClick={handleReset}>Reset</Button>
                    </Space>
                </Form>
            </Card>

            {/* Results */}
            <Card title="Search Results">
                <Table<ShipmentResult>
                    rowKey="id"
                    columns={columns}
                    dataSource={results}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 900 }}
                    locale={{ emptyText: "No documents found. Enter an AWB number above to search." }}
                />
            </Card>

            {/* Document Viewer */}
            <Card title="Document Viewer">
                {selectedPdfUrl ? (
                    <iframe
                        src={selectedPdfUrl}
                        width="100%"
                        height="700px"
                        style={{ border: "none" }}
                        title="POD Document"
                    />
                ) : (
                    <Typography.Text type="secondary">
                        Select a POD record to preview the document
                    </Typography.Text>
                )}
            </Card>
        </Space>
    );
}
