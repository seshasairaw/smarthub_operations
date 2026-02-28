"""  
    1. This FastAPI backend serves as a local API layer that connects to a MySQL database containing logistics data.
    2. It provides various endpoints to fetch customers, vendors, shipment details, exceptions, and hub statuses.
    3. The backend uses environment variables for database connection details and includes CORS middleware to allow requests from the frontend running on localhost:5173.
    4. Each endpoint executes SQL queries to retrieve data from the database and returns it in a structured format for the frontend to consume.
"""
import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import pymysql
from auth import LoginRequest, LoginResponse, UserResponse, verify_password, create_access_token
load_dotenv()

# This is a simple FastAPI backend that connects to a MySQL database to serve logistics-related data.
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DB = os.getenv("MYSQL_DB")

if not all([MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB]):
    raise RuntimeError("Missing MYSQL_* env vars in .env")

app = FastAPI(title="Logistics Local APIs (MySQL)")
app.mount("/pod_docs", StaticFiles(directory="static/POD_documents"), name="pod_docs")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# CORS middleware is added to allow requests from the frontend (running on localhost:5173).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper functions to interact with the MySQL database
def fetch_all(sql: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor, # return results as dicts instead of tuples
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()

def fetch_one(sql: str, params: tuple) -> Optional[Dict[str, Any]]:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None

# Authentication endpoint for user login with JWT token generation
@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """
    Authenticate user with username/email and password.
    Returns JWT access token and user data if credentials are valid.
    """
    # Query user from database with role information
    user = fetch_one(
        """
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
               u.password_hash, u.is_active, r.role_code
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE (u.username = %s OR u.email = %s)
        """,
        (req.username_or_email, req.username_or_email),
    )

    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    # Check if user account is active
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact administrator.",
        )

    # Verify password
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    # Create JWT token with user ID, username, and role
    token_data = {
        "sub": str(user["id"]),  # subject = user ID
        "username": user["username"],
        "role": user["role_code"],
    }
    access_token = create_access_token(token_data)

    # Prepare user response (exclude password_hash)
    user_response = UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        role_code=user["role_code"],
        phone=user.get("phone"),
    )

    return LoginResponse(access_token=access_token, user=user_response)

# /api/customers- This endpoint returns a list of all customers in the system, ordered by their ID.
@app.get("/api/customers")
def get_customers():
    return fetch_all("SELECT * FROM customers ORDER BY id")

# /api/vendors- This endpoint returns a list of all vendors in the system, ordered by their ID.
@app.get("/api/vendors")
def get_vendors():
    return fetch_all("SELECT * FROM vendors ORDER BY id")

# /api/vendors/:id/performance
@app.get("/api/vendors/{vendor_id}/performance")
def get_vendor_performance(vendor_id: str):
    row = fetch_one(
        "SELECT * FROM vendor_performance WHERE vendor_id = %s ORDER BY calculation_date DESC LIMIT 1",
        (vendor_id,),
    )
    return row or {"vendor_id": vendor_id, "message": "No performance found"}


"""
    /api/exceptions/live- This endpoint returns a list of recent shipment exceptions, including the shipment ID, exception type, message, and when the exception was raised.
    The results are ordered by the most recent exceptions first and limited to a specified number (default 20).
"""
@app.get("/api/exceptions/live")
def get_exceptions_live(limit: int = 20):
    return fetch_all(
        """
        SELECT
            id AS shipment_id,  -- Frontend expects 'shipment_id'
            exception_type,
            exception_notes AS message, -- Frontend expects 'message'
            origin_city,    -- Fixes Dashboard '?'
            destination_city,   -- Fixes Dashboard '?'
            COALESCE(last_status_update, updated_ts) AS raised_at -- Frontend expects 'raised_at'
        FROM shipments
        WHERE has_exception = 1
        ORDER BY raised_at DESC
        LIMIT %s
        """,
        (limit,),
    )


# /api/pod/search?q=... This endpoint allows searching for shipments based on the POD document URL, AWB number, or shipment ID.
@app.get("/api/pod/search")
def pod_search(q: str = Query(..., min_length=1), limit: int = 50):
    like = f"%{q}%"
    return fetch_all(
        """
        SELECT s.*, a.awb_number
        FROM shipments s
        JOIN awb_numbers a ON a.id = s.awb_id
        WHERE a.awb_number LIKE %s
            OR CAST(s.id AS CHAR) LIKE %s
            OR s.pod_document_url LIKE %s
        ORDER BY COALESCE(s.pod_upload_timestamp, s.updated_ts) DESC
        LIMIT %s
        """,
        (like, like, like, limit),
    )

# /api/shipments- This endpoint returns a list of recent shipments with their current status, origin, destination, assigned vendor, and other relevant details.
@app.get("/api/shipments")
def get_shipments(limit: int = 200):
    return fetch_all(
        """
        SELECT
            s.id AS shipment_id,    -- Matches 'shipment_id' in frontend
            a.awb_number,
            s.origin_city AS origin,    -- Matches 'origin' in frontend
            s.destination_city AS destination,  -- Matches 'destination'
            s.current_status AS shipment_status,
            h.hub_code AS current_hub_code,
            s.assigned_vendor_id AS vendor_id,
            s.expected_delivery_date AS eta,
            COALESCE(s.last_status_update, s.updated_ts) AS last_updated_ts
        FROM shipments s
        JOIN awb_numbers a ON a.id = s.awb_id
        LEFT JOIN hubs h ON h.id = s.current_hub_id
        ORDER BY COALESCE(s.last_status_update, s.updated_ts) DESC
        LIMIT %s
        """,
        (limit,),
    )

