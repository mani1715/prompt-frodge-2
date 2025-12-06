# MSPN DEV - Complete Developer Website with Admin Panel

A modern, fully-featured developer website with a powerful admin panel for complete content management.

## 🚀 Features

### Public Website
- **Hero Section** - Eye-catching animated hero with customizable title, tagline, and description
- **About Section** - Company/brand introduction
- **Skills Section** - Showcase technical skills with progress bars and icons
- **Services Section** - Display offered services with descriptions
- **Projects Portfolio** - Showcase projects with images, tech stacks, and live/GitHub links
- **Contact Section** - Email, phone, social links, and working contact form with email notifications
- **Responsive Design** - Mobile-first, works on all devices
- **Smooth Animations** - Framer Motion animations throughout

### Admin Panel
- **Secure Authentication** - JWT-based login system
- **Role-Based Access** - Super Admin and Admin roles
- **Content Management**:
  - Edit hero section (title, tagline, description)
  - Edit about section
  - Edit footer text
  - Theme settings (enable/disable animations)
- **Skills Management** - Add, edit, delete skills
- **Services Management** - Add, edit, delete services
- **Projects Management** - Add, edit, delete projects (with image upload or URL support)
- **Contact Management** - Update email, phone, social links, enable/disable contact form
- **Admin Management** (Super Admin Only) - Create and manage admin users

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Authentication**: JWT with bcrypt
- **Email**: Brevo REST API (formerly Sendinblue)
- **File Uploads**: Native Node.js file handling

## 📋 Environment Variables

The following environment variables are configured in `.env`:

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=mspndev

# Application
NEXT_PUBLIC_BASE_URL=your_production_url

# Brevo Email (REQUIRED for contact form)
BREVO_API_KEY=your_brevo_api_key
ADMIN_EMAIL=mspndev.in@gmail.com
BREVO_SENDER_EMAIL=noreply@mspndev.com
BREVO_SENDER_NAME=MSPN DEV

# Security
JWT_SECRET=your_random_secret_key
```

### 🔑 Getting Brevo API Key
1. Sign up at [Brevo](https://www.brevo.com/)
2. Go to Settings → SMTP & API → API Keys
3. Create a new API key
4. Copy and paste it into `.env`

## 🚦 Getting Started

### 1. Installation
Dependencies are already installed. If needed:
```bash
yarn install
```

### 2. Create First Admin
A default super admin has been created:
- **Username**: admin
- **Password**: admin123

⚠️ **IMPORTANT**: Change this password after first login!

To create a new super admin or reset:
```bash
node scripts/init-admin.js
```

### 3. Start Development Server
```bash
yarn dev
```

The app will be available at:
- **Public Website**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

### 4. Login to Admin Panel
1. Go to http://localhost:3000/admin
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Start customizing your website!

## 📱 Using the Admin Panel

### Dashboard Overview
After logging in, you'll see tabs for different sections:

#### 1. Content Tab
- Edit hero section (main title, tagline, description)
- Edit about section
- Edit footer text
- Enable/disable animations

#### 2. Skills Tab
- Add new skills with name, level (0-100), and emoji icon
- Delete existing skills
- Skills appear on the public website immediately

#### 3. Services Tab
- Add new services with title, description, and emoji icon
- Delete existing services
- Customize what services you offer

#### 4. Projects Tab
- Add new projects with:
  - Title and description
  - Image (upload or URL)
  - Tech stack (comma-separated)
  - GitHub link (optional)
  - Demo link (optional)
- Delete existing projects

#### 5. Contact Tab
- Update email address for contact form notifications
- Update phone number
- Add/edit social media links (Instagram, Twitter)
- Enable/disable contact form

#### 6. Admins Tab (Super Admin Only)
- Create new admin users (Admin or Super Admin role)
- Update admin credentials
- Delete admin users (except super admins)

## 🎨 Design System

The website uses a clean, minimal design with:
- **Color Scheme**: Black, white, with customizable accent colors
- **Typography**: Modern sans-serif fonts
- **Animations**: Smooth, professional motion effects
- **Responsive**: Mobile-first approach

## 📧 Contact Form

The contact form:
1. Sends email notifications to your configured admin email
2. Uses Brevo for reliable email delivery
3. Includes sender's name, email, and message
4. Can be enabled/disabled from admin panel

## 🔐 Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: 7-day expiration
- **Role-Based Access**: Super Admin vs Regular Admin
- **Protected Routes**: All admin APIs require authentication
- **CORS Protection**: Configurable CORS origins

## 🚀 Deployment

### Before Deploying

1. **Update Environment Variables**:
   - Change `JWT_SECRET` to a random, secure string
   - Update `NEXT_PUBLIC_BASE_URL` to your production URL
   - Verify all Brevo credentials are correct

2. **Secure Your Admin**:
   - Change default admin password
   - Create production admin accounts
   - Delete or disable development accounts

3. **Check .gitignore**:
   The `.env` file is already in `.gitignore` to protect your secrets.

### Deployment Checklist

- [ ] Update all environment variables
- [ ] Change default admin password
- [ ] Test contact form with your email
- [ ] Verify social links are correct
- [ ] Test image uploads
- [ ] Check all animations work
- [ ] Test on mobile devices
- [ ] Verify MongoDB connection

### Environment Variables for Production

When deploying, make sure to set these environment variables:

```env
MONGO_URL=your_production_mongodb_url
DB_NAME=mspndev
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
BREVO_API_KEY=your_brevo_api_key
ADMIN_EMAIL=your_email@domain.com
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your Company Name
JWT_SECRET=your_random_secret_production_key
CORS_ORIGINS=https://yourdomain.com
```

## 📁 Project Structure

```
/app
├── app/
│   ├── page.js                    # Public website
│   ├── layout.js                  # Root layout
│   ├── globals.css                # Global styles
│   ├── admin/
│   │   ├── page.js                # Admin login
│   │   └── dashboard/
│   │       └── page.js            # Admin dashboard
│   └── api/[[...path]]/
│       └── route.js               # All API endpoints
├── components/ui/                 # shadcn/ui components
├── lib/
│   ├── mongodb.js                 # Database connection
│   ├── auth.js                    # Authentication utilities
│   ├── admin-auth.js              # Admin auth helpers
│   └── brevo-service.js           # Email service
├── public/
│   └── uploads/                   # Project image uploads
├── scripts/
│   └── init-admin.js              # Admin initialization script
├── .env                           # Environment variables (NOT in git)
├── .env.example                   # Environment template
└── package.json                   # Dependencies
```

## 🔧 API Endpoints

### Public Endpoints
- `GET /api/content` - Get site content
- `GET /api/skills` - Get skills
- `GET /api/services` - Get services
- `GET /api/projects` - Get projects
- `GET /api/contact/info` - Get contact information
- `POST /api/contact/send` - Send contact form email

### Authentication Endpoints
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/init` - Initialize first super admin

