import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Key must be provided in the .env file")

# Initialize the Supabase client
supabase: Client = create_client(url, key)

def get_db() -> Client:
    """
    Returns the initialized Supabase client.
    """
    return supabase
