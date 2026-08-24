import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from agents import alchemyst_client

def test_alchemyst():
    print("Testing add...")
    alchemyst_client.add("This is a test message.", "user123")
    print("Testing search...")
    res = alchemyst_client.search("test", "user123")
    print(f"Results: {res}")

if __name__ == "__main__":
    test_alchemyst()