# /api/shipments/summary- This endpoint provides a summary of the current shipment statuses, including per-status counts and on-time delivery rate.
@app.get("/api/shipments/summary")
def shipments_summary():
    row = fetch_one(
        """
            SELECT
            SUM(CASE WHEN current_status = 'BOOKED' THEN 1 ELSE 0 END) AS booked,
            SUM(CASE WHEN current_status = 'PICKED_UP' THEN 1 ELSE 0 END) AS picked_up,
            SUM(CASE WHEN current_status = 'IN_TRANSIT' THEN 1 ELSE 0 END) AS in_transit,
            SUM(CASE WHEN current_status = 'OUT_FOR_DELIVERY' THEN 1 ELSE 0 END) AS out_for_delivery,
            SUM(CASE WHEN current_status = 'DELAYED' THEN 1 ELSE 0 END) AS delayed_count,
            SUM(CASE WHEN has_exception = 1 THEN 1 ELSE 0 END) AS exceptions,
            SUM(CASE WHEN actual_delivery_date IS NOT NULL
                AND expected_delivery_date IS NOT NULL
                AND actual_delivery_date <= expected_delivery_date
            THEN 1 ELSE 0 END) AS on_time_deliveries,
            SUM(CASE WHEN actual_delivery_date IS NOT NULL THEN 1 ELSE 0 END) AS delivered_total
            FROM shipments
        """,
        (),
    )

    if not row:
        return {"booked": 0, "picked_up": 0, "in_transit": 0, "out_for_delivery": 0,
                "delayed_shipments": 0, "exceptions": 0, "on_time_rate": 0.0}

    delivered_total = int(row.get("delivered_total") or 0)
    on_time = int(row.get("on_time_deliveries") or 0)
    on_time_rate = round((on_time / delivered_total) * 100, 1) if delivered_total > 0 else 0.0

    return {
        "booked": int(row.get("booked") or 0),
        "picked_up": int(row.get("picked_up") or 0),
        "in_transit": int(row.get("in_transit") or 0),
        "out_for_delivery": int(row.get("out_for_delivery") or 0),
        "delayed_shipments": int(row.get("delayed_count") or 0),
        "exceptions": int(row.get("exceptions") or 0),
        "on_time_rate": on_time_rate,
    }

# for charts, we can add APIs like: This endpoint returns the count of shipments booked each day over the last 30 days, which can be used to visualize booking trends.
@app.get("/api/shipments/trend")
def shipments_trend():
    return fetch_all(
        """
        SELECT
            DATE(booking_date) AS day,
            COUNT(*) AS value
        FROM shipments
        GROUP BY DATE(booking_date)
        ORDER BY DATE(booking_date)
        """
    )

# /api/shipments/{shipment_id} - Returns full detail for a single shipment including vendor, consignee, package, and booking info.
@app.get("/api/shipments/{shipment_id}")
def get_shipment_detail(shipment_id: int):
    row = fetch_one(
        """
        SELECT
            s.id AS shipment_id,
            a.awb_number,
            s.origin_city,
            s.destination_city,
            s.destination_state,
            s.destination_pincode,
            s.current_status,
            s.expected_delivery_date,
            s.actual_delivery_date,
            s.booking_date,
            s.has_exception,
            s.exception_type,
            s.exception_notes,
            s.consignee_name,
            s.consignee_address,
            s.product_type,
            s.description,
            s.weight_kg,
            s.number_of_boxes,
            s.service_type,
            s.booking_id,
            h.hub_code AS current_hub_code,
            h.hub_name AS current_hub_name,
            v.name AS vendor_name,
            COALESCE(s.last_status_update, s.updated_ts) AS last_updated_ts
        FROM shipments s
        JOIN awb_numbers a ON a.id = s.awb_id
        LEFT JOIN hubs h ON h.id = s.current_hub_id
        LEFT JOIN vendors v ON v.id = s.assigned_vendor_id
        WHERE s.id = %s
        """,
        (shipment_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")
    return row

# This endpoint returns the count of exceptions grouped by their type, ordered by the most common exception types first.
@app.get("/api/exceptions/by-type")
def exceptions_by_type():
    return fetch_all(
        """
        SELECT
            exception_type AS type,
            COUNT(*) AS value
        FROM shipments
        WHERE has_exception = 1
        GROUP BY exception_type
        ORDER BY value DESC
        """
    )

# This endpoint returns the status of all hubs, including whether they are operational, congested (20 or more shipments currently at the hub), or down (is_active = 0).
@app.get("/api/hubs/status")
def hubs_status(limit: int = 50):
    return fetch_all(
        """
        SELECT
            h.hub_code,
            h.hub_name,
            h.city,
            h.pincode,
            CASE
                WHEN h.is_active = 0 THEN 'DOWN'
                WHEN COUNT(s.id) >= 20 THEN 'CONGESTED'
                ELSE 'OPERATIONAL'
            END AS status,
            COALESCE(h.updated_ts, h.created_ts) AS last_updated_ts
        FROM hubs h
        LEFT JOIN shipments s ON s.current_hub_id = h.id
        GROUP BY h.id, h.hub_code, h.hub_name, h.city, h.pincode, h.is_active, h.updated_ts, h.created_ts
        ORDER BY h.hub_code
        LIMIT %s
        """,
        (limit,),
    )

@app.get("/api/shipments/delayed")
def get_delayed_shipments():
    return fetch_all(
        """
        SELECT
            s.id AS shipment_id,
            a.awb_number,
            s.origin_city,
            s.destination_city,
            s.current_status,
            s.expected_delivery_date AS eta,
            COALESCE(s.last_status_update, s.updated_ts) AS last_updated
        FROM shipments s
        JOIN awb_numbers a ON a.id = s.awb_id
        WHERE s.current_status = 'DELAYED'
        ORDER BY s.expected_delivery_date ASC
        """,
        (),
    )