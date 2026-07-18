import asyncio
from main import init_mcp_client, close_mcp_client
from mcp_client import get_mcp_session

async def test():
    await init_mcp_client()
    session = await get_mcp_session()
    tools = await session.list_tools()
    print("Available Tools:", tools)
    await close_mcp_client()

if __name__ == "__main__":
    asyncio.run(test())
