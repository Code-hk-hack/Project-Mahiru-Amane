import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "https://wbngduousdonvxzlogbx.supabase.co")
key: str = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndibmdkdW91c2RvbnZ4emxvZ2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDA3MTMsImV4cCI6MjA5OTYxNjcxM30.3Yj8fDr4NsxeA6YeAQFkDmyBy2eBP4E1gIAp2gQUaSY")

if not url or not key:
    print("Warning: Supabase credentials not found, using fallbacks")

# Initialize the Supabase client
supabase: Client = create_client(url, key)

def get_db() -> Client:
    """
    Returns the initialized Supabase client.
    """
    return supabase
