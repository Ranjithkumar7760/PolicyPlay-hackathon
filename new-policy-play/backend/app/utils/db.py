import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
try:
    import certifi
    HAS_CERTIFI = True
except ImportError:
    HAS_CERTIFI = False
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.read_preferences import ReadPreference
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is required. Please set it in your .env file or environment.")
DATABASE_NAME = "policyplay"
COLLECTION_NAME = "policies"

# Global MongoDB client
client: AsyncIOMotorClient = None
database = None
collection = None


async def connect_to_mongo():
    """Initialize MongoDB connection"""
    global client, database, collection
    
    try:
        # MongoDB Atlas connection with proper SSL/TLS handling
        connection_uri = MONGO_URI
        
        # Ensure the connection string has proper SSL parameters
        # MongoDB Atlas requires TLS/SSL by default
        # Note: w=majority requires primary, but we'll keep it for data consistency
        # If primary is unavailable, writes will fail (which is expected MongoDB behavior)
        if "retrywrites" not in connection_uri.lower():
            separator = "&" if "?" in connection_uri else "?"
            connection_uri = f"{connection_uri}{separator}retryWrites=true&w=majority"
        
        # Add TLS parameters to connection string if not present
        if "tls=" not in connection_uri.lower():
            separator = "&" if "?" in connection_uri or "&" in connection_uri else "?"
            connection_uri = f"{connection_uri}{separator}tls=true"
        
        # Helper function to build URI with read preference
        def build_uri_with_read_preference(base_uri, read_pref):
            """Build URI with read preference, removing any existing readPreference"""
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
            # Parse the URI
            parsed = urlparse(base_uri)
            # Parse query parameters
            params = parse_qs(parsed.query)
            # Remove any existing readPreference (case-insensitive)
            params = {k: v for k, v in params.items() if k.lower() != 'readpreference'}
            # Add new read preference (parse_qs returns lists, so we need to use a list)
            params['readPreference'] = [read_pref]
            # Rebuild query string
            new_query = urlencode(params, doseq=True)
            # Rebuild URI
            new_parsed = parsed._replace(query=new_query)
            return urlunparse(new_parsed)
        
        # Build URIs with different read preferences
        uri_secondary_preferred = build_uri_with_read_preference(connection_uri, "secondaryPreferred")
        uri_nearest = build_uri_with_read_preference(connection_uri, "nearest")
        uri_primary_preferred = build_uri_with_read_preference(connection_uri, "primaryPreferred")
        
        connection_attempts = [
            # Strategy 1: SecondaryPreferred - prefer secondaries (best for degraded clusters)
            {
                "connection_uri": uri_secondary_preferred,
                "tls": True,
                "tlsAllowInvalidCertificates": True,
                "serverSelectionTimeoutMS": 60000,
                "connectTimeoutMS": 60000,
                "socketTimeoutMS": 60000,
            },
            # Strategy 2: Nearest read preference - read from nearest available server
            {
                "connection_uri": uri_nearest,
                "tls": True,
                "tlsAllowInvalidCertificates": True,
                "serverSelectionTimeoutMS": 60000,
                "connectTimeoutMS": 60000,
                "socketTimeoutMS": 60000,
            },
            # Strategy 3: Standard connection with certifi and secondaryPreferred
            {
                "connection_uri": uri_secondary_preferred,
                "tls": True,
                "tlsAllowInvalidCertificates": False,
                "tlsCAFile": certifi.where() if HAS_CERTIFI else None,
                "serverSelectionTimeoutMS": 30000,
                "connectTimeoutMS": 30000,
                "socketTimeoutMS": 30000,
                "retryWrites": True,
                "maxPoolSize": 10,
            },
            # Strategy 4: PrimaryPreferred - fallback to primary if available
            {
                "connection_uri": uri_primary_preferred,
                "tls": True,
                "tlsAllowInvalidCertificates": True,
                "serverSelectionTimeoutMS": 60000,
            },
            # Strategy 5: Minimal SSL settings with secondaryPreferred
            {
                "connection_uri": uri_secondary_preferred,
                "tls": True,
                "tlsAllowInvalidCertificates": True,
            }
        ]
        
        last_error = None
        for i, config in enumerate(connection_attempts):
            try:
                print(f"🔄 Attempting MongoDB connection (strategy {i+1}/{len(connection_attempts)})...")
                
                # Extract connection_uri from config
                uri = config.pop("connection_uri")
                
                print(f"   Using URI: {uri[:80]}...")  # Print first 80 chars for debugging
                
                client = AsyncIOMotorClient(uri, **config)
                
                # Test connection - try a simple operation that works with read preference
                # The issue is that some operations still try to find primary even with read preference
                # So we'll use a simple find operation on a collection which respects read preference
                test_db = client[DATABASE_NAME]
                
                # Try to access a collection - this should work with read preference
                # Use find_one with limit 0 (just to test connection, doesn't return data)
                test_collection = test_db[COLLECTION_NAME]
                # Use find with limit 0 - this is a read operation that respects read preference
                async for _ in test_collection.find({}).limit(0):
                    break  # Just test connection, don't process results
                
                print(f"✅ Connected to MongoDB database: {DATABASE_NAME}")
                database = client[DATABASE_NAME]
                collection = database[COLLECTION_NAME]
                return True
                
            except Exception as e:
                last_error = e
                print(f"   Strategy {i+1} failed: {str(e)[:200]}")
                if client:
                    try:
                        client.close()
                    except:
                        pass
                    client = None
                continue
        
        # If all strategies failed, raise the last error
        raise last_error
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB after all attempts")
        print(f"   Last error: {str(e)}")
        print(f"\nTroubleshooting tips:")
        print(f"1. Check your MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for testing)")
        print(f"2. Verify your MongoDB username and password in the connection string")
        print(f"3. Ensure your network allows outbound connections to MongoDB Atlas (port 27017)")
        print(f"4. Check if MongoDB Atlas cluster is running and accessible")
        print(f"5. Try updating your Python SSL/TLS libraries: pip install --upgrade certifi")
        print(f"6. Check firewall/antivirus settings that might block SSL connections")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("✅ MongoDB connection closed")


async def get_database():
    """Get database instance"""
    if database is None:
        await connect_to_mongo()
    return database


async def get_collection():
    """Get collection instance"""
    if collection is None:
        await connect_to_mongo()
    return collection

