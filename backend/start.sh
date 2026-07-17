#!/bin/bash
cd /home/hacker1724/backend_keploy
/home/hacker1724/backend_keploy/.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 > app_record.log 2>&1
