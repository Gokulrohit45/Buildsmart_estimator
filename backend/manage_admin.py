import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(dotenv_path='f:/VTAB_PROJECTS/BuildSmart AI Estimator/backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY") # Service role key

if not url or not key:
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not set in backend/.env")
    sys.exit(1)

supabase = create_client(url, key)

def show_menu():
    print("=========================================")
    print("      BUILDSMART ADMIN CREATOR          ")
    print("=========================================")
    print("1. Create a NEW Admin user")
    print("2. Promote an EXISTING user email to Admin")
    print("3. Exit")
    print("=========================================")
    choice = input("Enter choice (1-3): ").strip()
    return choice

def create_new_admin():
    email = input("Enter new admin email: ").strip()
    password = input("Enter new admin password: ").strip()
    
    if len(password) < 6:
        print("ERROR: Password must be at least 6 characters.")
        return

    try:
        # Create user via Supabase Admin Auth API
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        user = res.user
        if user:
            # Explicitly force role to 'admin' in profiles table
            supabase.table("profiles").update({
                "company_name": "BuildSmart Administrator",
                "role": "admin",
                "is_approved": True,
                "city": "Bangalore"
            }).eq("id", user.id).execute()
            print(f"\nSUCCESS: Admin account created successfully!")
            print(f"Email: {email}")
            print(f"Password: {password}\n")
        else:
            print("ERROR: Failed to create auth user.")
    except Exception as e:
        print(f"ERROR: {e}\n")

def promote_existing():
    email = input("Enter email of the user to promote: ").strip()
    
    try:
        # Fetch the user profile by email
        res = supabase.table("profiles").select("id, role").eq("email", email).execute()
        if not res.data:
            print(f"ERROR: No user found with email '{email}'.")
            return
            
        user_id = res.data[0]['id']
        # Update role to 'admin'
        supabase.table("profiles").update({
            "role": "admin",
            "is_approved": True
        }).eq("id", user_id).execute()
        
        print(f"\nSUCCESS: User '{email}' promoted to Admin role successfully!\n")
    except Exception as e:
        print(f"ERROR: {e}\n")

if __name__ == "__main__":
    while True:
        c = show_menu()
        if c == '1':
            create_new_admin()
        elif c == '2':
            promote_existing()
        elif c == '3':
            print("Exiting...")
            break
        else:
            print("Invalid selection.")
