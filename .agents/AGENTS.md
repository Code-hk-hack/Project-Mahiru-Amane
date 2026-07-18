# Hackathon Commit Rule
Whenever code or configuration is modified during this project, the agent MUST immediately commit the changes and push them to GitHub. 

The user requires atomic, step-by-step commits to ensure nothing is lost during the fast-paced hackathon.

# Auto-Restart Rule
Whenever the agent applies a fix or modifies code, they MUST automatically restart the frontend (`npm run dev`) and backend (`uv run uvicorn main:app --reload`) via background tasks to ensure the user can test the fixes immediately without needing to ask.
