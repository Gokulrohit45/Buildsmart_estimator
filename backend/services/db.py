import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Service role key (admin bypass)
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")  # Anon public key

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

# Initialize Supabase Clients
# Admin client has service_role privileges (bypasses RLS - safe for server-side orchestrations)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Client with anonymous/public privileges (respects RLS)
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY or "")

def get_supabase_user(token: str):
    """
    Validate a user's JWT token using the anon client.
    This prevents polluting the service role client's headers.
    """
    return supabase_client.auth.get_user(token)
