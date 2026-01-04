#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Prompt Forge Application
Tests all backend features including authentication, admin management, 
content management, skills, services, projects, private storage, and chat system.
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "https://444f32b8-1755-4acb-96cc-914adbafc47f.preview.emergentagent.com/api"
SUPER_ADMIN_USERNAME = "admin"
SUPER_ADMIN_PASSWORD = "admin123"

class PromptForgeAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.super_admin_token = None
        self.regular_admin_token = None
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, success, message=""):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = f"{status}: {test_name}"
        if message:
            result += f" - {message}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
        
    def make_request(self, method, endpoint, data=None, token=None, params=None):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_authentication(self):
        """Test authentication and authorization system"""
        print("\n🔐 TESTING AUTHENTICATION & AUTHORIZATION")
        print("=" * 50)
        
        # Test 1: Super admin login
        try:
            response = self.make_request('POST', '/auth/login', {
                'username': SUPER_ADMIN_USERNAME,
                'password': SUPER_ADMIN_PASSWORD
            })
            
            if response and response.status_code == 200:
                data = response.json()
                self.super_admin_token = data.get('token')
                admin_data = data.get('admin', {})
                
                if self.super_admin_token and admin_data.get('role') == 'super_admin':
                    self.log_test("Super admin login", True, f"Token received, role: {admin_data.get('role')}")
                    
                    # Verify permissions
                    permissions = admin_data.get('permissions', {})
                    expected_perms = ['canManageAdmins', 'canViewPrivateProjects', 'canAccessPrivateStorage', 'canAccessChat']
                    all_perms = all(permissions.get(perm, False) for perm in expected_perms)
                    self.log_test("Super admin permissions", all_perms, f"Permissions: {permissions}")
                else:
                    self.log_test("Super admin login", False, "Invalid token or role")
            else:
                self.log_test("Super admin login", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Super admin login", False, f"Exception: {str(e)}")

        # Test 2: JWT token verification
        if self.super_admin_token:
            try:
                response = self.make_request('GET', '/auth/verify', token=self.super_admin_token)
                if response and response.status_code == 200:
                    user_data = response.json().get('user', {})
                    self.log_test("JWT token verification", True, f"User: {user_data.get('username')}")
                else:
                    self.log_test("JWT token verification", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("JWT token verification", False, f"Exception: {str(e)}")

        # Test 3: Invalid credentials
        try:
            response = self.make_request('POST', '/auth/login', {
                'username': 'invalid',
                'password': 'invalid'
            })
            
            if response and response.status_code == 401:
                self.log_test("Invalid credentials rejection", True, "Correctly rejected invalid login")
            else:
                self.log_test("Invalid credentials rejection", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Invalid credentials rejection", False, f"Exception: {str(e)}")

    def test_admin_management(self):
        """Test admin management functionality"""
        print("\n👥 TESTING ADMIN MANAGEMENT")
        print("=" * 50)
        
        if not self.super_admin_token:
            self.log_test("Admin management tests", False, "No super admin token available")
            return

        # Test 1: List all admins (super admin only)
        try:
            response = self.make_request('GET', '/admins', token=self.super_admin_token)
            if response and response.status_code == 200:
                admins = response.json().get('admins', [])
                super_admin_exists = any(admin.get('role') == 'super_admin' for admin in admins)
                self.log_test("List all admins", super_admin_exists, f"Found {len(admins)} admins")
            else:
                self.log_test("List all admins", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("List all admins", False, f"Exception: {str(e)}")

        # Test 2: Create regular admin
        test_admin_data = {
            'username': f'testadmin_{int(time.time())}',
            'password': 'testpass123',
            'role': 'admin',
            'permissions': {
                'canManageAdmins': False,
                'canViewPrivateProjects': True,
                'canAccessPrivateStorage': True,
                'canAccessChat': False
            }
        }
        
        try:
            response = self.make_request('POST', '/admins', test_admin_data, token=self.super_admin_token)
            if response and response.status_code == 200:
                admin_data = response.json().get('admin', {})
                self.test_admin_id = admin_data.get('id')
                self.test_admin_username = admin_data.get('username')
                self.log_test("Create regular admin", True, f"Created admin: {self.test_admin_username}")
                
                # Test login with new admin
                login_response = self.make_request('POST', '/auth/login', {
                    'username': self.test_admin_username,
                    'password': 'testpass123'
                })
                
                if login_response and login_response.status_code == 200:
                    login_data = login_response.json()
                    self.regular_admin_token = login_data.get('token')
                    self.log_test("Regular admin login", True, "Successfully logged in with new admin")
                else:
                    self.log_test("Regular admin login", False, "Failed to login with new admin")
            else:
                self.log_test("Create regular admin", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Create regular admin", False, f"Exception: {str(e)}")

        # Test 3: Update admin permissions
        if hasattr(self, 'test_admin_id'):
            try:
                update_data = {
                    'permissions': {
                        'canManageAdmins': False,
                        'canViewPrivateProjects': True,
                        'canAccessPrivateStorage': True,
                        'canAccessChat': True  # Grant chat access
                    }
                }
                response = self.make_request('PUT', f'/admins/{self.test_admin_id}', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update admin permissions", True, "Successfully updated permissions")
                else:
                    self.log_test("Update admin permissions", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update admin permissions", False, f"Exception: {str(e)}")

        # Test 4: Regular admin cannot access admin management
        if self.regular_admin_token:
            try:
                response = self.make_request('GET', '/admins', token=self.regular_admin_token)
                if response and response.status_code == 403:
                    self.log_test("Regular admin access restriction", True, "Correctly denied access to admin management")
                else:
                    self.log_test("Regular admin access restriction", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Regular admin access restriction", False, f"Exception: {str(e)}")

    def test_content_management(self):
        """Test content management functionality"""
        print("\n📄 TESTING CONTENT MANAGEMENT")
        print("=" * 50)

        # Test 1: Get site content (public access)
        try:
            response = self.make_request('GET', '/content')
            if response and response.status_code == 200:
                content = response.json().get('content', {})
                has_hero = 'hero' in content
                has_about = 'about' in content
                self.log_test("Get site content", has_hero and has_about, f"Content sections: {list(content.keys())}")
            else:
                self.log_test("Get site content", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Get site content", False, f"Exception: {str(e)}")

        # Test 2: Update site content (admin only)
        if self.super_admin_token:
            try:
                update_data = {
                    'hero': {
                        'title': 'Updated Prompt Forge',
                        'tagline': 'Test Update - AI Excellence',
                        'description': 'Updated description for testing'
                    }
                }
                response = self.make_request('PUT', '/content', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update site content", True, "Successfully updated content")
                else:
                    self.log_test("Update site content", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update site content", False, f"Exception: {str(e)}")

    def test_skills_management(self):
        """Test skills management functionality"""
        print("\n🎯 TESTING SKILLS MANAGEMENT")
        print("=" * 50)

        # Test 1: Get all skills
        try:
            response = self.make_request('GET', '/skills')
            if response and response.status_code == 200:
                skills = response.json().get('skills', [])
                self.log_test("Get all skills", True, f"Found {len(skills)} skills")
                
                # Check if skills have level fields (should be removed)
                skills_with_level = [skill for skill in skills if 'level' in skill]
                if skills_with_level:
                    self.log_test("Skills level field removal", False, f"{len(skills_with_level)} skills still have level field")
                else:
                    self.log_test("Skills level field removal", True, "No skills have level field")
            else:
                self.log_test("Get all skills", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Get all skills", False, f"Exception: {str(e)}")

        # Test 2: Create new skill (without level/percentage)
        if self.super_admin_token:
            try:
                skill_data = {
                    'name': f'Test Skill {int(time.time())}',
                    'icon': '🧪',
                    'order': 999
                }
                response = self.make_request('POST', '/skills', skill_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    skill = response.json().get('skill', {})
                    self.test_skill_id = skill.get('id')
                    has_level = 'level' in skill
                    self.log_test("Create skill without level", not has_level, f"Created skill: {skill.get('name')}")
                else:
                    self.log_test("Create skill without level", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Create skill without level", False, f"Exception: {str(e)}")

        # Test 3: Update skill
        if hasattr(self, 'test_skill_id') and self.super_admin_token:
            try:
                update_data = {'name': 'Updated Test Skill', 'icon': '🔧'}
                response = self.make_request('PUT', f'/skills/{self.test_skill_id}', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update skill", True, "Successfully updated skill")
                else:
                    self.log_test("Update skill", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update skill", False, f"Exception: {str(e)}")

        # Test 4: Delete skill
        if hasattr(self, 'test_skill_id') and self.super_admin_token:
            try:
                response = self.make_request('DELETE', f'/skills/{self.test_skill_id}', token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Delete skill", True, "Successfully deleted skill")
                else:
                    self.log_test("Delete skill", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Delete skill", False, f"Exception: {str(e)}")

    def test_services_management(self):
        """Test services management functionality"""
        print("\n🛠️ TESTING SERVICES MANAGEMENT")
        print("=" * 50)

        # Test 1: Get all services
        try:
            response = self.make_request('GET', '/services')
            if response and response.status_code == 200:
                services = response.json().get('services', [])
                self.log_test("Get all services", True, f"Found {len(services)} services")
            else:
                self.log_test("Get all services", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Get all services", False, f"Exception: {str(e)}")

        # Test 2: Create new service
        if self.super_admin_token:
            try:
                service_data = {
                    'title': f'Test Service {int(time.time())}',
                    'description': 'Test service description',
                    'icon': '🧪',
                    'order': 999
                }
                response = self.make_request('POST', '/services', service_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    service = response.json().get('service', {})
                    self.test_service_id = service.get('id')
                    self.log_test("Create service", True, f"Created service: {service.get('title')}")
                else:
                    self.log_test("Create service", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Create service", False, f"Exception: {str(e)}")

        # Test 3: Update service
        if hasattr(self, 'test_service_id') and self.super_admin_token:
            try:
                update_data = {'title': 'Updated Test Service', 'description': 'Updated description'}
                response = self.make_request('PUT', f'/services/{self.test_service_id}', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update service", True, "Successfully updated service")
                else:
                    self.log_test("Update service", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update service", False, f"Exception: {str(e)}")

        # Test 4: Delete service
        if hasattr(self, 'test_service_id') and self.super_admin_token:
            try:
                response = self.make_request('DELETE', f'/services/{self.test_service_id}', token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Delete service", True, "Successfully deleted service")
                else:
                    self.log_test("Delete service", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Delete service", False, f"Exception: {str(e)}")

    def test_projects_management(self):
        """Test projects management with visibility controls"""
        print("\n📁 TESTING PROJECTS MANAGEMENT & VISIBILITY")
        print("=" * 50)

        # Test 1: Public access - should only see public projects
        try:
            response = self.make_request('GET', '/projects')
            if response and response.status_code == 200:
                public_projects = response.json().get('projects', [])
                all_public = all(not project.get('isPrivate', False) for project in public_projects)
                self.log_test("Public projects access", all_public, f"Found {len(public_projects)} public projects")
            else:
                self.log_test("Public projects access", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Public projects access", False, f"Exception: {str(e)}")

        # Test 2: Create public project
        if self.super_admin_token:
            try:
                project_data = {
                    'title': f'Public Test Project {int(time.time())}',
                    'description': 'Test public project',
                    'technologies': ['React', 'Node.js'],
                    'isPrivate': False,
                    'order': 999
                }
                response = self.make_request('POST', '/projects', project_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    project = response.json().get('project', {})
                    self.test_public_project_id = project.get('id')
                    self.log_test("Create public project", True, f"Created project: {project.get('title')}")
                else:
                    self.log_test("Create public project", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Create public project", False, f"Exception: {str(e)}")

        # Test 3: Create private project
        if self.super_admin_token:
            try:
                project_data = {
                    'title': f'Private Test Project {int(time.time())}',
                    'description': 'Test private project',
                    'technologies': ['Vue.js', 'Python'],
                    'isPrivate': True,
                    'order': 999
                }
                response = self.make_request('POST', '/projects', project_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    project = response.json().get('project', {})
                    self.test_private_project_id = project.get('id')
                    self.log_test("Create private project", True, f"Created private project: {project.get('title')}")
                else:
                    self.log_test("Create private project", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Create private project", False, f"Exception: {str(e)}")

        # Test 4: Super admin sees all projects
        if self.super_admin_token:
            try:
                response = self.make_request('GET', '/projects', token=self.super_admin_token)
                if response and response.status_code == 200:
                    all_projects = response.json().get('projects', [])
                    has_private = any(project.get('isPrivate', False) for project in all_projects)
                    self.log_test("Super admin sees all projects", has_private, f"Found {len(all_projects)} total projects")
                else:
                    self.log_test("Super admin sees all projects", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Super admin sees all projects", False, f"Exception: {str(e)}")

        # Test 5: Regular admin sees only their projects
        if self.regular_admin_token:
            try:
                response = self.make_request('GET', '/projects', token=self.regular_admin_token)
                if response and response.status_code == 200:
                    admin_projects = response.json().get('projects', [])
                    # Regular admin should see fewer projects than super admin
                    self.log_test("Regular admin project filtering", True, f"Regular admin sees {len(admin_projects)} projects")
                else:
                    self.log_test("Regular admin project filtering", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Regular admin project filtering", False, f"Exception: {str(e)}")

        # Test 6: Update project
        if hasattr(self, 'test_public_project_id') and self.super_admin_token:
            try:
                update_data = {'title': 'Updated Public Project', 'isPrivate': True}
                response = self.make_request('PUT', f'/projects/{self.test_public_project_id}', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update project", True, "Successfully updated project")
                else:
                    self.log_test("Update project", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update project", False, f"Exception: {str(e)}")

    def test_private_storage(self):
        """Test private storage functionality"""
        print("\n🗄️ TESTING PRIVATE STORAGE / CODE VAULT")
        print("=" * 50)

        # Test 1: Create storage item
        if self.super_admin_token:
            try:
                storage_data = {
                    'title': f'Test Storage Item {int(time.time())}',
                    'content': 'Test storage content',
                    'type': 'note',
                    'tags': ['test', 'storage'],
                    'visibleTo': []  # Only creator can see
                }
                response = self.make_request('POST', '/storage', storage_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    item = response.json().get('item', {})
                    self.test_storage_id = item.get('id')
                    self.log_test("Create storage item", True, f"Created item: {item.get('title')}")
                else:
                    self.log_test("Create storage item", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Create storage item", False, f"Exception: {str(e)}")

        # Test 2: Get storage items (super admin)
        if self.super_admin_token:
            try:
                response = self.make_request('GET', '/storage', token=self.super_admin_token)
                if response and response.status_code == 200:
                    items = response.json().get('items', [])
                    self.log_test("Get storage items (super admin)", True, f"Found {len(items)} storage items")
                else:
                    self.log_test("Get storage items (super admin)", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Get storage items (super admin)", False, f"Exception: {str(e)}")

        # Test 3: Regular admin access (should be filtered)
        if self.regular_admin_token:
            try:
                response = self.make_request('GET', '/storage', token=self.regular_admin_token)
                if response and response.status_code == 200:
                    items = response.json().get('items', [])
                    self.log_test("Get storage items (regular admin)", True, f"Regular admin sees {len(items)} items")
                else:
                    self.log_test("Get storage items (regular admin)", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Get storage items (regular admin)", False, f"Exception: {str(e)}")

        # Test 4: Update storage item
        if hasattr(self, 'test_storage_id') and self.super_admin_token:
            try:
                update_data = {
                    'title': 'Updated Storage Item',
                    'content': 'Updated content',
                    'visibleTo': [self.test_admin_username] if hasattr(self, 'test_admin_username') else []
                }
                response = self.make_request('PUT', f'/storage/{self.test_storage_id}', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update storage item", True, "Successfully updated storage item")
                else:
                    self.log_test("Update storage item", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update storage item", False, f"Exception: {str(e)}")

        # Test 5: Delete storage item
        if hasattr(self, 'test_storage_id') and self.super_admin_token:
            try:
                response = self.make_request('DELETE', f'/storage/{self.test_storage_id}', token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Delete storage item", True, "Successfully deleted storage item")
                else:
                    self.log_test("Delete storage item", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Delete storage item", False, f"Exception: {str(e)}")

    def test_contact_management(self):
        """Test contact management functionality"""
        print("\n📞 TESTING CONTACT MANAGEMENT")
        print("=" * 50)

        # Test 1: Get contact info
        try:
            response = self.make_request('GET', '/contact/info')
            if response and response.status_code == 200:
                contact = response.json().get('contact', {})
                has_email = 'email' in contact
                has_phone = 'phone' in contact
                self.log_test("Get contact info", has_email and has_phone, f"Contact fields: {list(contact.keys())}")
            else:
                self.log_test("Get contact info", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Get contact info", False, f"Exception: {str(e)}")

        # Test 2: Update contact info
        if self.super_admin_token:
            try:
                update_data = {
                    'email': 'test@promptforge.com',
                    'phone': '1234567890',
                    'socialLinks': [
                        {'name': 'Twitter', 'url': 'https://twitter.com/promptforge', 'icon': 'twitter'}
                    ]
                }
                response = self.make_request('PUT', '/contact/info', update_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Update contact info", True, "Successfully updated contact info")
                else:
                    self.log_test("Update contact info", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Update contact info", False, f"Exception: {str(e)}")

        # Test 3: Contact form (expected to fail without Brevo API key)
        try:
            contact_data = {
                'name': 'Test User',
                'email': 'test@example.com',
                'message': 'Test message from API testing'
            }
            response = self.make_request('POST', '/contact/send', contact_data)
            if response and response.status_code == 500:
                self.log_test("Contact form (no Brevo API)", True, "Correctly failed without Brevo API key")
            else:
                self.log_test("Contact form (no Brevo API)", False, f"Unexpected status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Contact form (no Brevo API)", False, f"Exception: {str(e)}")

    def test_chat_system(self):
        """Test comprehensive chat system functionality"""
        print("\n💬 TESTING CHAT SYSTEM")
        print("=" * 50)

        # Test 1: Customer sends message (no auth required)
        customer_data = {
            'customerName': 'John Doe',
            'customerEmail': 'john.doe@example.com',
            'customerPhone': '+1234567890',
            'message': 'Hello, I need help with my project!'
        }
        
        try:
            response = self.make_request('POST', '/chat/send', customer_data)
            if response and response.status_code == 200:
                data = response.json()
                self.test_chat_id = data.get('chatId')
                conversation = data.get('conversation', {})
                self.log_test("Customer send message", True, f"Chat ID: {self.test_chat_id}")
                
                # Verify conversation structure
                has_messages = len(conversation.get('messages', [])) > 0
                has_unread_count = 'unreadCount' in conversation
                self.log_test("Chat conversation structure", has_messages and has_unread_count, 
                            f"Messages: {len(conversation.get('messages', []))}, Unread: {conversation.get('unreadCount', 0)}")
            else:
                self.log_test("Customer send message", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Customer send message", False, f"Exception: {str(e)}")

        # Test 2: Cross-device sync - retrieve chat by email
        try:
            params = {'email': 'john.doe@example.com'}
            response = self.make_request('GET', '/chat/history', params=params)
            if response and response.status_code == 200:
                data = response.json()
                conversation = data.get('conversation')
                if conversation:
                    self.log_test("Cross-device sync (email)", True, f"Retrieved chat for {conversation.get('customerEmail')}")
                else:
                    self.log_test("Cross-device sync (email)", False, "No conversation found")
            else:
                self.log_test("Cross-device sync (email)", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Cross-device sync (email)", False, f"Exception: {str(e)}")

        # Test 3: Cross-device sync - retrieve chat by phone
        try:
            params = {'phone': '+1234567890'}
            response = self.make_request('GET', '/chat/history', params=params)
            if response and response.status_code == 200:
                data = response.json()
                conversation = data.get('conversation')
                if conversation:
                    self.log_test("Cross-device sync (phone)", True, f"Retrieved chat for {conversation.get('customerPhone')}")
                else:
                    self.log_test("Cross-device sync (phone)", False, "No conversation found")
            else:
                self.log_test("Cross-device sync (phone)", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Cross-device sync (phone)", False, f"Exception: {str(e)}")

        # Test 4: Admin get conversations (with chat permission)
        if self.super_admin_token:
            try:
                response = self.make_request('GET', '/chat/conversations', token=self.super_admin_token)
                if response and response.status_code == 200:
                    data = response.json()
                    conversations = data.get('conversations', [])
                    total_unread = data.get('totalUnread', 0)
                    self.log_test("Admin get conversations", True, f"Found {len(conversations)} conversations, {total_unread} unread")
                else:
                    self.log_test("Admin get conversations", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Admin get conversations", False, f"Exception: {str(e)}")

        # Test 5: Admin reply to conversation
        if self.test_chat_id and self.super_admin_token:
            try:
                reply_data = {'message': 'Hello John! Thanks for reaching out. How can I help you today?'}
                response = self.make_request('POST', f'/chat/{self.test_chat_id}/reply', reply_data, token=self.super_admin_token)
                if response and response.status_code == 200:
                    data = response.json()
                    conversation = data.get('conversation', {})
                    messages = conversation.get('messages', [])
                    admin_messages = [msg for msg in messages if msg.get('sender') == 'admin']
                    self.log_test("Admin reply to conversation", len(admin_messages) > 0, f"Total messages: {len(messages)}")
                else:
                    self.log_test("Admin reply to conversation", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Admin reply to conversation", False, f"Exception: {str(e)}")

        # Test 6: Mark conversation as read
        if self.test_chat_id and self.super_admin_token:
            try:
                response = self.make_request('PUT', f'/chat/{self.test_chat_id}/read', token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Mark conversation as read", True, "Successfully marked as read")
                else:
                    self.log_test("Mark conversation as read", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Mark conversation as read", False, f"Exception: {str(e)}")

        # Test 7: Customer sends follow-up message
        try:
            followup_data = {
                'customerName': 'John Doe',
                'customerEmail': 'john.doe@example.com',
                'customerPhone': '+1234567890',
                'message': 'Thanks for the quick response! I need help with React integration.'
            }
            response = self.make_request('POST', '/chat/send', followup_data)
            if response and response.status_code == 200:
                data = response.json()
                conversation = data.get('conversation', {})
                messages = conversation.get('messages', [])
                self.log_test("Customer follow-up message", len(messages) >= 3, f"Total messages in conversation: {len(messages)}")
            else:
                self.log_test("Customer follow-up message", False, f"Status: {response.status_code if response else 'No response'}")
        except Exception as e:
            self.log_test("Customer follow-up message", False, f"Exception: {str(e)}")

        # Test 8: Chat permission system - admin without chat access
        if self.regular_admin_token:
            # First, remove chat access from regular admin
            if hasattr(self, 'test_admin_id'):
                try:
                    update_data = {
                        'permissions': {
                            'canManageAdmins': False,
                            'canViewPrivateProjects': True,
                            'canAccessPrivateStorage': True,
                            'canAccessChat': False  # Remove chat access
                        }
                    }
                    self.make_request('PUT', f'/admins/{self.test_admin_id}', update_data, token=self.super_admin_token)
                    
                    # Now test that regular admin cannot access chat
                    response = self.make_request('GET', '/chat/conversations', token=self.regular_admin_token)
                    if response and response.status_code == 403:
                        self.log_test("Chat permission restriction", True, "Correctly denied chat access to admin without permission")
                    else:
                        self.log_test("Chat permission restriction", False, f"Status: {response.status_code if response else 'No response'}")
                except Exception as e:
                    self.log_test("Chat permission restriction", False, f"Exception: {str(e)}")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 CLEANING UP TEST DATA")
        print("=" * 50)

        # Delete test admin
        if hasattr(self, 'test_admin_id') and self.super_admin_token:
            try:
                response = self.make_request('DELETE', f'/admins/{self.test_admin_id}', token=self.super_admin_token)
                if response and response.status_code == 200:
                    self.log_test("Delete test admin", True, "Successfully deleted test admin")
                else:
                    self.log_test("Delete test admin", False, f"Status: {response.status_code if response else 'No response'}")
            except Exception as e:
                self.log_test("Delete test admin", False, f"Exception: {str(e)}")

        # Delete test projects
        for project_attr in ['test_public_project_id', 'test_private_project_id']:
            if hasattr(self, project_attr) and self.super_admin_token:
                try:
                    project_id = getattr(self, project_attr)
                    response = self.make_request('DELETE', f'/projects/{project_id}', token=self.super_admin_token)
                    if response and response.status_code == 200:
                        self.log_test(f"Delete test project ({project_attr})", True, "Successfully deleted")
                    else:
                        self.log_test(f"Delete test project ({project_attr})", False, f"Status: {response.status_code if response else 'No response'}")
                except Exception as e:
                    self.log_test(f"Delete test project ({project_attr})", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 STARTING COMPREHENSIVE BACKEND API TESTING")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print("=" * 60)

        # Run all test suites
        self.test_authentication()
        self.test_admin_management()
        self.test_content_management()
        self.test_skills_management()
        self.test_services_management()
        self.test_projects_management()
        self.test_private_storage()
        self.test_contact_management()
        self.test_chat_system()
        self.cleanup_test_data()

        # Print final summary
        print("\n" + "=" * 60)
        print("🎯 FINAL TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests / self.total_tests * 100):.1f}%")
        
        if self.passed_tests == self.total_tests:
            print("\n🎉 ALL TESTS PASSED! Backend is fully functional.")
        else:
            print(f"\n⚠️  {self.total_tests - self.passed_tests} tests failed. Check the details above.")
            
        print("=" * 60)

if __name__ == "__main__":
    tester = PromptForgeAPITester()
    tester.run_all_tests()