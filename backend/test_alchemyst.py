import os
from dotenv import load_dotenv
load_dotenv()

try:
    from alchemyst_ai import AlchemystAI
except ImportError:
    print("Alchemyst AI SDK not installed.")
    exit(1)

def test():
    api_key = os.environ.get("ALCHEMYST_AI_API_KEY", "").strip()
    if not api_key or api_key == "your-api-key-here":
        print("Please provide a valid ALCHEMYST_AI_API_KEY in .env")
        return

    print("Initializing Alchemyst Client...")
    try:
        client = AlchemystAI(api_key=api_key)
        
        # Test Add
        print("Testing context add...")
        client.v1.context.add(
            documents=[
                {
                    "content": "User test memory for verification.",
                    "metadata": {
                        "file_name": "test_memory.txt",
                        "file_type": "text/plain"
                    }
                }
            ],
            source="test_script",
            context_type="conversation",
            scope="internal",
            metadata={
                "group_name": ["hackathon_test_user"]
            }
        )
        print("Successfully added context!")

        # Test Search
        print("Testing context search...")
        results = client.v1.context.search(
            query="test memory",
            similarity_threshold=0.5,
            scope="internal",
            body_metadata={
                "group_name": ["hackathon_test_user"]
            }
        )
        
        print("Search successful! Results:")
        print(results)
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test()
