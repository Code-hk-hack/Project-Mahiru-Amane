import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

try:
    res = supabase.auth.sign_up({
        "email": "demo@aura-ai.com",
        "password": "AuraAI2026!"
    })
    print("Success:", res)
except Exception as e:
    print("Error:", e)
