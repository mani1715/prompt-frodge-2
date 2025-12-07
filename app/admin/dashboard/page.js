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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, LogOut, Users, Home, ExternalLink, Eye, EyeOff, Upload, File, Search, FileText, FolderLock, MessageSquare, Send } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [storageItems, setStorageItems] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedChat, setSelectedChat] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [skillModal, setSkillModal] = useState({ open: false, data: null });
  const [serviceModal, setServiceModal] = useState({ open: false, data: null });
  const [projectModal, setProjectModal] = useState({ open: false, data: null });
  const [adminModal, setAdminModal] = useState({ open: false, data: null });
  const [storageModal, setStorageModal] = useState({ open: false, data: null });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const authUser = await checkAuth(router);
    if (authUser) {
      setUser(authUser);
      await fetchData(authUser);
      setLoading(false);
    }
  };

  const fetchData = async (authUser = user) => {
    try {
      const headers = getAuthHeaders();
      const [contentRes, skillsRes, servicesRes, projectsRes, contactRes] = await Promise.all([
        fetch('/api/content'),
        fetch('/api/skills'),
        fetch('/api/services'),
        fetch('/api/projects', { headers }),
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

      if (authUser?.role === 'super_admin') {
        const adminsRes = await fetch('/api/admins', { headers });
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins);
      }

      // Fetch storage items
      const storageRes = await fetch('/api/storage', { headers });
      const storageData = await storageRes.json();
      setStorageItems(storageData.items || []);

      // Fetch chat conversations
      await fetchConversations();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/chat/conversations', { headers });
      const data = await res.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
        setTotalUnread(data.totalUnread || 0);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/admin');
  };

  const openChat = async (conversation) => {
    setSelectedChat(conversation);
    setReplyMessage('');
    
    // Mark as read
    if (conversation.unreadCount > 0) {
      try {
        const headers = getAuthHeaders();
        await fetch(`/api/chat/${conversation.id}/read`, {
          method: 'PUT',
          headers
        });
        
        // Update local state
        setConversations(prev => 
          prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
        );
        setTotalUnread(prev => Math.max(0, prev - conversation.unreadCount));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedChat) return;

    setSaving(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/chat/${selectedChat.id}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: replyMessage.trim() })
      });

      const data = await res.json();
      
      if (data.success) {
        setSelectedChat(data.conversation);
        setReplyMessage('');
        
        // Update conversations list
        setConversations(prev => 
          prev.map(c => c.id === selectedChat.id ? data.conversation : c)
        );
        
        alert('Reply sent successfully!');
      } else {
        alert('Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setSaving(false);
    }
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

  // Skill operations
  const saveSkill = async (skillData) => {
    try {
      const method = skillData.id ? 'PUT' : 'POST';
      const url = skillData.id ? `/api/skills/${skillData.id}` : '/api/skills';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(skillData)
      });
      
      if (res.ok) {
        await fetchData();
        setSkillModal({ open: false, data: null });
      }
    } catch (error) {
      alert('Failed to save skill');
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
          await fetchData();
        }
      } catch (error) {
        alert('Failed to delete skill');
      }
    }
  };

  // Service operations
  const saveService = async (serviceData) => {
    try {
      const method = serviceData.id ? 'PUT' : 'POST';
      const url = serviceData.id ? `/api/services/${serviceData.id}` : '/api/services';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(serviceData)
      });
      
      if (res.ok) {
        await fetchData();
        setServiceModal({ open: false, data: null });
      }
    } catch (error) {
      alert('Failed to save service');
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
          await fetchData();
        }
      } catch (error) {
        alert('Failed to delete service');
      }
    }
  };

  // Project operations
  const saveProject = async (projectData) => {
    try {
      const method = projectData.id ? 'PUT' : 'POST';
      const url = projectData.id ? `/api/projects/${projectData.id}` : '/api/projects';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
      });
      
      if (res.ok) {
        await fetchData();
        setProjectModal({ open: false, data: null });
      }
    } catch (error) {
      alert('Failed to save project');
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
          await fetchData();
        }
      } catch (error) {
        alert('Failed to delete project');
      }
    }
  };

  const toggleProjectVisibility = async (project) => {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPrivate: !project.isPrivate })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      alert('Failed to update project visibility');
    }
  };

  // Admin operations
  const saveAdmin = async (adminData) => {
    try {
      const method = adminData.id ? 'PUT' : 'POST';
      const url = adminData.id ? `/api/admins/${adminData.id}` : '/api/admins';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(adminData)
      });
      
      if (res.ok) {
        await fetchData();
        setAdminModal({ open: false, data: null });
        alert('Admin saved successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save admin');
      }
    } catch (error) {
      alert('Failed to save admin');
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
          await fetchData();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to delete admin');
        }
      } catch (error) {
        alert('Failed to delete admin');
      }
    }
  };

  // Storage operations
  const saveStorageItem = async (itemData) => {
    try {
      const method = itemData.id ? 'PUT' : 'POST';
      const url = itemData.id ? `/api/storage/${itemData.id}` : '/api/storage';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      
      if (res.ok) {
        await fetchData();
        setStorageModal({ open: false, data: null });
      }
    } catch (error) {
      alert('Failed to save storage item');
    }
  };

  const deleteStorageItem = async (id) => {
    if (confirm('Delete this item?')) {
      try {
        const res = await fetch(`/api/storage/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          await fetchData();
        }
      } catch (error) {
        alert('Failed to delete storage item');
      }
    }
  };

  const handleFileUpload = async (file, type = 'project') => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    }
    return null;
  };

  const filteredStorageItems = storageItems.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      <header className="border-b border-border sticky top-0 bg-background z-10">
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
            <TabsTrigger value="storage">
              <FolderLock className="h-4 w-4 mr-2" />
              Private Storage
            </TabsTrigger>
            <TabsTrigger value="chat" className="relative">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {totalUnread}
                </span>
              )}
            </TabsTrigger>
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
                  <div>
                    <CardTitle>Manage Skills</CardTitle>
                    <CardDescription>Simple list of your skills</CardDescription>
                  </div>
                  <Button onClick={() => setSkillModal({ open: true, data: null })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{skill.icon}</span>
                        <p className="font-medium text-lg">{skill.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSkillModal({ open: true, data: skill })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteSkill(skill.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                  <Button onClick={() => setServiceModal({ open: true, data: null })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{service.icon}</span>
                        <div>
                          <p className="font-medium text-lg">{service.title}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setServiceModal({ open: true, data: service })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteService(service.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                  <Button onClick={() => setProjectModal({ open: true, data: null })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {projects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No projects yet</p>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex gap-4 flex-1">
                          {project.image && (
                            <img src={project.image} alt={project.title} className="w-20 h-20 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-lg">{project.title}</p>
                              {project.isPrivate && (
                                <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded">Private</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                            {project.techStack && project.techStack.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {project.techStack.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => toggleProjectVisibility(project)}
                            title={project.isPrivate ? "Make Public" : "Make Private"}
                          >
                            {project.isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setProjectModal({ open: true, data: project })}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteProject(project.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

          {/* Private Storage Tab */}
          <TabsContent value="storage">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Private Storage / Code Vault</CardTitle>
                    <CardDescription>Store notes, code snippets, and files securely</CardDescription>
                  </div>
                  <Button onClick={() => setStorageModal({ open: true, data: null })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search storage..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  {filteredStorageItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No items in storage</p>
                  ) : (
                    filteredStorageItems.map((item) => (
                      <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.type === 'file' ? <File className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            <h4 className="font-medium">{item.title}</h4>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setStorageModal({ open: true, data: item })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteStorageItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.content?.substring(0, 150)}...</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>By: {item.createdBy}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          {item.visibleTo && item.visibleTo.length > 0 && (
                            <>
                              <span>•</span>
                              <span>Shared with {item.visibleTo.length} admin(s)</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admins Tab */}
          {user?.role === 'super_admin' && (
            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Manage Admins</CardTitle>
                    <Button onClick={() => setAdminModal({ open: true, data: null })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Admin
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {admins.map((admin) => (
                      <div key={admin.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-lg">{admin.username}</p>
                              {admin.role === 'super_admin' && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Super Admin</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">Created by: {admin.createdBy}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {admin.permissions?.canManageAdmins && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Can Manage Admins</span>
                              )}
                              {admin.permissions?.canViewPrivateProjects && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Can View Private Projects</span>
                              )}
                              {admin.permissions?.canAccessPrivateStorage && (
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Can Access Private Storage</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setAdminModal({ open: true, data: admin })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            {admin.role !== 'super_admin' && (
                              <Button variant="destructive" size="sm" onClick={() => deleteAdmin(admin.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Modals */}
      <SkillModal
        open={skillModal.open}
        data={skillModal.data}
        onClose={() => setSkillModal({ open: false, data: null })}
        onSave={saveSkill}
      />

      <ServiceModal
        open={serviceModal.open}
        data={serviceModal.data}
        onClose={() => setServiceModal({ open: false, data: null })}
        onSave={saveService}
      />

      <ProjectModal
        open={projectModal.open}
        data={projectModal.data}
        onClose={() => setProjectModal({ open: false, data: null })}
        onSave={saveProject}
        onFileUpload={handleFileUpload}
      />

      <AdminModal
        open={adminModal.open}
        data={adminModal.data}
        onClose={() => setAdminModal({ open: false, data: null })}
        onSave={saveAdmin}
        isSuperAdmin={user?.role === 'super_admin'}
      />

      <StorageModal
        open={storageModal.open}
        data={storageModal.data}
        admins={admins}
        onClose={() => setStorageModal({ open: false, data: null })}
        onSave={saveStorageItem}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}

// Skill Modal Component
function SkillModal({ open, data, onClose, onSave }) {
  const [formData, setFormData] = useState({ name: '', icon: '⭐' });

  useEffect(() => {
    if (data) {
      setFormData({ name: data.name || '', icon: data.icon || '⭐' });
    } else {
      setFormData({ name: '', icon: '⭐' });
    }
  }, [data]);

  const handleSubmit = () => {
    if (!formData.name) {
      alert('Please enter a skill name');
      return;
    }
    onSave({ ...data, ...formData });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
          <DialogDescription>Enter the skill details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Skill Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., JavaScript"
            />
          </div>
          <div>
            <Label>Icon (Emoji)</Label>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="⭐"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Service Modal Component
function ServiceModal({ open, data, onClose, onSave }) {
  const [formData, setFormData] = useState({ title: '', description: '', icon: '💼' });

  useEffect(() => {
    if (data) {
      setFormData({ 
        title: data.title || '', 
        description: data.description || '', 
        icon: data.icon || '💼' 
      });
    } else {
      setFormData({ title: '', description: '', icon: '💼' });
    }
  }, [data]);

  const handleSubmit = () => {
    if (!formData.title) {
      alert('Please enter a service title');
      return;
    }
    onSave({ ...data, ...formData });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Service' : 'Add Service'}</DialogTitle>
          <DialogDescription>Enter the service details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Service Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Web Development"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the service..."
              rows={3}
            />
          </div>
          <div>
            <Label>Icon (Emoji)</Label>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="💼"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Project Modal Component
function ProjectModal({ open, data, onClose, onSave, onFileUpload }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    techStack: '',
    githubLink: '',
    demoLink: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({
        title: data.title || '',
        description: data.description || '',
        image: data.image || '',
        techStack: Array.isArray(data.techStack) ? data.techStack.join(', ') : '',
        githubLink: data.githubLink || '',
        demoLink: data.demoLink || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        image: '',
        techStack: '',
        githubLink: '',
        demoLink: ''
      });
    }
  }, [data]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const url = await onFileUpload(file, 'project');
      if (url) {
        setFormData({ ...formData, image: url });
      }
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title) {
      alert('Please enter a project title');
      return;
    }

    const projectData = {
      ...data,
      ...formData,
      techStack: formData.techStack ? formData.techStack.split(',').map(t => t.trim()) : []
    };

    onSave(projectData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Project' : 'Add Project'}</DialogTitle>
          <DialogDescription>Enter the project details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Project Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Portfolio Website"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the project..."
              rows={3}
            />
          </div>
          <div>
            <Label>Project Image</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Image URL or upload below"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {formData.image && (
                <img src={formData.image} alt="Preview" className="w-full h-40 object-cover rounded" />
              )}
            </div>
          </div>
          <div>
            <Label>Tech Stack (comma-separated)</Label>
            <Input
              value={formData.techStack}
              onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
              placeholder="e.g., React, Node.js, MongoDB"
            />
          </div>
          <div>
            <Label>GitHub Link (optional)</Label>
            <Input
              value={formData.githubLink}
              onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <Label>Demo Link (optional)</Label>
            <Input
              value={formData.demoLink}
              onChange={(e) => setFormData({ ...formData, demoLink: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Admin Modal Component
function AdminModal({ open, data, onClose, onSave, isSuperAdmin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin',
    permissions: {
      canManageAdmins: false,
      canViewPrivateProjects: true,
      canAccessPrivateStorage: true
    }
  });

  useEffect(() => {
    if (data) {
      setFormData({
        username: data.username || '',
        password: '',
        role: data.role || 'admin',
        permissions: data.permissions || {
          canManageAdmins: false,
          canViewPrivateProjects: true,
          canAccessPrivateStorage: true
        }
      });
    } else {
      setFormData({
        username: '',
        password: '',
        role: 'admin',
        permissions: {
          canManageAdmins: false,
          canViewPrivateProjects: true,
          canAccessPrivateStorage: true
        }
      });
    }
  }, [data]);

  const handleSubmit = () => {
    if (!formData.username) {
      alert('Please enter a username');
      return;
    }
    if (!data && !formData.password) {
      alert('Please enter a password');
      return;
    }

    const adminData = {
      ...data,
      username: formData.username,
      role: formData.role,
      permissions: formData.permissions
    };

    if (formData.password) {
      adminData.password = formData.password;
    }

    onSave(adminData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
          <DialogDescription>Manage admin user details and permissions</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Username</Label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="username"
            />
          </div>
          <div>
            <Label>{data ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={data ? 'Enter new password' : 'Enter password'}
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isSuperAdmin && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base">Permissions</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Can Manage Admins</Label>
                  <Switch
                    checked={formData.permissions.canManageAdmins}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        permissions: { ...formData.permissions, canManageAdmins: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Can View Private Projects</Label>
                  <Switch
                    checked={formData.permissions.canViewPrivateProjects}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        permissions: { ...formData.permissions, canViewPrivateProjects: checked } 
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Can Access Private Storage</Label>
                  <Switch
                    checked={formData.permissions.canAccessPrivateStorage}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        permissions: { ...formData.permissions, canAccessPrivateStorage: checked } 
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Admin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Storage Modal Component
function StorageModal({ open, data, admins, onClose, onSave, onFileUpload }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'note',
    fileUrl: '',
    fileName: '',
    tags: '',
    visibleTo: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({
        title: data.title || '',
        content: data.content || '',
        type: data.type || 'note',
        fileUrl: data.fileUrl || '',
        fileName: data.fileName || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        visibleTo: data.visibleTo || []
      });
    } else {
      setFormData({
        title: '',
        content: '',
        type: 'note',
        fileUrl: '',
        fileName: '',
        tags: '',
        visibleTo: []
      });
    }
  }, [data]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const url = await onFileUpload(file, 'storage');
      if (url) {
        setFormData({ ...formData, fileUrl: url, fileName: file.name, type: 'file' });
      }
      setUploading(false);
    }
  };

  const handleAdminToggle = (username) => {
    const newVisibleTo = formData.visibleTo.includes(username)
      ? formData.visibleTo.filter(u => u !== username)
      : [...formData.visibleTo, username];
    setFormData({ ...formData, visibleTo: newVisibleTo });
  };

  const handleSubmit = () => {
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }

    const itemData = {
      ...data,
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
    };

    onSave(itemData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data ? 'Edit Storage Item' : 'Add Storage Item'}</DialogTitle>
          <DialogDescription>Store notes, code, or files securely</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., API Keys, Code Snippet"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note / Text</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'note' ? (
            <div>
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your note or code here..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          ) : (
            <div>
              <Label>Upload File</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {formData.fileName && (
                  <p className="text-sm text-muted-foreground">File: {formData.fileName}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., api, credentials, important"
            />
          </div>

          {admins && admins.length > 0 && (
            <div>
              <Label className="mb-3 block">Visible To (Select admins who can see this)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`admin-${admin.id}`}
                      checked={formData.visibleTo.includes(admin.username)}
                      onCheckedChange={() => handleAdminToggle(admin.username)}
                    />
                    <label
                      htmlFor={`admin-${admin.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {admin.username} {admin.role === 'super_admin' && '(Super Admin)'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
