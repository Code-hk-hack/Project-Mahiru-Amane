#!/bin/bash
cd ~/backend_keploy
echo 'Starting Keploy...'
keploy record -c '/home/hacker1724/backend_keploy/.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000' > keploy_record.log 2>&1 & 
KEPLOY_PID=$!

echo 'Waiting 20 seconds for server to start...'
sleep 20

echo 'Sending GET /health to 127.0.0.1'
curl -v http://127.0.0.1:8000/health
echo ''

echo 'Sending POST /chat to 127.0.0.1'
curl -v -X POST http://127.0.0.1:8000/chat -H 'Content-Type: application/json' -d '{"message": "Hello", "difficulty": "neutral", "session_id": "test-session", "character": "mahiru", "language": "en-IN"}'
echo ''

echo 'Waiting a bit to ensure Keploy intercepts...'
sleep 15

echo 'Stopping Keploy...'
kill -SIGINT $KEPLOY_PID
wait $KEPLOY_PID
echo 'Recording complete! Keploy log:'
cat keploy_record.log
