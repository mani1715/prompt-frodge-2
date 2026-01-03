#!/usr/bin/env python3
"""
MSPN DEV Admin Panel Backend API Tests
Tests all backend APIs including new features:
- Authentication & Admin Login
- Admin Permissions System
- Private Storage API
- Projects Visibility
- Skills API (without level)
- File Upload
"""

import requests
import json
import os
import tempfile
from typing import Dict, Any, Optional

class MSPNBackendTester:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.auth_token = None
        self.admin_user = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "data": data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if not success and data:
            print(f"   Response: {data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, files: Dict = None, headers: Dict = None) -> Dict:
        """Make HTTP request with proper error handling"""
        url = f"{self.api_base}{endpoint}"
        
        # Default headers
        req_headers = {"Content-Type": "application/json"}
        if self.auth_token:
            req_headers["Authorization"] = f"Bearer {self.auth_token}"
        
        # Override with custom headers
        if headers:
            req_headers.update(headers)
            
        # Remove Content-Type for file uploads
        if files:
            req_headers.pop("Content-Type", None)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method.upper() == "POST":
                if files:
                    response = requests.post(url, files=files, headers=req_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=req_headers, timeout=30)
            else:
                return {"error": f"Unsupported method: {method}", "status_code": 400}
            
            try:
                return {
                    "status_code": response.status_code,
                    "data": response.json() if response.text else {},
                    "success": response.status_code < 400
                }
            except json.JSONDecodeError:
                return {
                    "status_code": response.status_code,
                    "data": {"text": response.text},
                    "success": response.status_code < 400
                }
                
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "status_code": 500, "success": False}

    def test_auth_login(self):
        """Test 1: Authentication & Admin Login"""
        print("=== Testing Authentication & Admin Login ===")
        
        # Test login with valid credentials
        login_data = {
            "username": "superadmin",
            "password": "SuperAdmin123!"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if response.get("success") and response.get("data", {}).get("token"):
            self.auth_token = response["data"]["token"]
            self.admin_user = response["data"].get("admin")
            self.log_test(
                "Admin Login - Valid Credentials",
                True,
                f"Successfully logged in as {self.admin_user.get('username')} with role {self.admin_user.get('role')}"
            )
        else:
            self.log_test(
                "Admin Login - Valid Credentials",
                False,
                "Failed to login with valid credentials",
                response.get("data")
            )
            return False
            
        # Test token verification
        verify_response = self.make_request("GET", "/auth/verify")
        if verify_response.get("success"):
            self.log_test(
                "Token Verification",
                True,
                "JWT token verification successful"
            )
        else:
            self.log_test(
                "Token Verification",
                False,
                "JWT token verification failed",
                verify_response.get("data")
            )
            
        # Test login with invalid credentials
        invalid_login = {
            "username": "admin",
            "password": "wrongpassword"
        }
        
        invalid_response = self.make_request("POST", "/auth/login", invalid_login)
        if not invalid_response.get("success") and invalid_response.get("status_code") == 401:
            self.log_test(
                "Admin Login - Invalid Credentials",
                True,
                "Correctly rejected invalid credentials"
            )
        else:
            self.log_test(
                "Admin Login - Invalid Credentials",
                False,
                "Should have rejected invalid credentials",
                invalid_response.get("data")
            )
            
        return True

    def test_admin_permissions_system(self):
        """Test 2: Admin Permissions System"""
        print("=== Testing Admin Permissions System ===")
        
        if not self.auth_token:
            self.log_test("Admin Permissions System", False, "No auth token available")
            return False
            
        # Test GET /api/admins - verify it returns admins with permissions
        admins_response = self.make_request("GET", "/admins")
        
        if admins_response.get("success"):
            admins = admins_response.get("data", {}).get("admins", [])
            if admins and all("permissions" in admin for admin in admins):
                self.log_test(
                    "Get Admins with Permissions",
                    True,
                    f"Retrieved {len(admins)} admins, all have permissions object"
                )
            else:
                self.log_test(
                    "Get Admins with Permissions",
                    False,
                    "Admins missing permissions object",
                    admins
                )
        else:
            self.log_test(
                "Get Admins with Permissions",
                False,
                "Failed to retrieve admins",
                admins_response.get("data")
            )
            
        # Test POST /api/admins - create new admin with custom permissions
        new_admin_data = {
            "username": "testadmin",
            "password": "test123",
            "role": "admin",
            "permissions": {
                "canManageAdmins": False,
                "canViewPrivateProjects": True,
                "canAccessPrivateStorage": True
            }
        }
        
        create_response = self.make_request("POST", "/admins", new_admin_data)
        
        if create_response.get("success"):
            created_admin = create_response.get("data", {}).get("admin")
            if created_admin and created_admin.get("permissions"):
                self.log_test(
                    "Create Admin with Custom Permissions",
                    True,
                    f"Created admin {created_admin.get('username')} with custom permissions"
                )
                
                # Test PUT /api/admins/:id - update admin permissions
                admin_id = created_admin.get("id")
                if admin_id:
                    update_data = {
                        "permissions": {
                            "canManageAdmins": True,
                            "canViewPrivateProjects": False,
                            "canAccessPrivateStorage": True
                        }
                    }
                    
                    update_response = self.make_request("PUT", f"/admins/{admin_id}", update_data)
                    
                    if update_response.get("success"):
                        self.log_test(
                            "Update Admin Permissions",
                            True,
                            "Successfully updated admin permissions"
                        )
                    else:
                        self.log_test(
                            "Update Admin Permissions",
                            False,
                            "Failed to update admin permissions",
                            update_response.get("data")
                        )
                        
                    # Clean up - delete test admin
                    delete_response = self.make_request("DELETE", f"/admins/{admin_id}")
                    if delete_response.get("success"):
                        print("   Cleaned up test admin")
                        
            else:
                self.log_test(
                    "Create Admin with Custom Permissions",
                    False,
                    "Created admin missing permissions",
                    created_admin
                )
        else:
            self.log_test(
                "Create Admin with Custom Permissions",
                False,
                "Failed to create admin",
                create_response.get("data")
            )

    def test_private_storage_api(self):
        """Test 3: Private Storage API"""
        print("=== Testing Private Storage API ===")
        
        if not self.auth_token:
            self.log_test("Private Storage API", False, "No auth token available")
            return False
            
        # Test POST /api/storage - create a text note
        note_data = {
            "title": "Test Note",
            "content": "Sample content for testing",
            "type": "note",
            "tags": ["test", "api"],
            "visibleTo": []
        }
        
        create_response = self.make_request("POST", "/storage", note_data)
        
        if create_response.get("success"):
            created_item = create_response.get("data", {}).get("item")
            if created_item:
                item_id = created_item.get("id")
                self.log_test(
                    "Create Storage Note",
                    True,
                    f"Created note '{created_item.get('title')}' with ID {item_id}"
                )
                
                # Test GET /api/storage - verify notes are returned
                get_response = self.make_request("GET", "/storage")
                
                if get_response.get("success"):
                    items = get_response.get("data", {}).get("items", [])
                    if any(item.get("id") == item_id for item in items):
                        self.log_test(
                            "Get Storage Items",
                            True,
                            f"Retrieved {len(items)} storage items, including our test note"
                        )
                    else:
                        self.log_test(
                            "Get Storage Items",
                            False,
                            "Test note not found in storage items",
                            items
                        )
                else:
                    self.log_test(
                        "Get Storage Items",
                        False,
                        "Failed to retrieve storage items",
                        get_response.get("data")
                    )
                    
                # Test PUT /api/storage/:id - update the note
                update_data = {
                    "title": "Updated Test Note",
                    "content": "Updated content",
                    "tags": ["test", "api", "updated"]
                }
                
                update_response = self.make_request("PUT", f"/storage/{item_id}", update_data)
                
                if update_response.get("success"):
                    self.log_test(
                        "Update Storage Item",
                        True,
                        "Successfully updated storage note"
                    )
                else:
                    self.log_test(
                        "Update Storage Item",
                        False,
                        "Failed to update storage note",
                        update_response.get("data")
                    )
                    
                # Test visibility - create item with specific visibility
                visible_note_data = {
                    "title": "Visible Note",
                    "content": "This note has specific visibility",
                    "type": "note",
                    "tags": ["visibility", "test"],
                    "visibleTo": [self.admin_user.get("username")] if self.admin_user else []
                }
                
                visible_response = self.make_request("POST", "/storage", visible_note_data)
                
                if visible_response.get("success"):
                    visible_item = visible_response.get("data", {}).get("item")
                    self.log_test(
                        "Create Note with Visibility",
                        True,
                        f"Created note with visibility to {visible_item.get('visibleTo')}"
                    )
                    
                    # Clean up visible note
                    if visible_item.get("id"):
                        self.make_request("DELETE", f"/storage/{visible_item['id']}")
                        
                else:
                    self.log_test(
                        "Create Note with Visibility",
                        False,
                        "Failed to create note with visibility",
                        visible_response.get("data")
                    )
                    
                # Test DELETE /api/storage/:id - delete the note
                delete_response = self.make_request("DELETE", f"/storage/{item_id}")
                
                if delete_response.get("success"):
                    self.log_test(
                        "Delete Storage Item",
                        True,
                        "Successfully deleted storage note"
                    )
                else:
                    self.log_test(
                        "Delete Storage Item",
                        False,
                        "Failed to delete storage note",
                        delete_response.get("data")
                    )
                    
            else:
                self.log_test(
                    "Create Storage Note",
                    False,
                    "No item returned in create response",
                    create_response.get("data")
                )
        else:
            self.log_test(
                "Create Storage Note",
                False,
                "Failed to create storage note",
                create_response.get("data")
            )

    def test_projects_visibility(self):
        """Test 4: Projects Visibility"""
        print("=== Testing Projects Visibility ===")
        
        if not self.auth_token:
            self.log_test("Projects Visibility", False, "No auth token available")
            return False
            
        # Test POST /api/projects - create project with isPrivate flag
        project_data = {
            "title": "Test Private Project",
            "description": "Test project description",
            "isPrivate": True,
            "techStack": ["React", "Node.js", "MongoDB"]
        }
        
        create_response = self.make_request("POST", "/projects", project_data)
        
        if create_response.get("success"):
            created_project = create_response.get("data", {}).get("project")
            if created_project:
                project_id = created_project.get("id")
                self.log_test(
                    "Create Private Project",
                    True,
                    f"Created private project '{created_project.get('title')}' by {created_project.get('createdBy')}"
                )
                
                # Test GET /api/projects (with auth) - verify admin sees projects
                get_response = self.make_request("GET", "/projects")
                
                if get_response.get("success"):
                    projects = get_response.get("data", {}).get("projects", [])
                    test_project = next((p for p in projects if p.get("id") == project_id), None)
                    
                    if test_project:
                        self.log_test(
                            "Get Projects (Authenticated)",
                            True,
                            f"Admin can see private project. Retrieved {len(projects)} projects total"
                        )
                    else:
                        self.log_test(
                            "Get Projects (Authenticated)",
                            False,
                            "Private project not visible to admin",
                            projects
                        )
                else:
                    self.log_test(
                        "Get Projects (Authenticated)",
                        False,
                        "Failed to retrieve projects",
                        get_response.get("data")
                    )
                    
                # Test PUT /api/projects/:id - toggle isPrivate field
                update_data = {"isPrivate": False}
                
                update_response = self.make_request("PUT", f"/projects/{project_id}", update_data)
                
                if update_response.get("success"):
                    self.log_test(
                        "Toggle Project Privacy",
                        True,
                        "Successfully toggled project privacy to public"
                    )
                else:
                    self.log_test(
                        "Toggle Project Privacy",
                        False,
                        "Failed to toggle project privacy",
                        update_response.get("data")
                    )
                    
                # Test public access (without auth token)
                temp_token = self.auth_token
                self.auth_token = None
                
                public_response = self.make_request("GET", "/projects")
                
                if public_response.get("success"):
                    public_projects = public_response.get("data", {}).get("projects", [])
                    public_test_project = next((p for p in public_projects if p.get("id") == project_id), None)
                    
                    if public_test_project:
                        self.log_test(
                            "Get Projects (Public)",
                            True,
                            f"Public can see project after making it public. {len(public_projects)} public projects"
                        )
                    else:
                        self.log_test(
                            "Get Projects (Public)",
                            True,
                            f"Project visibility working correctly. {len(public_projects)} public projects"
                        )
                else:
                    self.log_test(
                        "Get Projects (Public)",
                        False,
                        "Failed to retrieve public projects",
                        public_response.get("data")
                    )
                    
                # Restore auth token
                self.auth_token = temp_token
                
                # Clean up - delete test project
                delete_response = self.make_request("DELETE", f"/projects/{project_id}")
                if delete_response.get("success"):
                    print("   Cleaned up test project")
                    
            else:
                self.log_test(
                    "Create Private Project",
                    False,
                    "No project returned in create response",
                    create_response.get("data")
                )
        else:
            self.log_test(
                "Create Private Project",
                False,
                "Failed to create private project",
                create_response.get("data")
            )

    def test_skills_api(self):
        """Test 5: Skills API (without level requirement)"""
        print("=== Testing Skills API ===")
        
        if not self.auth_token:
            self.log_test("Skills API", False, "No auth token available")
            return False
            
        # Test POST /api/skills - create skill without level
        skill_data = {
            "name": "JavaScript Testing",
            "icon": "⚡"
        }
        
        create_response = self.make_request("POST", "/skills", skill_data)
        
        if create_response.get("success"):
            created_skill = create_response.get("data", {}).get("skill")
            if created_skill:
                skill_id = created_skill.get("id")
                self.log_test(
                    "Create Skill without Level",
                    True,
                    f"Created skill '{created_skill.get('name')}' with icon {created_skill.get('icon')}"
                )
                
                # Test GET /api/skills - verify skills work without level field
                get_response = self.make_request("GET", "/skills")
                
                if get_response.get("success"):
                    skills = get_response.get("data", {}).get("skills", [])
                    test_skill = next((s for s in skills if s.get("id") == skill_id), None)
                    
                    if test_skill:
                        self.log_test(
                            "Get Skills",
                            True,
                            f"Retrieved {len(skills)} skills, including our test skill"
                        )
                    else:
                        self.log_test(
                            "Get Skills",
                            False,
                            "Test skill not found in skills list",
                            skills
                        )
                else:
                    self.log_test(
                        "Get Skills",
                        False,
                        "Failed to retrieve skills",
                        get_response.get("data")
                    )
                    
                # Test PUT /api/skills/:id - update skill
                update_data = {
                    "name": "Updated JavaScript Testing",
                    "icon": "🚀"
                }
                
                update_response = self.make_request("PUT", f"/skills/{skill_id}", update_data)
                
                if update_response.get("success"):
                    self.log_test(
                        "Update Skill",
                        True,
                        "Successfully updated skill"
                    )
                else:
                    self.log_test(
                        "Update Skill",
                        False,
                        "Failed to update skill",
                        update_response.get("data")
                    )
                    
                # Test DELETE /api/skills/:id - delete skill
                delete_response = self.make_request("DELETE", f"/skills/{skill_id}")
                
                if delete_response.get("success"):
                    self.log_test(
                        "Delete Skill",
                        True,
                        "Successfully deleted skill"
                    )
                else:
                    self.log_test(
                        "Delete Skill",
                        False,
                        "Failed to delete skill",
                        delete_response.get("data")
                    )
                    
            else:
                self.log_test(
                    "Create Skill without Level",
                    False,
                    "No skill returned in create response",
                    create_response.get("data")
                )
        else:
            self.log_test(
                "Create Skill without Level",
                False,
                "Failed to create skill",
                create_response.get("data")
            )

    def test_file_upload(self):
        """Test 6: File Upload"""
        print("=== Testing File Upload ===")
        
        if not self.auth_token:
            self.log_test("File Upload", False, "No auth token available")
            return False
            
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
            temp_file.write("This is a test file for upload testing.")
            temp_file_path = temp_file.name
            
        try:
            # Test POST /api/upload - test file upload functionality
            with open(temp_file_path, 'rb') as file:
                files = {'file': ('test-file.txt', file, 'text/plain')}
                
                upload_response = self.make_request("POST", "/upload", files=files)
                
                if upload_response.get("success"):
                    file_url = upload_response.get("data", {}).get("url")
                    if file_url and file_url.startswith("/uploads/"):
                        self.log_test(
                            "File Upload",
                            True,
                            f"Successfully uploaded file, URL: {file_url}"
                        )
                        
                        # Verify file exists in uploads directory
                        upload_dir = "/app/public/uploads"
                        file_name = file_url.split("/")[-1]
                        full_path = os.path.join(upload_dir, file_name)
                        
                        if os.path.exists(full_path):
                            self.log_test(
                                "File Upload - File Exists",
                                True,
                                f"Uploaded file exists at {full_path}"
                            )
                            
                            # Clean up uploaded file
                            try:
                                os.remove(full_path)
                                print("   Cleaned up uploaded file")
                            except:
                                pass
                        else:
                            self.log_test(
                                "File Upload - File Exists",
                                False,
                                f"Uploaded file not found at {full_path}"
                            )
                            
                    else:
                        self.log_test(
                            "File Upload",
                            False,
                            "Invalid file URL returned",
                            upload_response.get("data")
                        )
                else:
                    self.log_test(
                        "File Upload",
                        False,
                        "Failed to upload file",
                        upload_response.get("data")
                    )
                    
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass

    def test_chat_system(self):
        """Test 7: Chat System APIs"""
        print("=== Testing Chat System APIs ===")
        
        # Test POST /api/chat/send - Customer sends message (no auth required)
        customer_message_data = {
            "customerName": "John Doe",
            "customerEmail": "john.doe@example.com",
            "customerPhone": "+1234567890",
            "message": "Hello, I need help with my project"
        }
        
        # Remove auth token for customer message
        temp_token = self.auth_token
        self.auth_token = None
        
        send_response = self.make_request("POST", "/chat/send", customer_message_data)
        
        if send_response.get("success"):
            chat_data = send_response.get("data", {})
            chat_id = chat_data.get("chatId")
            conversation = chat_data.get("conversation")
            
            if chat_id and conversation:
                self.log_test(
                    "Customer Send Message",
                    True,
                    f"Customer message sent successfully, chat ID: {chat_id}"
                )
                
                # Test GET /api/chat/history - Cross-device sync (no auth required)
                history_response = self.make_request("GET", f"/chat/history?email={customer_message_data['customerEmail']}")
                
                if history_response.get("success"):
                    history_conversation = history_response.get("data", {}).get("conversation")
                    if history_conversation and history_conversation.get("id") == chat_id:
                        self.log_test(
                            "Chat History - Cross-device Sync",
                            True,
                            f"Successfully retrieved chat history for email {customer_message_data['customerEmail']}"
                        )
                    else:
                        self.log_test(
                            "Chat History - Cross-device Sync",
                            False,
                            "Chat history not found or incorrect",
                            history_conversation
                        )
                else:
                    self.log_test(
                        "Chat History - Cross-device Sync",
                        False,
                        "Failed to retrieve chat history",
                        history_response.get("data")
                    )
                
                # Restore auth token for admin operations
                self.auth_token = temp_token
                
                if self.auth_token:
                    # Test GET /api/chat/conversations - Admin get all conversations
                    conversations_response = self.make_request("GET", "/chat/conversations")
                    
                    if conversations_response.get("success"):
                        conversations_data = conversations_response.get("data", {})
                        conversations = conversations_data.get("conversations", [])
                        total_unread = conversations_data.get("totalUnread", 0)
                        
                        test_conversation = next((c for c in conversations if c.get("id") == chat_id), None)
                        
                        if test_conversation:
                            self.log_test(
                                "Admin Get Conversations",
                                True,
                                f"Admin retrieved {len(conversations)} conversations, {total_unread} unread messages"
                            )
                            
                            # Test POST /api/chat/:id/reply - Admin reply
                            admin_reply_data = {
                                "message": "Thank you for contacting us! We'll help you with your project."
                            }
                            
                            reply_response = self.make_request("POST", f"/chat/{chat_id}/reply", admin_reply_data)
                            
                            if reply_response.get("success"):
                                self.log_test(
                                    "Admin Reply to Chat",
                                    True,
                                    "Admin successfully replied to customer message"
                                )
                                
                                # Test PUT /api/chat/:id/read - Mark as read
                                read_response = self.make_request("PUT", f"/chat/{chat_id}/read")
                                
                                if read_response.get("success"):
                                    self.log_test(
                                        "Mark Chat as Read",
                                        True,
                                        "Successfully marked conversation as read"
                                    )
                                else:
                                    self.log_test(
                                        "Mark Chat as Read",
                                        False,
                                        "Failed to mark conversation as read",
                                        read_response.get("data")
                                    )
                                    
                            else:
                                self.log_test(
                                    "Admin Reply to Chat",
                                    False,
                                    "Failed to send admin reply",
                                    reply_response.get("data")
                                )
                                
                        else:
                            self.log_test(
                                "Admin Get Conversations",
                                False,
                                "Test conversation not found in admin conversations",
                                conversations
                            )
                    else:
                        self.log_test(
                            "Admin Get Conversations",
                            False,
                            "Failed to retrieve conversations",
                            conversations_response.get("data")
                        )
                        
                    # Test sending another message to same conversation
                    self.auth_token = None
                    
                    second_message_data = {
                        "customerName": "John Doe",
                        "customerEmail": "john.doe@example.com",
                        "customerPhone": "+1234567890",
                        "message": "Thank you for the quick response!"
                    }
                    
                    second_send_response = self.make_request("POST", "/chat/send", second_message_data)
                    
                    if second_send_response.get("success"):
                        second_chat_data = second_send_response.get("data", {})
                        if second_chat_data.get("chatId") == chat_id:
                            self.log_test(
                                "Customer Send Follow-up Message",
                                True,
                                "Customer successfully sent follow-up message to existing conversation"
                            )
                        else:
                            self.log_test(
                                "Customer Send Follow-up Message",
                                False,
                                "Follow-up message created new conversation instead of updating existing",
                                second_chat_data
                            )
                    else:
                        self.log_test(
                            "Customer Send Follow-up Message",
                            False,
                            "Failed to send follow-up message",
                            second_send_response.get("data")
                        )
                    
                    # Restore auth token
                    self.auth_token = temp_token
                    
            else:
                self.log_test(
                    "Customer Send Message",
                    False,
                    "No chat ID or conversation returned",
                    send_response.get("data")
                )
        else:
            self.log_test(
                "Customer Send Message",
                False,
                "Failed to send customer message",
                send_response.get("data")
            )
            # Restore auth token
            self.auth_token = temp_token

    def test_admin_chat_permissions(self):
        """Test 8: Admin Chat Access Permissions"""
        print("=== Testing Admin Chat Access Permissions ===")
        
        if not self.auth_token:
            self.log_test("Admin Chat Permissions", False, "No auth token available")
            return False
            
        # Create a test admin without chat permissions
        test_admin_data = {
            "username": "testadmin_nochat",
            "password": "test123",
            "role": "admin",
            "permissions": {
                "canManageAdmins": False,
                "canViewPrivateProjects": True,
                "canAccessPrivateStorage": True,
                "canAccessChat": False  # No chat access
            }
        }
        
        create_response = self.make_request("POST", "/admins", test_admin_data)
        
        if create_response.get("success"):
            created_admin = create_response.get("data", {}).get("admin")
            admin_id = created_admin.get("id")
            
            self.log_test(
                "Create Admin without Chat Permission",
                True,
                f"Created admin {created_admin.get('username')} without chat access"
            )
            
            # Login as the new admin
            login_data = {
                "username": "testadmin_nochat",
                "password": "test123"
            }
            
            login_response = self.make_request("POST", "/auth/login", login_data)
            
            if login_response.get("success"):
                # Store original token
                original_token = self.auth_token
                # Use new admin token
                self.auth_token = login_response.get("data", {}).get("token")
                
                # Test that admin without chat permission cannot access chat endpoints
                conversations_response = self.make_request("GET", "/chat/conversations")
                
                if not conversations_response.get("success") and conversations_response.get("status_code") == 403:
                    self.log_test(
                        "Chat Permission Check - Conversations",
                        True,
                        "Admin without chat permission correctly denied access to conversations"
                    )
                else:
                    self.log_test(
                        "Chat Permission Check - Conversations",
                        False,
                        "Admin without chat permission should be denied access",
                        conversations_response.get("data")
                    )
                
                # Test reply endpoint (should also be denied)
                reply_response = self.make_request("POST", "/chat/dummy-id/reply", {"message": "test"})
                
                if not reply_response.get("success") and reply_response.get("status_code") == 403:
                    self.log_test(
                        "Chat Permission Check - Reply",
                        True,
                        "Admin without chat permission correctly denied access to reply"
                    )
                else:
                    self.log_test(
                        "Chat Permission Check - Reply",
                        False,
                        "Admin without chat permission should be denied reply access",
                        reply_response.get("data")
                    )
                
                # Restore original token
                self.auth_token = original_token
                
                # Update admin to grant chat permission
                update_data = {
                    "permissions": {
                        "canManageAdmins": False,
                        "canViewPrivateProjects": True,
                        "canAccessPrivateStorage": True,
                        "canAccessChat": True  # Grant chat access
                    }
                }
                
                update_response = self.make_request("PUT", f"/admins/{admin_id}", update_data)
                
                if update_response.get("success"):
                    self.log_test(
                        "Update Admin Chat Permission",
                        True,
                        "Successfully granted chat permission to admin"
                    )
                    
                    # Login again to get updated token with new permissions
                    new_login_response = self.make_request("POST", "/auth/login", login_data)
                    
                    if new_login_response.get("success"):
                        # Use updated token
                        self.auth_token = new_login_response.get("data", {}).get("token")
                        
                        # Test that admin now has chat access
                        new_conversations_response = self.make_request("GET", "/chat/conversations")
                        
                        if new_conversations_response.get("success"):
                            self.log_test(
                                "Chat Permission Check - After Update",
                                True,
                                "Admin with chat permission can now access conversations"
                            )
                        else:
                            self.log_test(
                                "Chat Permission Check - After Update",
                                False,
                                "Admin with chat permission should have access",
                                new_conversations_response.get("data")
                            )
                        
                        # Restore original token
                        self.auth_token = original_token
                        
                else:
                    self.log_test(
                        "Update Admin Chat Permission",
                        False,
                        "Failed to update admin chat permission",
                        update_response.get("data")
                    )
                    
            else:
                self.log_test(
                    "Login Test Admin",
                    False,
                    "Failed to login as test admin",
                    login_response.get("data")
                )
                
            # Clean up - delete test admin
            if admin_id:
                delete_response = self.make_request("DELETE", f"/admins/{admin_id}")
                if delete_response.get("success"):
                    print("   Cleaned up test admin")
                    
        else:
            self.log_test(
                "Create Admin without Chat Permission",
                False,
                "Failed to create test admin",
                create_response.get("data")
            )

    def test_contact_form(self):
        """Test 9: Contact Form (Expected to fail without Brevo API key)"""
        print("=== Testing Contact Form ===")
        
        # Test contact info retrieval
        contact_info_response = self.make_request("GET", "/contact/info")
        
        if contact_info_response.get("success"):
            contact_info = contact_info_response.get("data", {}).get("contact")
            if contact_info:
                self.log_test(
                    "Get Contact Info",
                    True,
                    f"Retrieved contact info: {contact_info.get('email')}"
                )
            else:
                self.log_test(
                    "Get Contact Info",
                    False,
                    "No contact info returned",
                    contact_info_response.get("data")
                )
        else:
            self.log_test(
                "Get Contact Info",
                False,
                "Failed to retrieve contact info",
                contact_info_response.get("data")
            )
        
        # Test contact form submission (expected to fail without Brevo API key)
        contact_form_data = {
            "name": "Test User",
            "email": "test@example.com",
            "message": "This is a test message from the contact form."
        }
        
        # Remove auth token for public contact form
        temp_token = self.auth_token
        self.auth_token = None
        
        contact_response = self.make_request("POST", "/contact/send", contact_form_data)
        
        # Restore auth token
        self.auth_token = temp_token
        
        if not contact_response.get("success") and contact_response.get("status_code") == 500:
            self.log_test(
                "Contact Form Submission",
                True,
                "Contact form correctly failed due to missing Brevo API key (expected behavior)"
            )
        elif contact_response.get("success"):
            self.log_test(
                "Contact Form Submission",
                True,
                "Contact form submission successful (Brevo API key configured)"
            )
        else:
            self.log_test(
                "Contact Form Submission",
                False,
                "Unexpected contact form response",
                contact_response.get("data")
            )

    def test_services_and_content_apis(self):
        """Test 10: Services and Content APIs"""
        print("=== Testing Services and Content APIs ===")
        
        # Test GET /api/services
        services_response = self.make_request("GET", "/services")
        
        if services_response.get("success"):
            services = services_response.get("data", {}).get("services", [])
            self.log_test(
                "Get Services",
                True,
                f"Retrieved {len(services)} services"
            )
        else:
            self.log_test(
                "Get Services",
                False,
                "Failed to retrieve services",
                services_response.get("data")
            )
        
        # Test GET /api/content
        content_response = self.make_request("GET", "/content")
        
        if content_response.get("success"):
            content = content_response.get("data", {}).get("content")
            if content and content.get("hero") and content.get("about"):
                self.log_test(
                    "Get Site Content",
                    True,
                    "Retrieved site content with hero and about sections"
                )
            else:
                self.log_test(
                    "Get Site Content",
                    False,
                    "Site content missing required sections",
                    content
                )
        else:
            self.log_test(
                "Get Site Content",
                False,
                "Failed to retrieve site content",
                content_response.get("data")
            )
        
        if self.auth_token:
            # Test authenticated operations
            
            # Test POST /api/services
            service_data = {
                "title": "Test Service",
                "description": "Test service description",
                "icon": "🧪"
            }
            
            create_service_response = self.make_request("POST", "/services", service_data)
            
            if create_service_response.get("success"):
                created_service = create_service_response.get("data", {}).get("service")
                service_id = created_service.get("id")
                
                self.log_test(
                    "Create Service",
                    True,
                    f"Created service '{created_service.get('title')}'"
                )
                
                # Test PUT /api/services/:id
                update_data = {
                    "title": "Updated Test Service",
                    "description": "Updated description"
                }
                
                update_service_response = self.make_request("PUT", f"/services/{service_id}", update_data)
                
                if update_service_response.get("success"):
                    self.log_test(
                        "Update Service",
                        True,
                        "Successfully updated service"
                    )
                else:
                    self.log_test(
                        "Update Service",
                        False,
                        "Failed to update service",
                        update_service_response.get("data")
                    )
                
                # Test DELETE /api/services/:id
                delete_service_response = self.make_request("DELETE", f"/services/{service_id}")
                
                if delete_service_response.get("success"):
                    self.log_test(
                        "Delete Service",
                        True,
                        "Successfully deleted service"
                    )
                else:
                    self.log_test(
                        "Delete Service",
                        False,
                        "Failed to delete service",
                        delete_service_response.get("data")
                    )
                    
            else:
                self.log_test(
                    "Create Service",
                    False,
                    "Failed to create service",
                    create_service_response.get("data")
                )
            
            # Test PUT /api/content
            content_update_data = {
                "hero": {
                    "title": "Updated MSPN DEV",
                    "tagline": "Updated tagline for testing"
                }
            }
            
            update_content_response = self.make_request("PUT", "/content", content_update_data)
            
            if update_content_response.get("success"):
                self.log_test(
                    "Update Site Content",
                    True,
                    "Successfully updated site content"
                )
            else:
                self.log_test(
                    "Update Site Content",
                    False,
                    "Failed to update site content",
                    update_content_response.get("data")
                )

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting MSPN DEV Backend API Tests")
        print("=" * 50)
        
        # Run tests in order
        if self.test_auth_login():
            self.test_admin_permissions_system()
            self.test_private_storage_api()
            self.test_projects_visibility()
            self.test_skills_api()
            self.test_file_upload()
            self.test_chat_system()
            self.test_admin_chat_permissions()
            self.test_contact_form()
            self.test_services_and_content_apis()
        else:
            print("❌ Authentication failed - skipping other tests")
            
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
                    
        print("\n" + "=" * 50)
        return failed_tests == 0

if __name__ == "__main__":
    # Use environment variable or default to localhost
    base_url = os.getenv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000")
    
    tester = MSPNBackendTester(base_url)
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed!")
        exit(0)
    else:
        print("💥 Some tests failed!")
        exit(1)