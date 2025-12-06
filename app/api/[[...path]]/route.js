import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { hashPassword, comparePassword, generateToken, getAuthUser, requireAuth } from '@/lib/auth';
import { sendBrevoEmail } from '@/lib/brevo-service';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

async function handleRoute(request, { params }) {
  const { path: pathParams = [] } = params;
  const route = `/${pathParams.join('/')}`;
  const method = request.method;

  try {
    // Auth Routes
    if (route === '/auth/login' && method === 'POST') {
      const { username, password } = await request.json();
      const admins = await getCollection('admins');
      const admin = await admins.findOne({ username });

      if (!admin || !comparePassword(password, admin.password)) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      const token = generateToken({ id: admin.id, username: admin.username, role: admin.role });
      return handleCORS(NextResponse.json({ token, admin: { id: admin.id, username: admin.username, role: admin.role } }));
    }

    if (route === '/auth/verify' && method === 'GET') {
      const user = getAuthUser(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }
      return handleCORS(NextResponse.json({ user }));
    }

    if (route === '/auth/init' && method === 'POST') {
      const admins = await getCollection('admins');
      const existingAdmin = await admins.findOne({ role: 'super_admin' });
      
      if (existingAdmin) {
        return handleCORS(NextResponse.json({ error: 'Super admin already exists' }, { status: 400 }));
      }

      const { username, password } = await request.json();
      const hashedPassword = hashPassword(password);
      const newAdmin = {
        id: uuidv4(),
        username,
        password: hashedPassword,
        role: 'super_admin',
        createdAt: new Date(),
        createdBy: 'system'
      };

      await admins.insertOne(newAdmin);
      const token = generateToken({ id: newAdmin.id, username: newAdmin.username, role: newAdmin.role });
      return handleCORS(NextResponse.json({ token, admin: { id: newAdmin.id, username: newAdmin.username, role: newAdmin.role } }));
    }

    // Admin Management Routes (Super Admin Only)
    if (route === '/admins' && method === 'GET') {
      const authCheck = requireAuth(request, true);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const admins = await getCollection('admins');
      const allAdmins = await admins.find({}).toArray();
      const sanitizedAdmins = allAdmins.map(a => ({ id: a.id, username: a.username, role: a.role, createdAt: a.createdAt, createdBy: a.createdBy }));
      return handleCORS(NextResponse.json({ admins: sanitizedAdmins }));
    }

    if (route === '/admins' && method === 'POST') {
      const authCheck = requireAuth(request, true);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const { username, password, role } = await request.json();
      const admins = await getCollection('admins');
      const existing = await admins.findOne({ username });

      if (existing) {
        return handleCORS(NextResponse.json({ error: 'Username already exists' }, { status: 400 }));
      }

      const hashedPassword = hashPassword(password);
      const newAdmin = {
        id: uuidv4(),
        username,
        password: hashedPassword,
        role: role || 'admin',
        createdAt: new Date(),
        createdBy: authCheck.user.username
      };

      await admins.insertOne(newAdmin);
      return handleCORS(NextResponse.json({ admin: { id: newAdmin.id, username: newAdmin.username, role: newAdmin.role } }));
    }

    if (route.startsWith('/admins/') && method === 'PUT') {
      const authCheck = requireAuth(request, true);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const adminId = route.split('/')[2];
      const { username, password } = await request.json();
      const admins = await getCollection('admins');
      
      const updateData = { username };
      if (password) {
        updateData.password = hashPassword(password);
      }

      await admins.updateOne({ id: adminId }, { $set: updateData });
      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route.startsWith('/admins/') && method === 'DELETE') {
      const authCheck = requireAuth(request, true);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const adminId = route.split('/')[2];
      const admins = await getCollection('admins');
      const admin = await admins.findOne({ id: adminId });

      if (admin && admin.role === 'super_admin') {
        return handleCORS(NextResponse.json({ error: 'Cannot delete super admin' }, { status: 400 }));
      }

      await admins.deleteOne({ id: adminId });
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Content Routes
    if (route === '/content' && method === 'GET') {
      const content = await getCollection('site_content');
      let siteContent = await content.findOne({});
      
      if (!siteContent) {
        siteContent = {
          id: uuidv4(),
          hero: {
            title: 'MSPN DEV',
            tagline: 'Crafting Digital Excellence with Cutting-Edge Technology',
            description: 'We transform ideas into powerful digital solutions using modern web technologies and AI-assisted development.',
            ctaButtons: [
              { text: 'View Services', link: '#services' },
              { text: 'Contact Us', link: '#contact' }
            ]
          },
          about: {
            title: 'About MSPN DEV',
            description: 'MSPN DEV is a modern web development company specializing in AI-assisted development, web and app development, and delivering clean, fast, and modern solutions. We combine cutting-edge technology with creative design to build exceptional digital experiences.'
          },
          footer: {
            text: '© MSPN DEV — All Rights Reserved'
          },
          theme: {
            mode: 'light',
            accentColor: '#000000',
            animationsEnabled: true
          }
        };
        await content.insertOne(siteContent);
      }

      return handleCORS(NextResponse.json({ content: siteContent }));
    }

    if (route === '/content' && method === 'PUT') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const updates = await request.json();
      const content = await getCollection('site_content');
      await content.updateOne({}, { $set: updates }, { upsert: true });
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Skills Routes
    if (route === '/skills' && method === 'GET') {
      const skills = await getCollection('skills');
      const allSkills = await skills.find({}).sort({ order: 1 }).toArray();
      
      if (allSkills.length === 0) {
        const defaultSkills = [
          { id: uuidv4(), name: 'HTML', level: 90, icon: '🌐', order: 1 },
          { id: uuidv4(), name: 'CSS', level: 85, icon: '🎨', order: 2 },
          { id: uuidv4(), name: 'Python', level: 88, icon: '🐍', order: 3 },
          { id: uuidv4(), name: 'JavaScript', level: 92, icon: '⚡', order: 4 },
          { id: uuidv4(), name: 'React', level: 90, icon: '⚛️', order: 5 },
          { id: uuidv4(), name: 'Node.js', level: 87, icon: '🟢', order: 6 }
        ];
        await skills.insertMany(defaultSkills);
        return handleCORS(NextResponse.json({ skills: defaultSkills }));
      }

      return handleCORS(NextResponse.json({ skills: allSkills }));
    }

    if (route === '/skills' && method === 'POST') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const skillData = await request.json();
      const skills = await getCollection('skills');
      const newSkill = {
        id: uuidv4(),
        ...skillData,
        order: skillData.order || 999
      };
      await skills.insertOne(newSkill);
      return handleCORS(NextResponse.json({ skill: newSkill }));
    }

    if (route.startsWith('/skills/') && method === 'PUT') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const skillId = route.split('/')[2];
      const updates = await request.json();
      const skills = await getCollection('skills');
      await skills.updateOne({ id: skillId }, { $set: updates });
      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route.startsWith('/skills/') && method === 'DELETE') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const skillId = route.split('/')[2];
      const skills = await getCollection('skills');
      await skills.deleteOne({ id: skillId });
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Services Routes
    if (route === '/services' && method === 'GET') {
      const services = await getCollection('services');
      const allServices = await services.find({}).sort({ order: 1 }).toArray();
      
      if (allServices.length === 0) {
        const defaultServices = [
          { id: uuidv4(), title: 'Web Development', description: 'Custom websites built with modern technologies', icon: '🌐', order: 1 },
          { id: uuidv4(), title: 'App Development', description: 'Mobile and web applications that scale', icon: '📱', order: 2 },
          { id: uuidv4(), title: 'Bug Fixing', description: 'Quick and efficient problem solving', icon: '🐛', order: 3 },
          { id: uuidv4(), title: 'Maintenance', description: 'Ongoing support and updates', icon: '🔧', order: 4 },
          { id: uuidv4(), title: 'Business Websites', description: 'Professional sites for your business', icon: '💼', order: 5 },
          { id: uuidv4(), title: 'Portfolio Websites', description: 'Showcase your work beautifully', icon: '🎨', order: 6 }
        ];
        await services.insertMany(defaultServices);
        return handleCORS(NextResponse.json({ services: defaultServices }));
      }

      return handleCORS(NextResponse.json({ services: allServices }));
    }

    if (route === '/services' && method === 'POST') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const serviceData = await request.json();
      const services = await getCollection('services');
      const newService = {
        id: uuidv4(),
        ...serviceData,
        order: serviceData.order || 999
      };
      await services.insertOne(newService);
      return handleCORS(NextResponse.json({ service: newService }));
    }

    if (route.startsWith('/services/') && method === 'PUT') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const serviceId = route.split('/')[2];
      const updates = await request.json();
      const services = await getCollection('services');
      await services.updateOne({ id: serviceId }, { $set: updates });
      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route.startsWith('/services/') && method === 'DELETE') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const serviceId = route.split('/')[2];
      const services = await getCollection('services');
      await services.deleteOne({ id: serviceId });
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Projects Routes
    if (route === '/projects' && method === 'GET') {
      const projects = await getCollection('projects');
      const allProjects = await projects.find({}).sort({ order: 1 }).toArray();
      return handleCORS(NextResponse.json({ projects: allProjects }));
    }

    if (route === '/projects' && method === 'POST') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const projectData = await request.json();
      const projects = await getCollection('projects');
      const newProject = {
        id: uuidv4(),
        ...projectData,
        order: projectData.order || 999,
        createdAt: new Date()
      };
      await projects.insertOne(newProject);
      return handleCORS(NextResponse.json({ project: newProject }));
    }

    if (route.startsWith('/projects/') && method === 'PUT') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const projectId = route.split('/')[2];
      const updates = await request.json();
      const projects = await getCollection('projects');
      await projects.updateOne({ id: projectId }, { $set: updates });
      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route.startsWith('/projects/') && method === 'DELETE') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const projectId = route.split('/')[2];
      const projects = await getCollection('projects');
      await projects.deleteOne({ id: projectId });
      return handleCORS(NextResponse.json({ success: true }));
    }

    // Contact Routes
    if (route === '/contact/info' && method === 'GET') {
      const contact = await getCollection('contact_info');
      let contactInfo = await contact.findOne({});
      
      if (!contactInfo) {
        contactInfo = {
          id: uuidv4(),
          email: 'mspndev.in@gmail.com',
          phone: '8328284501',
          socialLinks: [
            { name: 'Instagram', url: '', icon: 'instagram' },
            { name: 'Twitter', url: '', icon: 'twitter' }
          ],
          formEnabled: true
        };
        await contact.insertOne(contactInfo);
      }

      return handleCORS(NextResponse.json({ contact: contactInfo }));
    }

    if (route === '/contact/info' && method === 'PUT') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      const updates = await request.json();
      const contact = await getCollection('contact_info');
      await contact.updateOne({}, { $set: updates }, { upsert: true });
      return handleCORS(NextResponse.json({ success: true }));
    }

    if (route === '/contact/send' && method === 'POST') {
      const { name, email, message } = await request.json();
      
      if (!name || !email || !message) {
        return handleCORS(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }));
      }

      try {
        const contact = await getCollection('contact_info');
        const contactInfo = await contact.findOne({});

        if (!contactInfo || !contactInfo.formEnabled) {
          return handleCORS(NextResponse.json({ error: 'Contact form is currently disabled' }, { status: 400 }));
        }

        const adminEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">New Contact Form Submission</h2>
            <div style="margin: 20px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This email was sent from the MSPN DEV contact form.</p>
          </div>
        `;

        await sendBrevoEmail({
          to: [{ email: contactInfo.email || process.env.ADMIN_EMAIL, name: 'MSPN DEV Admin' }],
          subject: `New Contact Form: Message from ${name}`,
          htmlContent: adminEmailHtml,
          replyTo: { email, name }
        });

        return handleCORS(NextResponse.json({ success: true, message: 'Your message has been sent successfully!' }));
      } catch (error) {
        console.error('Error sending email:', error);
        return handleCORS(NextResponse.json({ error: 'Failed to send message. Please try again later.' }, { status: 500 }));
      }
    }

    // Upload Route
    if (route === '/upload' && method === 'POST') {
      const authCheck = requireAuth(request);
      if (authCheck.error) {
        return handleCORS(NextResponse.json({ error: authCheck.error }, { status: authCheck.status }));
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) {
          return handleCORS(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        const fileUrl = `/uploads/${fileName}`;
        return handleCORS(NextResponse.json({ url: fileUrl }));
      } catch (error) {
        console.error('Upload error:', error);
        return handleCORS(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
      }
    }

    return handleCORS(NextResponse.json({ error: 'Route not found' }, { status: 404 }));
  } catch (error) {
    console.error('API Error:', error);
    return handleCORS(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
