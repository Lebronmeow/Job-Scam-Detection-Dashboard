import os
from sqlalchemy import text
from dotenv import load_dotenv
from database import engine

load_dotenv()

def migrate():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("Error: DATABASE_URL not found.")
        print("Since your database is on Render, please do the following:")
        print("1. Go to your Render Dashboard -> PostgreSQL database.")
        print("2. Copy the 'External Database URL'.")
        print("3. Create a '.env' file in the backend folder and add: DATABASE_URL=your_copied_url")
        print("4. Run this script again.")
        return
    
    print("Connecting to the deployed database...")
    with engine.connect() as conn:
        # We use a transaction to run the alters
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN role VARCHAR;"))
            print("Successfully added column 'role' to jobs table.")
        except Exception as e:
            print(f"Note: Column 'role' might already exist or error occurred: {e}")
            
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN location VARCHAR;"))
            print("Successfully added column 'location' to jobs table.")
        except Exception as e:
            print(f"Note: Column 'location' might already exist or error occurred: {e}")

        try:
            conn.commit()
        except Exception:
            pass
            
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
