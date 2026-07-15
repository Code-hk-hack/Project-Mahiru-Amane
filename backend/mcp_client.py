import asyncio
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from mcp import ClientSession
from mcp.client.sse import sse_client

MCP_SERVER_URL = "https://slashy.ctrlcenter.ai/mcp"

# Global session variables
_mcp_session: ClientSession | None = None
_mcp_exit_stack = None

async def init_mcp_client():
    global _mcp_session, _mcp_exit_stack
    import contextlib

    print(f"Connecting to Slashy MCP at {MCP_SERVER_URL}...")
    
    _mcp_exit_stack = contextlib.AsyncExitStack()
    try:
        # Use SSE client
        sse = await _mcp_exit_stack.enter_async_context(sse_client(url=MCP_SERVER_URL))
        
        # Start session
        session = await _mcp_exit_stack.enter_async_context(ClientSession(*sse))
        await session.initialize()
        
        _mcp_session = session
        print("Successfully connected to Slashy MCP!")
    except Exception as e:
        import traceback
        print(f"Failed to connect to Slashy MCP: {e}")
        traceback.print_exc()
        await _mcp_exit_stack.aclose()
        _mcp_session = None

async def get_mcp_session() -> ClientSession | None:
    return _mcp_session

async def close_mcp_client():
    global _mcp_session, _mcp_exit_stack
    if _mcp_exit_stack:
        await _mcp_exit_stack.aclose()
        _mcp_exit_stack = None
        _mcp_session = None
