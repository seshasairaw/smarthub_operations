/**
 * Documents page component for the Logistics Control Tower dashboard.
 * This page allows users to search for Proof of Delivery (POD) documents based on various criteria such as Shipment ID, AWB Number, and POD ID.
 * The search results are displayed in a table format, and users can select a record to preview the corresponding document.
 * The component is structured using Ant Design components for a clean and user-friendly interface.
 */
import { Card, Space, Typography, Form, Input, Button, Table, Row, Col } from "antd";
import type { ColumnsType } from "antd/es/table";

type PodRow = {
    pod_id: string;
    shipment_id: string;
    awb_number: string;
    doc_status: "AVAILABLE" | "PENDING" | "MISSING"; // Example statuses for demonstration
    uploaded_at: string;
};

export default function Documents() {
    const columns: ColumnsType<PodRow> = [
        { title: "POD ID", dataIndex: "pod_id", key: "pod_id", width: 140 },
        { title: "Shipment ID", dataIndex: "shipment_id", key: "shipment_id", width: 160 },
        { title: "AWB Number", dataIndex: "awb_number", key: "awb_number", width: 140 },
        { title: "Status", dataIndex: "doc_status", key: "doc_status", width: 140 },
        { title: "Uploaded At", dataIndex: "uploaded_at", key: "uploaded_at", width: 180 },
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
                <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item label="Shipment ID" name="shipment_id">
                                <Input placeholder="e.g. SHP-10492" />
                            </Form.Item>
                        </Col>

                        <Col span={8}>
                            <Form.Item label="AWB Number" name="awb_number">
                                <Input placeholder="e.g. AWB-88912" />
                            </Form.Item>
                        </Col>

                        <Col span={8}>
                            <Form.Item label="POD ID" name="pod_id">
                                <Input placeholder="e.g. POD-55201" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Space>
                        <Button type="primary">Search</Button>
                        <Button>Reset</Button>
                    </Space>
                </Form>
            </Card>
            
            {/* Results + Viewer */}
            <Card title="Search Results">
                <Table<PodRow> // Note: Data fetching and state management for search results will be implemented in the future
                    rowKey="pod_id"
                    columns={columns}
                    dataSource={[]}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                    locale={{ emptyText: "No documents loaded yet" }}
                />
            </Card>

            <Card title="Document Viewer">
                <Typography.Text type="secondary">
                    Select a POD record to preview the document
                </Typography.Text>
            </Card>
        </Space>
    );
}
