import os
import sys
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

# Global session variables
_mcp_session: ClientSession | None = None
_mcp_exit_stack = None

async def init_mcp_client():
    global _mcp_session, _mcp_exit_stack
    import contextlib

    print("Starting local MCP server via STDIO...")
    
    _mcp_exit_stack = contextlib.AsyncExitStack()
    try:
        # Define the server parameters to run our local_mcp_server.py
        server_params = StdioServerParameters(
            command=sys.executable, # Use the same python executable
            args=["local_mcp_server.py"],
            env=None
        )
        
        # Use stdio client
        stdio_transport = await _mcp_exit_stack.enter_async_context(stdio_client(server_params))
        
        # Start session
        session = await _mcp_exit_stack.enter_async_context(ClientSession(stdio_transport[0], stdio_transport[1]))
        await session.initialize()
        
        _mcp_session = session
        print("Successfully connected to Local MCP Server!")
    except (Exception, BaseExceptionGroup) as e:
        import traceback
        print(f"Failed to start/connect to local MCP: {e}")
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
