/**
 * OperationsView component serves as the main dashboard for monitoring shipment operations.
 * - Status summary cards (Booked, Picked Up, In Transit, Out for Delivery, Delayed) with View More modals.
 * - Shipment Lookup: search by shipment ID to see full details (vendor, consignee, package, booking).
 * - Live Exception Alerts and Hub Status Indicators.
 * - Network Map.
 */
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Flex,
    Input,
    List,
    Modal,
    Row,
    Space,
    Spin,
    Statistic,
    Table,
    Tag,
    Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import OperationsMap from "../components/OperationsMap";
import { api } from "../api/client";

// ── Types ────────────────────────────────────────────────────────────────────

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

type SummaryData = {
    booked: number;
    picked_up: number;
    in_transit: number;
    out_for_delivery: number;
    delayed_shipments: number;
    exceptions: number;
    on_time_rate: number;
};

type ShipmentDetail = {
    shipment_id: number;
    awb_number: string | null;
    origin_city: string | null;
    destination_city: string | null;
    destination_state: string | null;
    destination_pincode: string | null;
    current_status: string | null;
    expected_delivery_date: string | null;
    actual_delivery_date: string | null;
    booking_date: string | null;
    has_exception: number | null;
    exception_type: string | null;
    exception_notes: string | null;
    consignee_name: string | null;
    consignee_address: string | null;
    product_type: string | null;
    description: string | null;
    weight_kg: number | null;
    number_of_boxes: number | null;
    service_type: string | null;
    booking_id: number | null;
    current_hub_code: string | null;
    current_hub_name: string | null;
    vendor_name: string | null;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusTag(status?: string | null) {
    if (status === "DELIVERED")        return <Tag color="green">DELIVERED</Tag>;
    if (status === "IN_TRANSIT")       return <Tag color="blue">IN TRANSIT</Tag>;
    if (status === "OUT_FOR_DELIVERY") return <Tag color="cyan">OUT FOR DELIVERY</Tag>;
    if (status === "DELAYED")          return <Tag color="gold">DELAYED</Tag>;
    if (status === "BOOKED")           return <Tag color="purple">BOOKED</Tag>;
    if (status === "PICKED_UP")        return <Tag color="geekblue">PICKED UP</Tag>;
    if (!status)                       return <Tag>—</Tag>;
    return <Tag color="red">{status}</Tag>;
}

function exceptionTypeTag(t?: string | null) {
    if (!t)                    return <Tag color="red">EXCEPTION</Tag>;
    if (t === "DELAY")         return <Tag color="gold">DELAY</Tag>;
    if (t === "DAMAGE")        return <Tag color="volcano">DAMAGE</Tag>;
    if (t === "TEMP_BREACH")   return <Tag color="blue">TEMP</Tag>;
    if (t === "ADDRESS_ISSUE") return <Tag color="default">ADDRESS</Tag>;
    return <Tag color="red">{t}</Tag>;
}

// Status cards config — order reflects the shipment lifecycle
const STATUS_CARDS = [
    { key: "BOOKED",           label: "Booked",           field: "booked" as keyof SummaryData,           color: "#722ed1" },
    { key: "PICKED_UP",        label: "Picked Up",        field: "picked_up" as keyof SummaryData,        color: "#2f54eb" },
    { key: "IN_TRANSIT",       label: "In Transit",       field: "in_transit" as keyof SummaryData,       color: "#1677ff" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", field: "out_for_delivery" as keyof SummaryData, color: "#08979c" },
    { key: "DELAYED",          label: "Delayed",          field: "delayed_shipments" as keyof SummaryData, color: "#d48806" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function OperationsView() {
    const [shipments, setShipments]               = useState<ShipmentRow[]>([]);
    const [summary, setSummary]                   = useState<SummaryData | null>(null);
    const [exceptions, setExceptions]             = useState<ExceptionRow[]>([]);
    const [hubs, setHubs]                         = useState<HubRow[]>([]);

    const [loadingShipments, setLoadingShipments] = useState(false);
    const [loadingSummary, setLoadingSummary]     = useState(false);
    const [loadingExceptions, setLoadingExceptions] = useState(false);
    const [loadingHubs, setLoadingHubs]           = useState(false);

    // View-More modal
    const [modalOpen, setModalOpen]     = useState(false);
    const [modalStatus, setModalStatus] = useState<string | null>(null);

    // Shipment lookup
    const [searchId, setSearchId]           = useState("");
    const [searchResult, setSearchResult]   = useState<ShipmentDetail | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError]     = useState<string | null>(null);

    useEffect(() => {
        setLoadingShipments(true);
        api.get("/api/shipments?limit=500")
            .then((res) => setShipments(res.data))
            .catch((err) => console.error("Failed to fetch shipments:", err))
            .finally(() => setLoadingShipments(false));

        setLoadingSummary(true);
        api.get("/api/shipments/summary")
            .then((res) => setSummary(res.data))
            .catch((err) => console.error("Failed to fetch summary:", err))
            .finally(() => setLoadingSummary(false));

        setLoadingExceptions(true);
        api.get("/api/exceptions/live?limit=20")
            .then((res) => setExceptions(res.data))
            .catch((err) => console.error("Failed to fetch exceptions:", err))
            .finally(() => setLoadingExceptions(false));

        setLoadingHubs(true);
        api.get("/api/hubs/status?limit=50")
            .then((res) => setHubs(res.data))
            .catch((err) => console.error("Failed to fetch hubs:", err))
            .finally(() => setLoadingHubs(false));
    }, []);

    // ── Handlers ────────────────────────────────────────────────────────────

    const openModal = (statusKey: string) => {
        setModalStatus(statusKey);
        setModalOpen(true);
    };

    const handleSearch = () => {
        const id = searchId.trim();
        if (!id) return;
        setSearchLoading(true);
        setSearchResult(null);
        setSearchError(null);
        api.get(`/api/shipments/${id}`)
            .then((res) => setSearchResult(res.data))
            .catch((err) => {
                if (err.response?.status === 404) {
                    setSearchError(`No shipment found with ID "${id}".`);
                } else {
                    setSearchError("Failed to fetch shipment details. Please try again.");
                }
            })
            .finally(() => setSearchLoading(false));
    };

    // ── Modal data ───────────────────────────────────────────────────────────

    const modalShipments = shipments.filter((s) => s.shipment_status === modalStatus);

    const modalLabel =
        STATUS_CARDS.find((c) => c.key === modalStatus)?.label ?? "";

    const modalColumns: ColumnsType<ShipmentRow> = [
        { title: "Shipment ID", dataIndex: "shipment_id",    key: "shipment_id",    width: 110 },
        { title: "AWB Number",  dataIndex: "awb_number",     key: "awb_number",     width: 150 },
        { title: "Origin",      dataIndex: "origin",         key: "origin",         width: 130 },
        { title: "Destination", dataIndex: "destination",    key: "destination",    width: 130 },
        { title: "Status",      dataIndex: "shipment_status",key: "shipment_status",width: 150, render: (v) => statusTag(v) },
        { title: "Hub",         dataIndex: "current_hub_code",key:"current_hub_code",width: 90 },
        { title: "ETA",         dataIndex: "eta",            key: "eta",            width: 140 },
    ];

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Flex vertical gap={16} style={{ width: "100%" }}>
            {/* Page header */}
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Operations</Typography.Title>
                <Typography.Text type="secondary">Shipment Status Board</Typography.Text>
            </Space>

            {/* ── Status summary cards ── */}
            <Row gutter={12}>
                {STATUS_CARDS.map(({ key, label, field, color }) => (
                    <Col flex="1" key={key}>
                        <Card style={{ textAlign: "center" }}>
                            <Statistic
                                title={label}
                                value={summary ? summary[field] : "—"}
                                loading={loadingSummary}
                                valueStyle={{ color }}
                            />
                            <Button
                                type="link"
                                style={{ paddingLeft: 0, marginTop: 8 }}
                                onClick={() => openModal(key)}
                            >
                                View More →
                            </Button>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ── View More modal ── */}
            <Modal
                title={`${modalLabel} Shipments`}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={940}
            >
                <Table<ShipmentRow>
                    rowKey="shipment_id"
                    columns={modalColumns}
                    dataSource={modalShipments}
                    loading={loadingShipments}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    scroll={{ x: 780 }}
                    locale={{ emptyText: "No shipments found" }}
                    size="small"
                />
            </Modal>

            {/* ── Shipment Lookup ── */}
            <Card title="Shipment Lookup">
                <Flex vertical gap={16} style={{ width: "100%" }}>
                    <Space.Compact style={{ width: "100%", maxWidth: 480 }}>
                        <Input
                            placeholder="Enter Shipment ID"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                        />
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={handleSearch}
                            loading={searchLoading}
                        >
                            Search
                        </Button>
                    </Space.Compact>

                    {searchLoading && <Spin />}

                    {searchError && (
                        <Alert type="warning" message={searchError} showIcon />
                    )}

                    {searchResult && (
                        <Flex vertical gap={12} style={{ width: "100%" }}>
                            {/* Shipment overview */}
                            <Descriptions
                                title={
                                    <Space>
                                        <span>Shipment {searchResult.shipment_id}</span>
                                        {statusTag(searchResult.current_status)}
                                    </Space>
                                }
                                bordered
                                size="small"
                                column={2}
                            >
                                <Descriptions.Item label="AWB Number">{searchResult.awb_number || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Current Hub">{searchResult.current_hub_name || searchResult.current_hub_code || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Origin">{searchResult.origin_city || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Expected Delivery">{searchResult.expected_delivery_date || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Actual Delivery">{searchResult.actual_delivery_date || "—"}</Descriptions.Item>
                                <Descriptions.Item label="Last Updated">{searchResult.last_updated_ts || "—"}</Descriptions.Item>
                                {searchResult.has_exception ? (
                                    <Descriptions.Item label="Exception" span={2}>
                                        <Space>
                                            {exceptionTypeTag(searchResult.exception_type)}
                                            <Typography.Text>{searchResult.exception_notes || "—"}</Typography.Text>
                                        </Space>
                                    </Descriptions.Item>
                                ) : null}
                            </Descriptions>

                            {/* Detail sections — 2 per row */}
                            <Row gutter={[12, 12]}>
                                <Col xs={24} md={12}>
                                    <Descriptions title="Vendor" bordered size="small" column={1}>
                                        <Descriptions.Item label="Vendor Name">{searchResult.vendor_name || "—"}</Descriptions.Item>
                                    </Descriptions>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Descriptions title="Booking" bordered size="small" column={1}>
                                        <Descriptions.Item label="Booking ID">{searchResult.booking_id || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Service Type">{searchResult.service_type || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Booking Date">{searchResult.booking_date || "—"}</Descriptions.Item>
                                    </Descriptions>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Descriptions title="Package" bordered size="small" column={1}>
                                        <Descriptions.Item label="Product Type">{searchResult.product_type || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Description">{searchResult.description || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Weight">{searchResult.weight_kg != null ? `${searchResult.weight_kg} kg` : "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Number of Boxes">{searchResult.number_of_boxes ?? "—"}</Descriptions.Item>
                                    </Descriptions>
                                </Col>

                                <Col xs={24} md={12}>
                                    <Descriptions title="Consignee" bordered size="small" column={1}>
                                        <Descriptions.Item label="Name">{searchResult.consignee_name || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Address">{searchResult.consignee_address || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="City">{searchResult.destination_city || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="State">{searchResult.destination_state || "—"}</Descriptions.Item>
                                        <Descriptions.Item label="Pincode">{searchResult.destination_pincode || "—"}</Descriptions.Item>
                                    </Descriptions>
                                </Col>
                            </Row>
                        </Flex>
                    )}
                </Flex>
            </Card>

            {/* ── Exception Alerts + Hub Status ── */}
            <Row gutter={12}>
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
                        <div style={{ maxHeight: 190, overflowY: "auto", scrollBehavior: "smooth" }}>
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
                                                <Typography.Text type="secondary">{hub.last_updated_ts || ""}</Typography.Text>
                                            </Space>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ── Network Map ── */}
            <Card title="Network Map">
                <OperationsMap />
            </Card>
        </Flex>
    );
}
