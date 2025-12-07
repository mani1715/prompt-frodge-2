#!/usr/bin/env python3
"""
Fix existing skills by removing level fields
"""

import requests
import json

BASE_URL = "http://localhost:3000/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFhM2VmMWMyLTFjZDQtNDVmNC1hNDg4LWQwMjdmNDJlYTE2NSIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsInJvbGUiOiJzdXBlcl9hZG1pbiIsImlhdCI6MTc2NTA5ODEyNiwiZXhwIjoxNzY1NzAyOTI2fQ.wCFlwwyblogAt5jJmyFziGHVmhrfy8HpVOWBN-Ae9i0"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}

# Get all skills
response = requests.get(f"{BASE_URL}/skills", headers=headers)
if response.status_code == 200:
    skills = response.json()["skills"]
    print(f"Found {len(skills)} skills to fix")
    
    for skill in skills:
        if "level" in skill:
            skill_id = skill["id"]
            # Update skill without level field
            update_data = {
                "name": skill["name"],
                "icon": skill["icon"],
                "order": skill.get("order", 999)
            }
            
            update_response = requests.put(f"{BASE_URL}/skills/{skill_id}", 
                                         json=update_data, headers=headers)
            
            if update_response.status_code == 200:
                print(f"✅ Fixed skill: {skill['name']}")
            else:
                print(f"❌ Failed to fix skill: {skill['name']}")
        else:
            print(f"✅ Skill already clean: {skill['name']}")
else:
    print("Failed to get skills")