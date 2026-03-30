"""
Vercel entry point for SepsisAI API
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI app
from app.main import app

# Vercel will call this as a WSGI/ASGI application
handler = app