### Admin Endpoints (Require Authentication)
- `PUT /api/content` - Update site content
- `POST/PUT/DELETE /api/skills` - Manage skills
- `POST/PUT/DELETE /api/services` - Manage services
- `POST/PUT/DELETE /api/projects` - Manage projects
- `PUT /api/contact/info` - Update contact info
- `POST /api/upload` - Upload project images

### Super Admin Endpoints
- `GET /api/admins` - List all admins
- `POST /api/admins` - Create new admin
- `PUT /api/admins/:id` - Update admin
- `DELETE /api/admins/:id` - Delete admin

## 🐛 Troubleshooting

### Contact Form Not Sending Emails
- Verify Brevo API key in `.env`
- Check Brevo dashboard for sending logs
- Ensure `ADMIN_EMAIL` is correct
- Check server logs for errors

### Can't Login to Admin Panel
- Verify MongoDB is running
- Run `node scripts/init-admin.js` to create admin
- Check browser console for errors
- Clear browser localStorage and try again

### Images Not Uploading
- Verify `/app/public/uploads` directory exists
- Check directory permissions (should be writable)
- Check file size (adjust if needed)

### Database Connection Issues
- Verify MongoDB is running
- Check `MONGO_URL` in `.env`
- Test connection with MongoDB Compass

## 📝 Customization Tips

### Change Color Scheme
Edit `/app/app/globals.css` to modify CSS variables for light/dark themes.

### Add More Sections
1. Create new database collection
2. Add API endpoints in `/app/app/api/[[...path]]/route.js`
3. Add admin tab in `/app/app/admin/dashboard/page.js`
4. Add section in `/app/app/page.js`

### Customize Animations
Animations are powered by Framer Motion. Edit animation properties in `/app/app/page.js`.

### Add More Social Links
Update `socialLinks` array in contact info via admin panel or database.

## 💡 Tips for Production

1. **Performance**:
   - Optimize images before uploading
   - Use WebP format for better compression
   - Enable caching headers

2. **Security**:
   - Use strong JWT secret (32+ random characters)
   - Implement rate limiting on contact form
   - Keep dependencies updated

3. **SEO**:
   - Add meta tags in layout.js
   - Use descriptive page titles
   - Add sitemap.xml

4. **Monitoring**:
   - Set up error logging (Sentry, LogRocket)
   - Monitor email delivery in Brevo dashboard
   - Track user analytics

## 📞 Support

- Contact form notifications go to: ${process.env.ADMIN_EMAIL || 'mspndev.in@gmail.com'}
- Phone: ${process.env.ADMIN_PHONE || '8328284501'}

## 🎉 Default Credentials

**Super Admin**:
- Username: `admin`
- Password: `admin123`

⚠️ **Change immediately after first login!**

---

Built with ❤️ for MSPN DEV

**Happy Building! 🚀**
