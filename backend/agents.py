import os
import json
from groq import Groq
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Groq configuration (Lightning Fast Inference)
api_key = os.environ.get("GROQ_API_KEY")

client = Groq(
    api_key=api_key or "MISSING_KEY",
)

# Using LLaMA 3 8B optimized for Groq LPUs
MODEL = os.environ.get("MODEL_NAME", "llama3-8b-8192") 

class AnalystFeedback(BaseModel):
    passiveness_score: int = Field(..., description="Score from 0 to 10 on how passive the user's language is.")
    apology_count: int = Field(..., description="Number of unnecessary apologies.")
    hesitation_count: int = Field(..., description="Number of hesitation markers like 'um', 'uh', 'maybe'.")
    feedback_notes: str = Field(..., description="Structural feedback for the Coach to deliver.")

class AnalystAgent:
    @staticmethod
    def analyze(user_message: str) -> AnalystFeedback:
        """
        Analyzes the user's message for passive language and boundary setting.
        """
        system_prompt = (
            "You are an Analyst Agent for a social confidence training simulator. "
            "Your job is to evaluate the user's input for passiveness, excessive apologies, and hesitation. "
            "Return a strictly valid JSON object matching the requested schema. "
            "JSON Format: {\"passiveness_score\": int, \"apology_count\": int, \"hesitation_count\": int, \"feedback_notes\": \"string\"}"
        )
        
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"}
        )
        
        result_str = completion.choices[0].message.content
        data = json.loads(result_str)
        return AnalystFeedback(**data)

class CoachAgent:
    @staticmethod
    def respond(user_message: str, analyst_feedback: AnalystFeedback, difficulty: str = "neutral") -> str:
        """
        Generates the Mahiru/Amane response incorporating the analyst feedback.
        """
        system_prompt = f"""
You are the Coach Agent (Mahiru/Amane). You are a strict, no-nonsense mentor teaching social confidence.
The No-Escapism Mandate is active: Do NOT engage in romantic roleplay. Do NOT be a yes-man.
Current difficulty tier: {difficulty}. Adjust your personality (e.g., distracted, impatient, neutral) accordingly.

The Analyst Agent has provided this structural feedback on the user's last message:
- Passiveness: {analyst_feedback.passiveness_score}/10
- Apologies: {analyst_feedback.apology_count}
- Hesitations: {analyst_feedback.hesitation_count}
- Notes: {analyst_feedback.feedback_notes}

Address the user's message naturally in character, but weave in a harsh but constructive critique based on the Analyst's notes.
"""
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )
        return completion.choices[0].message.content
