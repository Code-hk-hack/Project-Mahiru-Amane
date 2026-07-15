import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_huggingface import HuggingFaceEndpointEmbeddings

load_dotenv()

def main():
    print("Initializing HuggingFace Inference API...")
    
    # Check for keys
    url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    hf_token = os.environ.get("HUGGINGFACEHUB_API_TOKEN")
    
    if not url or not supabase_key:
        print("Missing SUPABASE_URL or SUPABASE_KEY in .env!")
        return
        
    if not hf_token:
        print("Missing HUGGINGFACEHUB_API_TOKEN in .env! Please get a free token from huggingface.co")
        return

    # Use HuggingFace API (No local PyTorch required!)
    embeddings = HuggingFaceEndpointEmbeddings(
        model="sentence-transformers/all-MiniLM-L6-v2",
        task="feature-extraction",
        huggingfacehub_api_token=hf_token
    )

    print("Connecting to Supabase...")
    supabase: Client = create_client(url, supabase_key)

    print("Loading HR Knowledge Base...")
    try:
        with open("hr_knowledge_base.json", "r", encoding="utf-16") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to load hr_knowledge_base.json: {e}")
        return

    print("Embedding and uploading to vector store...")
    
    for category, rules in data.items():
        if isinstance(rules, list):
            content = f"Category: {category}\n" + "\n".join(rules)
        else:
            content = f"Category: {category}\n{rules}"
            
        print(f"Embedding category: {category}")
        
        # Call HuggingFace API for embedding
        vector = embeddings.embed_query(content)
        
        try:
            supabase.table("hr_rubrics").insert({
                "content": content,
                "metadata": {"category": category},
                "embedding": vector
            }).execute()
        except Exception as e:
            print(f"Failed to upload {category}: {e}")

    print("Successfully populated hr_rubrics vector table!")

if __name__ == "__main__":
    main()
