/**
 * OperationsView component serves as the main dashboard for monitoring shipment operations in the Logistics Control Tower.
 * It displays a table of shipments with their current status, a list of live exception alerts, and a map showing hub statuses.
 * The component fetches data from the backend API for shipments, exceptions, and hubs, and updates the UI accordingly.
 * The shipment table includes pagination and scrollable content to handle large datasets, while the exception alerts and hub statuses are displayed in separate cards for easy visibility.
 * The map provides a visual representation of hub locations and their operational status, aiding in quick decision-making for operations teams.
 */
import { useEffect, useState } from "react";
import { Card, Table, Tag, Space, Typography, List, Col, Row } from "antd";
import type { ColumnsType } from "antd/es/table";
import OperationsMap from "../components/OperationsMap";
import { api } from "../api/client";

type ShipmentRow = {
    shipment_id: number;
    awb_number: string;
    origin: string | null;
    destination: string | null;
    shipment_status: string | null;
    current_hub_code: string | null;
    vendor_id: number | null;
    eta: string | null;
    last_updated_ts: string | null;
};

type ExceptionRow = {
    shipment_id: number;
    message: string | null;
    exception_type: string | null;
    raised_at: string | null;
};

type HubRow = {
    hub_code: string;
    hub_name: string;
    status: "OPERATIONAL" | "CONGESTED" | "DOWN" | string;
    last_updated_ts: string | null;
};

// Helper function to render shipment status with color-coded tags
function statusTag(status?: string | null) {
    if (status === "DELIVERED") return <Tag color="green">DELIVERED</Tag>;
    if (status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY") return <Tag color="blue">IN TRANSIT</Tag>;
    if (status === "DELAYED") return <Tag color="gold">DELAYED</Tag>;
    if (!status) return <Tag>—</Tag>;
    return <Tag color="red">{status}</Tag>;
}


function exceptionTypeTag(t?: string | null) {
    if (!t) return <Tag color="red">EXCEPTION</Tag>;
    if (t === "DELAY") return <Tag color="gold">DELAY</Tag>;
    if (t === "DAMAGE") return <Tag color="volcano">DAMAGE</Tag>;
    if (t === "TEMP_BREACH") return <Tag color="blue">TEMP</Tag>;
    if (t === "ADDRESS_ISSUE") return <Tag color="default">ADDRESS</Tag>;
    return <Tag color="red">{t}</Tag>;
}

export default function OperationsView() {
    const [shipments, setShipments] = useState<ShipmentRow[]>([]);
    const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
    const [hubs, setHubs] = useState<HubRow[]>([]);

    const [loadingShipments, setLoadingShipments] = useState(false);
    const [loadingExceptions, setLoadingExceptions] = useState(false);
    const [loadingHubs, setLoadingHubs] = useState(false);

    const ROW_HEIGHT = 54; // adjust if rows are taller
    const VISIBLE_ROWS = 10;  
    useEffect(() => {

        setLoadingShipments(true);
        api
            .get("/api/shipments?limit=200")
            .then((res) => setShipments(res.data))
            .catch((err) => console.error("Failed to fetch shipments:", err))
            .finally(() => setLoadingShipments(false));
        setLoadingExceptions(true);

        api
            .get("/api/exceptions/live?limit=20")
            .then((res) => setExceptions(res.data))
            .catch((err) => console.error("Failed to fetch exceptions:", err))
            .finally(() => setLoadingExceptions(false));
        setLoadingHubs(true);

        api
            .get("/api/hubs/status?limit=50")
            .then((res) => setHubs(res.data))
            .catch((err) => console.error("Failed to fetch hubs:", err))
            .finally(() => setLoadingHubs(false));

    }, []);

  const columns: ColumnsType<ShipmentRow> = [
    { title: "Shipment ID", dataIndex: "shipment_id", key: "shipment_id", width: 120 },
    { title: "AWB Number", dataIndex: "awb_number", key: "awb_number", width: 160 },
    { title: "Origin", dataIndex: "origin", key: "origin", width: 140 },
    { title: "Destination", dataIndex: "destination", key: "destination", width: 140 },
    {
        title: "Current Status",
        dataIndex: "shipment_status",
        key: "shipment_status",
        width: 140,
        render: (v) => statusTag(v),
    },
    { title: "Current Hub", dataIndex: "current_hub_code", key: "current_hub_code", width: 120 },
    { title: "Vendor", dataIndex: "vendor_id", key: "vendor_id", width: 110 },
    { title: "ETA", dataIndex: "eta", key: "eta", width: 140 },
    { title: "Last Updated", dataIndex: "last_updated_ts", key: "last_updated_ts", width: 180 },
    ];

  return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                    Operations
                </Typography.Title>
                <Typography.Text type="secondary">Shipment Status Board</Typography.Text>
            </Space>

            <Card>
                <Table<ShipmentRow>
                    rowKey="shipment_id"
                    columns={columns}
                    dataSource={shipments}
                    loading={loadingShipments}
                    pagination={{ pageSize: 4, showSizeChanger: false }}
                    scroll={{ x: 1250, y: VISIBLE_ROWS * ROW_HEIGHT }}  // height for 10 rows
                    locale={{ emptyText: "No shipments loaded yet" }}
                />
            </Card>

            <Row gutter={12} style={{ marginTop: 12 }}>
                <Col span={12}>
                    <Card title="Live Exception Alerts">
                        <List
                            loading={loadingExceptions}
                            dataSource={exceptions}
                            locale={{ emptyText: "No exceptions loaded yet" }}
                            renderItem={(item) => (
                                <List.Item>
                                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                        <Space>
                                            {exceptionTypeTag(item.exception_type)}
                                            <Typography.Text strong>Shipment {item.shipment_id}</Typography.Text>
                                            <Typography.Text>{item.message || "-"}</Typography.Text>
                                        </Space>
                                        <Typography.Text type="secondary">{item.raised_at || ""}</Typography.Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                <Col span={12}>
                    <Card title="Hub Status Indicators">
                        <div
                            style={{
                                maxHeight: 190,
                                overflowY: "auto",
                                scrollBehavior: "smooth" // avoids scrollbar overlapping content
                            }}
                            >
                            <List
                                loading={loadingHubs}
                                dataSource={hubs}
                                locale={{ emptyText: "No hub status data loaded yet" }}
                                renderItem={(hub) => (
                                    <List.Item>
                                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                            <Space>
                                                <Typography.Text strong>{hub.hub_code}</Typography.Text>
                                                <Typography.Text>{hub.hub_name}</Typography.Text>
                                            </Space>
                                            
                                            <Space>
                                                <Tag>{hub.status}</Tag>
                                                <Typography.Text type="secondary">
                                                    {hub.last_updated_ts || ""}
                                                </Typography.Text>
                                            </Space>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>
            
            <Card title="Network Map">
                <OperationsMap />
            </Card>
        </Space>
    );
}
