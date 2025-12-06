'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth, getAdminUser, clearAuth, getAuthHeaders } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit, Trash2, LogOut, Users, Home, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [content, setContent] = useState(null);
  const [skills, setSkills] = useState([]);
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const authUser = await checkAuth(router);
    if (authUser) {
      setUser(authUser);
      await fetchData();
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const [contentRes, skillsRes, servicesRes, projectsRes, contactRes] = await Promise.all([
        fetch('/api/content'),
        fetch('/api/skills'),
        fetch('/api/services'),
        fetch('/api/projects'),
        fetch('/api/contact/info')
      ]);

      const contentData = await contentRes.json();
      const skillsData = await skillsRes.json();
      const servicesData = await servicesRes.json();
      const projectsData = await projectsRes.json();
      const contactData = await contactRes.json();

      setContent(contentData.content);
      setSkills(skillsData.skills);
      setServices(servicesData.services);
      setProjects(projectsData.projects);
      setContactInfo(contactData.contact);

      if (user?.role === 'super_admin') {
        const adminsRes = await fetch('/api/admins', { headers });
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/admin');
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(content)
      });
      if (res.ok) {
        alert('Content saved successfully!');
      }
    } catch (error) {
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const saveContactInfo = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/contact/info', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(contactInfo)
      });
      if (res.ok) {
        alert('Contact info saved successfully!');
      }
    } catch (error) {
      alert('Failed to save contact info');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async () => {
    const name = prompt('Skill name:');
    const level = prompt('Skill level (0-100):', '80');
    const icon = prompt('Icon (emoji):', '⭐');
    
    if (name) {
      try {
        const res = await fetch('/api/skills', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name, level: parseInt(level), icon })
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        alert('Failed to add skill');
      }
    }
  };

  const deleteSkill = async (id) => {
    if (confirm('Delete this skill?')) {
      try {
        const res = await fetch(`/api/skills/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        alert('Failed to delete skill');
      }
    }
  };

  const addService = async () => {
    const title = prompt('Service title:');
    const description = prompt('Service description:');
    const icon = prompt('Icon (emoji):', '💼');
    
    if (title) {
      try {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title, description, icon })
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        alert('Failed to add service');
      }
    }
  };

  const deleteService = async (id) => {
    if (confirm('Delete this service?')) {
      try {
        const res = await fetch(`/api/services/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        alert('Failed to delete service');
      }
    }
  };

  const addProject = async () => {
    const title = prompt('Project title:');
    const description = prompt('Project description:');
    const imageType = confirm('Use image URL? (OK = URL, Cancel = Upload later)');
    let image = '';
    
    if (imageType) {
      image = prompt('Image URL:');
    }
    
    const techStack = prompt('Tech stack (comma separated):', 'React, Node.js');
    const githubLink = prompt('GitHub link (optional):', '');
    const demoLink = prompt('Demo link (optional):', '');
    
    if (title) {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title,
            description,
            image,
            imageType: imageType ? 'url' : 'upload',
            techStack: techStack.split(',').map(t => t.trim()),
            githubLink,
            demoLink
          })
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        alert('Failed to add project');
      }
    }
  };

  const deleteProject = async (id) => {
    if (confirm('Delete this project?')) {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        alert('Failed to delete project');
      }
    }
  };

  const addAdmin = async () => {
    const username = prompt('New admin username:');
    const password = prompt('Password:');
    const role = confirm('Make super admin? (OK = Super Admin, Cancel = Regular Admin)') ? 'super_admin' : 'admin';
    
    if (username && password) {
      try {
        const res = await fetch('/api/admins', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ username, password, role })
        });
        if (res.ok) {
          fetchData();
          alert('Admin created successfully!');
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to create admin');
        }
      } catch (error) {
        alert('Failed to create admin');
      }
    }
  };

  const deleteAdmin = async (id) => {
    if (confirm('Delete this admin?')) {
      try {
        const res = await fetch(`/api/admins/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to delete admin');
        }
      } catch (error) {
        alert('Failed to delete admin');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <span className="text-sm text-muted-foreground">
                Logged in as: <strong>{user?.username}</strong> ({user?.role})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/" target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Site
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            {user?.role === 'super_admin' && (
              <TabsTrigger value="admins">Admins</TabsTrigger>
            )}
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hero Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={content?.hero?.title || ''}
                    onChange={(e) => setContent({
                      ...content,
                      hero: { ...content.hero, title: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input
                    value={content?.hero?.tagline || ''}
                    onChange={(e) => setContent({
                      ...content,
                      hero: { ...content.hero, tagline: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={content?.hero?.description || ''}
                    onChange={(e) => setContent({
                      ...content,
                      hero: { ...content.hero, description: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={content?.about?.title || ''}
                    onChange={(e) => setContent({
                      ...content,
                      about: { ...content.about, title: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={5}
                    value={content?.about?.description || ''}
                    onChange={(e) => setContent({
                      ...content,
                      about: { ...content.about, description: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Footer</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Footer Text</Label>
                  <Input
                    value={content?.footer?.text || ''}
                    onChange={(e) => setContent({
                      ...content,
                      footer: { ...content.footer, text: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Enable Animations</Label>
                  <Switch
                    checked={content?.theme?.animationsEnabled || false}
                    onCheckedChange={(checked) => setContent({
                      ...content,
                      theme: { ...content.theme, animationsEnabled: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button onClick={saveContent} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Content
            </Button>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Skills</CardTitle>
                  <Button onClick={addSkill}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{skill.icon}</span>
                        <div>
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-sm text-muted-foreground">Level: {skill.level}%</p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => deleteSkill(skill.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Services</CardTitle>
                  <Button onClick={addService}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div>
                          <p className="font-medium">{service.title}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => deleteService(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Projects</CardTitle>
                  <Button onClick={addProject}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-muted-foreground">No projects yet</p>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                          {project.techStack && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {project.techStack.join(', ')}
                            </p>
                          )}
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => deleteProject(project.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={contactInfo?.email || ''}
                    onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={contactInfo?.phone || ''}
                    onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable Contact Form</Label>
                  <Switch
                    checked={contactInfo?.formEnabled || false}
                    onCheckedChange={(checked) => setContactInfo({ ...contactInfo, formEnabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactInfo?.socialLinks?.map((social, idx) => (
                  <div key={idx}>
                    <Label>{social.name}</Label>
                    <Input
                      placeholder={`${social.name} URL`}
                      value={social.url || ''}
                      onChange={(e) => {
                        const newLinks = [...contactInfo.socialLinks];
                        newLinks[idx].url = e.target.value;
                        setContactInfo({ ...contactInfo, socialLinks: newLinks });
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={saveContactInfo} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Contact Info
            </Button>
          </TabsContent>

          {/* Admins Tab */}
          {user?.role === 'super_admin' && (
            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Manage Admins</CardTitle>
                    <Button onClick={addAdmin}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Admin
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {admins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{admin.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Role: {admin.role} | Created by: {admin.createdBy}
                          </p>
                        </div>
                        {admin.role !== 'super_admin' && (
                          <Button variant="destructive" size="sm" onClick={() => deleteAdmin(admin.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
