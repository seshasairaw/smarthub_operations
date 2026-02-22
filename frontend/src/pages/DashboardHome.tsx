import { useEffect, useMemo, useState } from "react";
import { Row, Col, Card, Statistic, List, Tag, Space, Button, Divider } from "antd";
import { useNavigate } from "react-router-dom";
import { Line, Column } from "@ant-design/charts";
import { api } from "../api/client";

/**
 * DashboardHome is the main landing page of the dashboard, providing a high-level overview of key metrics, recent activities, and quick access to other sections.
 * It fetches data from our local API endpoints to populate KPIs, activity feed, and charts.
 */
type Summary = {
    shipments_in_transit: number;
    exceptions: number;
    delayed_shipments: number;
    on_time_rate: number;
};

/**
 * Activity represents a single entry in the recent activity feed, derived from live exceptions data.
 * It includes a title, timestamp, and type for categorization.
 */
type Activity = {
    id: string;
    title: string;
    time: string;
    type: "INFO" | "WARN" | "ERROR";
};

/**
 * ExceptionRow represents the structure of an exception record fetched from the /api/exceptions/live endpoint.
 */
type ExceptionRow = {
    id: number;
    exception_type?: string | null;
    exception_notes?: string | null;
    origin_city?: string | null;
    destination_city?: string | null;
    last_status_update?: string | null;
    updated_ts?: string | null;
};

// Helper function to render activity type with color-coded tags
function typeTag(t: Activity["type"]) {
    if (t === "ERROR") return <Tag color="red">Exception</Tag>;
    if (t === "WARN") return <Tag color="gold">Warning</Tag>;
    return <Tag color="blue">Update</Tag>;
}

function safeTime(ts?: string | null) {
    if (!ts) return "—";
    // keeping it simple by showing raw timestamp for now
    return ts.replace("T", " ").slice(0, 16);
}

/**
 * DashboardHome component fetches summary metrics and live exceptions to display on the dashboard.
 * It also includes charts for shipments trend and exceptions by type, which are currently connected to local API endpoints.
 * The component is designed to provide a quick overview and easy navigation to other sections of the dashboard.
 * Note: The charts are currently using mock data but will be connected to real API endpoints in the next steps.
 */
export default function DashboardHome() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    useEffect(() => {
        setLoadingSummary(true);
        api.get("/api/shipments/summary")
        .then((res) => setSummary(res.data))
        .catch((err) => console.error("Failed to fetch summary:", err))
        .finally(() => setLoadingSummary(false));
    }, []);

    const nav = useNavigate();
    // API-driven
    const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
    const [loadingExceptions, setLoadingExceptions] = useState(false);

    useEffect(() => {
        setLoadingExceptions(true);
        api
            .get("/api/exceptions/live?limit=20")
            .then((res) => setExceptions(res.data))
            .catch((err) => console.error("Failed to fetch exceptions:", err))
            .finally(() => setLoadingExceptions(false));
    }, []);

    const activityFeed: Activity[] = useMemo(() => {
        return exceptions.map((e) => ({
            id: String(e.id),
            type: "ERROR",
            title: `${e.exception_type || "Exception"} • ${e.origin_city || "?"} → ${e.destination_city || "?"}${
                e.exception_notes ? ` • ${e.exception_notes}` : ""
            }`, time: safeTime(e.last_status_update || e.updated_ts),
        }));
    }, [exceptions]);

    // Charts (keeping mock for now)- we'll connect these to our local API endpoints in the next steps
    const [shipmentsTrend, setShipmentsTrend] = useState<any[]>([]);
    const [exceptionsByType, setExceptionsByType] = useState<any[]>([]);
    useEffect(() => {
        api.get("/api/shipments/trend").then(res => setShipmentsTrend(res.data));
    }, []);
    useEffect(() => {
        api.get("/api/exceptions/by-type").then(res => setExceptionsByType(res.data));
    }, []);
    
    // Chart configurations
    const lineConfig = {
        data: shipmentsTrend,
        xField: "day",
        yField: "value",
        height: 260,
        smooth: true,
        autoFit: true,
    };

    const columnConfig = {
        data: exceptionsByType,
        xField: "type",
        yField: "value",
        height: 260,
        autoFit: true,
        colorField: "type",
        scale: {
            color: {
                domain: ["Delay", "Damage", "Temp", "Address"],
                range: ["#faad14", "#cf1322", "#1677ff", "#8c8c8c"],
            },
        },
    };
    
    return (
        <>
        {/* KPIs */}
        <Row gutter={16}>
        <Col span={6}>
            <Card>
                <Statistic 
                    title="Shipments In Transit" 
                    value={summary?.shipments_in_transit ?? 0} 
                    loading={loadingSummary}
                />
            </Card>
        </Col>

        <Col span={6}>
            <Card>
                <Statistic 
                    title="Exceptions" 
                    value={summary?.exceptions ?? 0} 
                    loading={loadingSummary} 
                    valueStyle={{ color: "#cf1322" }} 
                />
            </Card>
        </Col>

        <Col span={6}>
            <Card>
                <Statistic 
                    title="On-Time Delivery" 
                    value={summary?.on_time_rate ?? 0} 
                    loading={loadingSummary} 
                    suffix="%" 
                />
            </Card>
        </Col>

        <Col span={6}>
            <Card>
                <Statistic 
                    title="Delayed Shipments" 
                    value={summary?.delayed_shipments ?? 0} 
                    loading={loadingSummary} 
                />
            </Card>
        </Col>
        </Row>
        
        {/* Activity + Quick Actions */}
        <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={16}>
                <Card title="Recent Activity">
                    <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 6 }}>
                        <List
                            loading={loadingExceptions}
                            dataSource={activityFeed}
                            locale={{ emptyText: "No recent activity yet" }}
                            renderItem={(item) => (
                                <List.Item key={item.id}>
                                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                        <Space>
                                            {typeTag(item.type)}
                                            <span>{item.title}</span>
                                        </Space>
                                        <span style={{ color: "rgba(0,0,0,0.45)" }}>{item.time}</span>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </div>
                </Card>

            </Col>

            <Col span={8}>
                <Card title="Quick Actions">
                    <Button type="primary" block onClick={() => nav("/operations")}>
                        View Live Operations
                    </Button>

                    <Divider style={{ margin: "12px 0" }} />
                    <Button block onClick={() => nav("/documents")}>
                        Search POD Documents
                    </Button>

                    <Divider style={{ margin: "12px 0" }} />
                    <Button block onClick={() => nav("/vendors")}>
                        Vendor Scorecards
                    </Button>

                    <Divider style={{ margin: "12px 0" }} />
                    <Button block onClick={() => nav("/analytics")}>
                        Open Analytics
                    </Button>
                </Card>
            </Col>

            {/* Charts */}
            <Col span={12} style={{ marginTop: 16 }}>
                <Card title="Shipments Trend (From out local data)">
                    <Line {...lineConfig} />
                </Card>
            </Col>

            <Col span={12} style={{ marginTop: 16 }}>
                <Card title="Exceptions by Type (From our local data)">
                    <Column {...columnConfig} />
                </Card>
            </Col>
        </Row>
    </>
    );
}