#!/usr/bin/env python3
"""
Fix skills by removing level field directly from MongoDB
"""

from pymongo import MongoClient
import os

# Connect to MongoDB
mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DB_NAME', 'mspndev')

client = MongoClient(mongo_url)
db = client[db_name]
skills_collection = db['skills']

# Remove level field from all skills
result = skills_collection.update_many(
    {"level": {"$exists": True}},  # Find documents with level field
    {"$unset": {"level": ""}}      # Remove the level field
)

print(f"Updated {result.modified_count} skills to remove level field")

# Verify the fix
skills = list(skills_collection.find({}))
has_level = any("level" in skill for skill in skills)
print(f"Skills still have level field: {has_level}")

if not has_level:
    print("✅ All skills fixed - no level fields remaining")
else:
    print("❌ Some skills still have level fields")

client.close()