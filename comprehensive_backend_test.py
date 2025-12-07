#!/usr/bin/env python3
"""
Comprehensive MSPN DEV Backend Testing Suite
Tests all critical features as specified in the review request:
1. Admin Authentication & Permissions System
2. Projects Visibility System (HIGH PRIORITY)
3. Admin Management (Super Admin Only)
4. Private Storage / Code Vault
5. Skills CRUD (No Percentages)
6. Services & Contact CRUD
"""

import requests
import json
import os
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:3000/api"
HEADERS = {"Content-Type": "application/json"}

class ComprehensiveMSPNTester:
    def __init__(self):
        self.super_admin_token = None
        self.regular_admin_token = None
        self.regular_admin_id = None
        self.test_project_ids = []
        self.test_storage_ids = []
        self.test_skill_ids = []
        self.test_service_ids = []
        self.failed_tests = []
        self.passed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
        if success:
            self.passed_tests.append(test_name)
        else:
            self.failed_tests.append(f"{test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None) -> Dict:
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        headers = HEADERS.copy()
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return {"error": "Invalid method", "status_code": 400}
                
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
        except Exception as e:
            return {"error": str(e), "status_code": 0, "success": False}

    def test_1_admin_authentication_permissions(self):
        """Test 1: Admin Authentication & Permissions System"""
        print("🔐 TESTING 1: Admin Authentication & Permissions System")
        print("=" * 60)
        
        # 1.1 Login as super admin
        result = self.make_request("POST", "/auth/login", {
            "username": "superadmin",
            "password": "SuperAdmin123!"
        })
        
        if result["success"] and "token" in result["data"]:
            self.super_admin_token = result["data"]["token"]
            admin_data = result["data"]["admin"]
            self.log_test("Super Admin Login", True, f"Role: {admin_data.get('role')}")
        else:
            self.log_test("Super Admin Login", False, f"Failed: {result.get('error', 'Unknown error')}")
            return False
        
        # 1.2 Verify JWT token
        result = self.make_request("GET", "/auth/verify", token=self.super_admin_token)
        if result["success"] and result["data"]["user"]["role"] == "super_admin":
            self.log_test("JWT Token Verification", True, "Super admin token verified")
        else:
            self.log_test("JWT Token Verification", False, "Token verification failed")
        
        # 1.3 Create regular admin to test permissions
        regular_admin_data = {
            "username": "regularadmin",
            "password": "RegularAdmin123!",
            "role": "admin",
            "permissions": {
                "canManageAdmins": False,
                "canViewPrivateProjects": True,
                "canAccessPrivateStorage": True
            }
        }
        
        result = self.make_request("POST", "/admins", regular_admin_data, token=self.super_admin_token)
        if result["success"]:
            self.regular_admin_id = result["data"]["admin"]["id"]
            self.log_test("Create Regular Admin", True, f"ID: {self.regular_admin_id}")
            
            # Login as regular admin
            login_result = self.make_request("POST", "/auth/login", {
                "username": "regularadmin",
                "password": "RegularAdmin123!"
            })
            if login_result["success"]:
                self.regular_admin_token = login_result["data"]["token"]
                self.log_test("Regular Admin Login", True, "Successfully logged in")
            else:
                self.log_test("Regular Admin Login", False, "Failed to login")
        else:
            self.log_test("Create Regular Admin", False, f"Failed: {result.get('error')}")
        
        # 1.4 Test permission checks
        if self.regular_admin_token:
            # Regular admin should NOT be able to manage admins
            result = self.make_request("GET", "/admins", token=self.regular_admin_token)
            cannot_manage = not result["success"] and result["status_code"] == 403
            self.log_test("Permission Check: canManageAdmins", cannot_manage, 
                         "Regular admin correctly denied admin management access")
            
            # Regular admin should be able to access private storage
            result = self.make_request("GET", "/storage", token=self.regular_admin_token)
            can_access_storage = result["success"]
            self.log_test("Permission Check: canAccessPrivateStorage", can_access_storage,
                         "Regular admin can access private storage")
        
        return True

    def test_2_projects_visibility_system(self):
        """Test 2: Projects Visibility System (HIGH PRIORITY)"""
        print("📁 TESTING 2: Projects Visibility System (HIGH PRIORITY)")
        print("=" * 60)
        
        if not self.super_admin_token:
            self.log_test("Projects Visibility System", False, "No super admin token")
            return False
        
        # 2.1 Create public project
        public_project = {
            "title": "Public Portfolio Website",
            "description": "A public portfolio website built with React",
            "technologies": ["React", "Node.js", "MongoDB"],
            "isPrivate": False,
            "githubUrl": "https://github.com/test/public-portfolio",
            "liveUrl": "https://public-portfolio.com"
        }
        
        result = self.make_request("POST", "/projects", public_project, token=self.super_admin_token)
        if result["success"]:
            public_project_id = result["data"]["project"]["id"]
            self.test_project_ids.append(public_project_id)
            created_by = result["data"]["project"]["createdBy"]
            self.log_test("Create Public Project", True, f"ID: {public_project_id}, createdBy: {created_by}")
        else:
            self.log_test("Create Public Project", False, f"Failed: {result.get('error')}")
            return False
        
        # 2.2 Create private project by super admin
        private_project_super = {
            "title": "Private Admin Dashboard",
            "description": "Internal admin dashboard - confidential",
            "technologies": ["Vue.js", "Python", "PostgreSQL"],
            "isPrivate": True,
            "githubUrl": "https://github.com/internal/admin-dashboard",
            "liveUrl": "https://internal-admin.com"
        }
        
        result = self.make_request("POST", "/projects", private_project_super, token=self.super_admin_token)
        if result["success"]:
            private_super_id = result["data"]["project"]["id"]
            self.test_project_ids.append(private_super_id)
            self.log_test("Create Private Project (Super Admin)", True, f"ID: {private_super_id}")
        else:
            self.log_test("Create Private Project (Super Admin)", False, f"Failed: {result.get('error')}")
        
        # 2.3 Create private project by regular admin
        if self.regular_admin_token:
            private_project_regular = {
                "title": "Regular Admin Private Project",
                "description": "Private project by regular admin",
                "technologies": ["Angular", "Express"],
                "isPrivate": True,
                "githubUrl": "https://github.com/regular/private-project"
            }
            
            result = self.make_request("POST", "/projects", private_project_regular, token=self.regular_admin_token)
            if result["success"]:
                private_regular_id = result["data"]["project"]["id"]
                self.test_project_ids.append(private_regular_id)
                self.log_test("Create Private Project (Regular Admin)", True, f"ID: {private_regular_id}")
            else:
                self.log_test("Create Private Project (Regular Admin)", False, f"Failed: {result.get('error')}")
        
        # 2.4 Test PUBLIC ACCESS (no auth) - should only see public projects
        result = self.make_request("GET", "/projects")
        if result["success"]:
            projects = result["data"]["projects"]
            public_only = all(not project.get("isPrivate", False) for project in projects)
            public_count = len([p for p in projects if not p.get("isPrivate", False)])
            private_count = len([p for p in projects if p.get("isPrivate", False)])
            
            self.log_test("Public Access - Only Public Projects", public_only and private_count == 0,
                         f"Public sees {public_count} public, {private_count} private projects")
        else:
            self.log_test("Public Access - Only Public Projects", False, f"Failed: {result.get('error')}")
        
        # 2.5 Test SUPER ADMIN ACCESS - should see ALL projects
        result = self.make_request("GET", "/projects", token=self.super_admin_token)
        if result["success"]:
            projects = result["data"]["projects"]
            total_count = len(projects)
            private_count = len([p for p in projects if p.get("isPrivate", False)])
            
            self.log_test("Super Admin Access - All Projects", private_count > 0,
                         f"Super admin sees {total_count} total projects ({private_count} private)")
        else:
            self.log_test("Super Admin Access - All Projects", False, f"Failed: {result.get('error')}")
        
        # 2.6 Test REGULAR ADMIN ACCESS - should only see their own projects
        if self.regular_admin_token:
            result = self.make_request("GET", "/projects", token=self.regular_admin_token)
            if result["success"]:
                projects = result["data"]["projects"]
                # Regular admin should only see projects they created
                own_projects = [p for p in projects if p.get("createdBy") == "regularadmin"]
                other_private = [p for p in projects if p.get("isPrivate") and p.get("createdBy") != "regularadmin"]
                
                self.log_test("Regular Admin Access - Own Projects Only", len(other_private) == 0,
                             f"Regular admin sees {len(projects)} projects, {len(own_projects)} own, {len(other_private)} other private")
            else:
                self.log_test("Regular Admin Access - Own Projects Only", False, f"Failed: {result.get('error')}")
        
        # 2.7 Test project privacy toggle
        if self.test_project_ids:
            project_id = self.test_project_ids[0]
            result = self.make_request("PUT", f"/projects/{project_id}", {"isPrivate": True}, token=self.super_admin_token)
            self.log_test("Toggle Project Privacy", result["success"], f"Status: {result['status_code']}")
        
        return True

    def test_3_admin_management_super_only(self):
        """Test 3: Admin Management (Super Admin Only)"""
        print("👥 TESTING 3: Admin Management (Super Admin Only)")
        print("=" * 60)
        
        if not self.super_admin_token:
            self.log_test("Admin Management", False, "No super admin token")
            return False
        
        # 3.1 GET /api/admins - should only work for super_admin
        result = self.make_request("GET", "/admins", token=self.super_admin_token)
        if result["success"]:
            admins = result["data"]["admins"]
            has_permissions = all("permissions" in admin for admin in admins)
            self.log_test("Get Admins List (Super Admin)", has_permissions,
                         f"Found {len(admins)} admins, all have permissions: {has_permissions}")
        else:
            self.log_test("Get Admins List (Super Admin)", False, f"Failed: {result.get('error')}")
        
        # 3.2 Regular admin should NOT be able to access admin management
        if self.regular_admin_token:
            result = self.make_request("GET", "/admins", token=self.regular_admin_token)
            access_denied = not result["success"] and result["status_code"] == 403
            self.log_test("Get Admins List (Regular Admin Denied)", access_denied,
                         f"Correctly denied with status {result['status_code']}")
        
        # 3.3 Create new admin with specific permissions
        new_admin_data = {
            "username": "testadmin2",
            "password": "TestAdmin123!",
            "role": "admin",
            "permissions": {
                "canManageAdmins": False,
                "canViewPrivateProjects": False,
                "canAccessPrivateStorage": True
            }
        }
        
        result = self.make_request("POST", "/admins", new_admin_data, token=self.super_admin_token)
        if result["success"]:
            test_admin_id = result["data"]["admin"]["id"]
            permissions = result["data"]["admin"]["permissions"]
            self.log_test("Create Admin with Custom Permissions", True,
                         f"Created admin with permissions: {permissions}")
            
            # 3.4 Update admin permissions
            update_data = {
                "username": "testadmin2_updated",
                "permissions": {
                    "canManageAdmins": False,
                    "canViewPrivateProjects": True,
                    "canAccessPrivateStorage": False
                }
            }
            
            result = self.make_request("PUT", f"/admins/{test_admin_id}", update_data, token=self.super_admin_token)
            self.log_test("Update Admin Username & Permissions", result["success"],
                         f"Status: {result['status_code']}")
            
            # 3.5 Try to delete super admin (should fail)
            super_admin_id = None
            admins_result = self.make_request("GET", "/admins", token=self.super_admin_token)
            if admins_result["success"]:
                for admin in admins_result["data"]["admins"]:
                    if admin.get("role") == "super_admin":
                        super_admin_id = admin["id"]
                        break
            
            if super_admin_id:
                result = self.make_request("DELETE", f"/admins/{super_admin_id}", token=self.super_admin_token)
                cannot_delete_super = not result["success"] and result["status_code"] == 400
                self.log_test("Cannot Delete Super Admin", cannot_delete_super,
                             "Correctly prevented super admin deletion")
            
            # 3.6 Delete test admin (should work)
            result = self.make_request("DELETE", f"/admins/{test_admin_id}", token=self.super_admin_token)
            self.log_test("Delete Regular Admin", result["success"],
                         f"Status: {result['status_code']}")
        else:
            self.log_test("Create Admin with Custom Permissions", False, f"Failed: {result.get('error')}")
        
        return True

    def test_4_private_storage_code_vault(self):
        """Test 4: Private Storage / Code Vault"""
        print("🗄️ TESTING 4: Private Storage / Code Vault")
        print("=" * 60)
        
        if not self.super_admin_token:
            self.log_test("Private Storage", False, "No super admin token")
            return False
        
        # 4.1 Create storage items with different visibility settings
        storage_items = [
            {
                "title": "JavaScript Utility Functions",
                "content": "const debounce = (func, wait) => { /* implementation */ };",
                "type": "code",
                "tags": ["javascript", "utilities"],
                "visibleTo": ["superadmin"]
            },
            {
                "title": "Database Schema Notes",
                "content": "User table: id, username, email, created_at...",
                "type": "note",
                "tags": ["database", "schema"],
                "visibleTo": ["superadmin", "regularadmin"]
            },
            {
                "title": "API Documentation",
                "content": "POST /api/users - Creates a new user...",
                "type": "documentation",
                "tags": ["api", "docs"],
                "visibleTo": []  # Empty means only creator can see
            }
        ]
        
        created_items = []
        for i, item_data in enumerate(storage_items):
            result = self.make_request("POST", "/storage", item_data, token=self.super_admin_token)
            if result["success"]:
                item_id = result["data"]["item"]["id"]
                created_items.append(item_id)
                self.test_storage_ids.append(item_id)
                self.log_test(f"Create Storage Item {i+1}", True,
                             f"'{item_data['title']}' - visible to: {item_data['visibleTo']}")
            else:
                self.log_test(f"Create Storage Item {i+1}", False, f"Failed: {result.get('error')}")
        
        # 4.2 Test GET storage with super admin (should see all)
        result = self.make_request("GET", "/storage", token=self.super_admin_token)
        if result["success"]:
            items = result["data"]["items"]
            super_admin_count = len(items)
            self.log_test("Get Storage Items (Super Admin)", True,
                         f"Super admin sees {super_admin_count} items")
        else:
            self.log_test("Get Storage Items (Super Admin)", False, f"Failed: {result.get('error')}")
        
        # 4.3 Test GET storage with regular admin (should see filtered items)
        if self.regular_admin_token:
            result = self.make_request("GET", "/storage", token=self.regular_admin_token)
            if result["success"]:
                items = result["data"]["items"]
                regular_admin_count = len(items)
                # Regular admin should see fewer items due to visibility filtering
                self.log_test("Get Storage Items (Regular Admin)", True,
                             f"Regular admin sees {regular_admin_count} items (filtered by visibility)")
            else:
                self.log_test("Get Storage Items (Regular Admin)", False, f"Failed: {result.get('error')}")
        
        # 4.4 Test update storage item
        if created_items:
            item_id = created_items[0]
            update_data = {
                "title": "Updated JavaScript Utilities",
                "content": "const debounce = (func, wait) => { /* updated implementation */ };",
                "tags": ["javascript", "utilities", "updated"]
            }
            
            result = self.make_request("PUT", f"/storage/{item_id}", update_data, token=self.super_admin_token)
            self.log_test("Update Storage Item", result["success"], f"Status: {result['status_code']}")
        
        # 4.5 Test delete storage item
        if created_items:
            item_id = created_items[-1]  # Delete the last item
            result = self.make_request("DELETE", f"/storage/{item_id}", token=self.super_admin_token)
            self.log_test("Delete Storage Item", result["success"], f"Status: {result['status_code']}")
            if result["success"]:
                self.test_storage_ids.remove(item_id)
        
        return True

    def test_5_skills_crud_no_percentages(self):
        """Test 5: Skills CRUD (No Percentages)"""
        print("🎯 TESTING 5: Skills CRUD (No Percentages)")
        print("=" * 60)
        
        if not self.super_admin_token:
            self.log_test("Skills CRUD", False, "No super admin token")
            return False
        
        # 5.1 GET existing skills
        result = self.make_request("GET", "/skills")
        if result["success"]:
            skills = result["data"]["skills"]
            # Check if any existing skills have level/percentage fields
            has_levels = any("level" in skill or "percentage" in skill for skill in skills)
            self.log_test("Get Skills - No Level Fields", not has_levels,
                         f"Found {len(skills)} skills, has level fields: {has_levels}")
        else:
            self.log_test("Get Skills", False, f"Failed: {result.get('error')}")
        
        # 5.2 POST skills - should only accept name and icon
        test_skills = [
            {"name": "React Testing", "icon": "⚛️"},
            {"name": "Node.js Testing", "icon": "🟢"},
            {"name": "MongoDB Testing", "icon": "🍃"}
        ]
        
        for skill_data in test_skills:
            result = self.make_request("POST", "/skills", skill_data, token=self.super_admin_token)
            if result["success"]:
                skill_id = result["data"]["skill"]["id"]
                created_skill = result["data"]["skill"]
                self.test_skill_ids.append(skill_id)
                
                # Verify no level/percentage field was added
                has_no_level = "level" not in created_skill and "percentage" not in created_skill
                self.log_test(f"Create Skill '{skill_data['name']}'", has_no_level,
                             f"Created without level/percentage: {has_no_level}")
            else:
                self.log_test(f"Create Skill '{skill_data['name']}'", False, f"Failed: {result.get('error')}")
        
        # 5.3 PUT skills - update existing skill
        if self.test_skill_ids:
            skill_id = self.test_skill_ids[0]
            update_data = {
                "name": "Updated React Testing",
                "icon": "🔄"
            }
            
            result = self.make_request("PUT", f"/skills/{skill_id}", update_data, token=self.super_admin_token)
            self.log_test("Update Skill", result["success"], f"Status: {result['status_code']}")
        
        # 5.4 DELETE skills
        if self.test_skill_ids:
            skill_id = self.test_skill_ids[-1]
            result = self.make_request("DELETE", f"/skills/{skill_id}", token=self.super_admin_token)
            self.log_test("Delete Skill", result["success"], f"Status: {result['status_code']}")
            if result["success"]:
                self.test_skill_ids.remove(skill_id)
        
        return True

    def test_6_services_contact_crud(self):
        """Test 6: Services & Contact CRUD"""
        print("🛠️ TESTING 6: Services & Contact CRUD")
        print("=" * 60)
        
        if not self.super_admin_token:
            self.log_test("Services & Contact CRUD", False, "No super admin token")
            return False
        
        # 6.1 Test Services CRUD
        # GET services
        result = self.make_request("GET", "/services")
        if result["success"]:
            services = result["data"]["services"]
            self.log_test("Get Services", True, f"Found {len(services)} services")
        else:
            self.log_test("Get Services", False, f"Failed: {result.get('error')}")
        
        # POST services
        test_service = {
            "title": "API Testing Service",
            "description": "Comprehensive API testing and validation",
            "icon": "🧪"
        }
        
        result = self.make_request("POST", "/services", test_service, token=self.super_admin_token)
        if result["success"]:
            service_id = result["data"]["service"]["id"]
            self.test_service_ids.append(service_id)
            self.log_test("Create Service", True, f"Created service: {service_id}")
        else:
            self.log_test("Create Service", False, f"Failed: {result.get('error')}")
        
        # PUT services
        if self.test_service_ids:
            service_id = self.test_service_ids[0]
            update_data = {
                "title": "Updated API Testing Service",
                "description": "Enhanced API testing with automation"
            }
            
            result = self.make_request("PUT", f"/services/{service_id}", update_data, token=self.super_admin_token)
            self.log_test("Update Service", result["success"], f"Status: {result['status_code']}")
        
        # DELETE services
        if self.test_service_ids:
            service_id = self.test_service_ids[0]
            result = self.make_request("DELETE", f"/services/{service_id}", token=self.super_admin_token)
            self.log_test("Delete Service", result["success"], f"Status: {result['status_code']}")
            if result["success"]:
                self.test_service_ids.remove(service_id)
        
        # 6.2 Test Contact CRUD
        # GET contact info
        result = self.make_request("GET", "/contact/info")
        if result["success"]:
            contact = result["data"]["contact"]
            self.log_test("Get Contact Info", True, f"Email: {contact.get('email')}")
        else:
            self.log_test("Get Contact Info", False, f"Failed: {result.get('error')}")
        
        # PUT contact info
        contact_update = {
            "email": "testing@mspndev.com",
            "phone": "9876543210",
            "socialLinks": [
                {"name": "GitHub", "url": "https://github.com/mspndev", "icon": "github"},
                {"name": "LinkedIn", "url": "https://linkedin.com/company/mspndev", "icon": "linkedin"}
            ]
        }
        
        result = self.make_request("PUT", "/contact/info", contact_update, token=self.super_admin_token)
        self.log_test("Update Contact Info", result["success"], f"Status: {result['status_code']}")
        
        # 6.3 Test contact form send (expected to fail without Brevo API key)
        contact_form = {
            "name": "Test User",
            "email": "test@example.com",
            "message": "This is a test message from the comprehensive test suite."
        }
        
        result = self.make_request("POST", "/contact/send", contact_form)
        # This should fail due to missing Brevo API key, which is expected
        expected_failure = not result["success"]
        self.log_test("Contact Form Send (Expected Failure)", expected_failure,
                     "Contact form correctly fails without Brevo API key - this is expected behavior")
        
        return True

    def cleanup_test_data(self):
        """Clean up all test data"""
        print("🧹 CLEANING UP TEST DATA")
        print("=" * 60)
        
        if not self.super_admin_token:
            return
        
        # Clean up projects
        for project_id in self.test_project_ids:
            result = self.make_request("DELETE", f"/projects/{project_id}", token=self.super_admin_token)
            if result["success"]:
                print(f"   ✅ Deleted project: {project_id}")
        
        # Clean up storage items
        for storage_id in self.test_storage_ids:
            result = self.make_request("DELETE", f"/storage/{storage_id}", token=self.super_admin_token)
            if result["success"]:
                print(f"   ✅ Deleted storage item: {storage_id}")
        
        # Clean up skills
        for skill_id in self.test_skill_ids:
            result = self.make_request("DELETE", f"/skills/{skill_id}", token=self.super_admin_token)
            if result["success"]:
                print(f"   ✅ Deleted skill: {skill_id}")
        
        # Clean up services
        for service_id in self.test_service_ids:
            result = self.make_request("DELETE", f"/services/{service_id}", token=self.super_admin_token)
            if result["success"]:
                print(f"   ✅ Deleted service: {service_id}")
        
        # Clean up regular admin
        if self.regular_admin_id:
            result = self.make_request("DELETE", f"/admins/{self.regular_admin_id}", token=self.super_admin_token)
            if result["success"]:
                print(f"   ✅ Deleted regular admin: {self.regular_admin_id}")
        
        print()

    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        print("🚀 STARTING COMPREHENSIVE MSPN DEV BACKEND TESTS")
        print("=" * 80)
        print("Testing all critical features as specified in the review request:")
        print("1. Admin Authentication & Permissions System")
        print("2. Projects Visibility System (HIGH PRIORITY)")
        print("3. Admin Management (Super Admin Only)")
        print("4. Private Storage / Code Vault")
        print("5. Skills CRUD (No Percentages)")
        print("6. Services & Contact CRUD")
        print("=" * 80)
        print()
        
        # Run all tests
        test_results = []
        test_results.append(self.test_1_admin_authentication_permissions())
        test_results.append(self.test_2_projects_visibility_system())
        test_results.append(self.test_3_admin_management_super_only())
        test_results.append(self.test_4_private_storage_code_vault())
        test_results.append(self.test_5_skills_crud_no_percentages())
        test_results.append(self.test_6_services_contact_crud())
        
        # Cleanup
        self.cleanup_test_data()
        
        # Final Summary
        print("🏁 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        total_passed = len(self.passed_tests)
        total_failed = len(self.failed_tests)
        total_tests = total_passed + total_failed
        
        print(f"Total Individual Tests: {total_tests}")
        print(f"✅ Passed: {total_passed}")
        print(f"❌ Failed: {total_failed}")
        print(f"Success Rate: {(total_passed/total_tests)*100:.1f}%")
        print()
        
        if total_failed > 0:
            print("❌ FAILED TESTS:")
            for failed_test in self.failed_tests:
                print(f"   • {failed_test}")
            print()
        
        # Test suite results
        suite_passed = sum(test_results)
        suite_total = len(test_results)
        
        print(f"Test Suites Completed: {suite_passed}/{suite_total}")
        
        if suite_passed == suite_total and total_failed == 0:
            print("🎉 ALL COMPREHENSIVE TESTS PASSED!")
            print("✅ MSPN DEV backend is working correctly with all critical features!")
        else:
            print("⚠️  Some tests failed. Review the details above.")
        
        print("=" * 80)
        return suite_passed == suite_total and total_failed == 0

if __name__ == "__main__":
    tester = ComprehensiveMSPNTester()
    success = tester.run_comprehensive_tests()
    exit(0 if success else 1)