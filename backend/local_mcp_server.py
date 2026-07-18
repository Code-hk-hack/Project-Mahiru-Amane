import asyncio
import json
import urllib.request
from datetime import datetime
from mcp.server import Server
from mcp.types import Tool, TextContent
import mcp.server.stdio

app = Server("local-coach-tools")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_current_time",
            description="Returns the current local date and time.",
            inputSchema={
                "type": "object",
                "properties": {},
            }
        ),
        Tool(
            name="calculate",
            description="A basic math calculator. Evaluates a math expression.",
            inputSchema={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression to evaluate (e.g. '25 * 4')"
                    }
                },
                "required": ["expression"]
            }
        ),
        Tool(
            name="fetch_website_content",
            description="Fetches plain text content from a URL.",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to fetch."
                    }
                },
                "required": ["url"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "get_current_time":
        now = datetime.now().isoformat()
        return [TextContent(type="text", text=f"The current time is {now}")]
        
    elif name == "calculate":
        expr = arguments.get("expression", "")
        try:
            # Safely evaluate simple math using eval with empty builtins
            allowed_names = {}
            code = compile(expr, "<string>", "eval")
            for name in code.co_names:
                if name not in allowed_names:
                    raise NameError(f"Use of {name} not allowed")
            result = eval(code, {"__builtins__": {}}, allowed_names)
            return [TextContent(type="text", text=f"Result: {result}")]
        except Exception as e:
            return [TextContent(type="text", text=f"Error evaluating math: {str(e)}")]
            
    elif name == "fetch_website_content":
        url = arguments.get("url", "")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8')
                # Very basic stripping of HTML
                import re
                text = re.sub(r'<[^>]+>', ' ', html)
                text = re.sub(r'\s+', ' ', text).strip()
                # truncate to avoid massive responses
                return [TextContent(type="text", text=text[:2000])]
        except Exception as e:
            return [TextContent(type="text", text=f"Error fetching URL: {str(e)}")]
            
    return [TextContent(type="text", text=f"Unknown tool: {name}")]

async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
