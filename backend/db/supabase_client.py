

from __future__ import annotations

import os
from typing import Any

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
except ImportError:
    pass

_client = None
_in_memory_mode = False

def get_supabase_client():

    global _client, _in_memory_mode

    if _in_memory_mode:
        return None

    if _client is not None:
        return _client

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")

    if not url or not key:
        print("⚠ SUPABASE_URL / SUPABASE_KEY not set — running in-memory mode")
        _in_memory_mode = True
        return None

    try:
        from supabase import create_client
        _client = create_client(url, key)
        print(f"✓ Supabase connected: {url[:40]}...")
        return _client
    except Exception as e:
        print(f"⚠ Supabase connection failed: {e} — running in-memory mode")
        _in_memory_mode = True
        return None

def is_connected() -> bool:

    return get_supabase_client() is not None

def save_student(student_id: str, data: dict) -> bool:

    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("students").upsert({
            "id": student_id,
            **data,
        }).execute()
        return True
    except Exception as e:
        print(f"DB save_student error: {e}")
        return False

def load_student(student_id: str) -> dict | None:

    client = get_supabase_client()
    if not client:
        return None
    try:
        result = client.table("students").select("*").eq("id", student_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        print(f"DB load_student error: {e}")
        return None

def save_session_response(student_id: str, response_data: dict) -> bool:

    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("responses").insert({
            "student_id": student_id,
            **response_data,
        }).execute()
        return True
    except Exception as e:
        print(f"DB save_response error: {e}")
        return False

def save_mastery_snapshot(student_id: str, mastery_data: dict) -> bool:

    client = get_supabase_client()
    if not client:
        return False
    try:
        client.table("mastery_snapshots").upsert({
            "student_id": student_id,
            **mastery_data,
        }).execute()
        return True
    except Exception as e:
        print(f"DB save_mastery error: {e}")
        return False

def register_student(email: str, password: str, name: str) -> dict | None:

    client = get_supabase_client()
    if not client:
        return None
    try:
        auth_response = client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {"name": name}
            }
        })
        if auth_response.user:

            save_student(auth_response.user.id, {
                "email": email,
                "name": name,
            })
            return {
                "id": auth_response.user.id,
                "email": email,
                "name": name,
            }
        return None
    except Exception as e:
        print(f"Registration error: {e}")
        return None

def login_student(email: str, password: str) -> dict | None:

    client = get_supabase_client()
    if not client:
        return None
    try:
        auth_response = client.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        if auth_response.user:
            return {
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "access_token": auth_response.session.access_token,
            }
        return None
    except Exception as e:
        print(f"Login error: {e}")
        return None
