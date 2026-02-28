import os
import json
import httpx
from groq import Groq
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file so we can read GROQ_API_KEY
load_dotenv()

# Initialize Groq client with our API key
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# The model we decided to use
MODEL = "llama-3.3-70b-versatile"

# Your main backend URL - botbrain will fetch live data from here
# For docker: use 'http://backend:8000', for local dev: 'http://localhost:8000'
MAIN_BACKEND = os.getenv("MAIN_BACKEND_URL", "http://backend:8000")

# Frontend URL for CORS
FRONTEND_URLS = os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")

# Create our FastAPI app
app = FastAPI()

# Allow React frontend to talk to this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def fetch_summary():
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        res = await http_client.get(f"{MAIN_BACKEND}/api/shipments/summary")
        return res.json()

async def fetch_exceptions(limit: int = 10):
    async with httpx.AsyncClient() as http_client:
        res = await http_client.get(f"{MAIN_BACKEND}/api/exceptions/live?limit={limit}")
        return res.json()

async def fetch_vendors():
    async with httpx.AsyncClient() as http_client:
        res = await http_client.get(f"{MAIN_BACKEND}/api/vendors")
        return res.json()
    
async def fetch_delayed_shipments():
    async with httpx.AsyncClient() as http_client:
        res = await http_client.get(f"{MAIN_BACKEND}/api/shipments/delayed")
        return res.json()
    

# These are the tools we expose to Groq
# Groq reads these descriptions to decide which tool to call
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_summary",
            "description": "Get overall platform statistics including shipments in transit, active exceptions count, on time delivery rate and number of active vendors. Use this for general overview questions.",
            "parameters": {
                "type": "object",
                "properties": {},  # no inputs needed
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_exceptions",
            "description": "Get list of active exceptions including delays, damages, temperature breaches and address issues. Use this when user asks about specific exceptions, delays or problems.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of exceptions to fetch, default is 10"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_delayed_shipments",
            "description": "Get list of delayed shipments with their origin, destination and ETA. Use this when user asks specifically about delayed shipments or wants details of delays.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_vendors",
            "description": "Get list of vendors and their details including vendor type, pricing model and active status. Use this when user asks about vendors.",
            "parameters": {
                "type": "object",
                "properties": {},  # no inputs needed
                "required": []
            }
        }
    }
]

async def execute_tool(tool_name: str, tool_args: dict) -> str:
    """
    When Groq decides to call a tool, this function runs the
    appropriate fetch function and returns the result as a string.
    
    tool_name: the name of the tool Groq wants to call
    tool_args: the arguments Groq wants to pass to the tool
    """
    if tool_name == "get_summary":
        result = await fetch_summary()

    elif tool_name == "get_exceptions":
        # Groq may or may not pass a limit argument
        # if it doesn't, we default to 10
        limit = int((tool_args or {}).get("limit", 10))
        result = await fetch_exceptions(limit)

    elif tool_name == "get_vendors":
        result = await fetch_vendors()

    elif tool_name == "get_delayed_shipments":
        result = await fetch_delayed_shipments()

    else:
        # If Groq somehow calls a tool we don't have
        result = {"error": f"Unknown tool: {tool_name}"}

    # Convert result to string because Groq expects
    # tool results as text, not Python dictionaries
    return json.dumps(result)


# These define the shape of data coming in and going out
# BaseModel is from Pydantic - it validates data automatically
# For example if frontend sends a number instead of string, Pydantic catches it
class ChatRequest(BaseModel):
    message: str        # the user's question
    history: list = []  # previous messages, empty by default

class ChatResponse(BaseModel):
    reply: str  # the AI's response

# System prompt - this tells Groq who it is and how to behave
# This is sent with every single request as the first message
SYSTEM_PROMPT = """You are an AI assistant for Smart Operations Hub, 
a logistics operations dashboard. You help operations managers 
understand shipment data, exceptions, and vendor performance.

Guidelines:
- Always base your answers on the live data fetched via tools
- Keep responses concise and focused on logistics operations
- Use bullet points for lists of exceptions or vendors
- If asked something outside logistics operations, politely decline
- Always mention specific numbers and data points in your answers
"""

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Main endpoint the frontend calls.
    POST /chat with { "message": "your question", "history": [...] }
    Returns { "reply": "AI response" }
    """

    # Step 1: Build the messages list
    # Every conversation with Groq is a list of messages 
    # We always start with the system prompt
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    print("DEBUG history received:", req.history)

    # Add conversation history (last 6 messages = 3 exchanges)
    # This gives the AI memory of recent conversation
    for msg in req.history[-6:]:
        # only include clean user/assistant messages, skip any error messages
        if isinstance(msg, dict) and msg.get("role") in ["user", "assistant"]:
            messages.append(msg)

    # Add the current user message
    messages.append({"role": "user", "content": req.message})

    # Step 2: First call to Groq
    # We send the messages AND the tools list
    # Groq will either answer directly OR ask to call a tool
    try:
        first_response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=1024,
        )
    except Exception as e:
        # Log the error and return a clean message instead of crashing
        print(f"Groq API error: {e}")
        return ChatResponse(reply="I encountered an error processing your request. Please try again.")

    first_message = first_response.choices[0].message

    # Step 3: Check if Groq wants to call a tool
    if first_message.tool_calls:
        # Add Groq's tool call request to messages
        messages.append(first_message)

        # Execute ALL tools Groq requested
        # Groq can request multiple tools at once!
        for tool_call in first_message.tool_calls:
            tool_name = tool_call.function.name

            # tool_call.function.arguments comes as a JSON string
            # we convert it to a Python dictionary using json.loads()
            raw_args = tool_call.function.arguments

            try:
                tool_args = json.loads(raw_args) if raw_args else {}
            except Exception:
                tool_args = {}

            if tool_args is None:
                tool_args = {}

            # Actually run the tool and get the data
            tool_result = await execute_tool(tool_name, tool_args)

            # Add tool result to messages so Groq can see it
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result,
            })

        # Step 4: Second call to Groq
        # Now Groq has the tool results and can give a real answer
        second_response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=1024,
        )

        reply = second_response.choices[0].message.content

    else:
        # Groq answered directly without needing any tool
        reply = first_message.content

    return ChatResponse(reply=reply)


@app.get("/health")
def health():
    """Visit localhost:8001/health to confirm botbrain is running"""
    return {"status": "botbrain is running"}
