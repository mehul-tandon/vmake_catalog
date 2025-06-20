# VMake Product Catalog

A modern, secure product catalog application with advanced authentication and user management features. Built with React, Express.js, and PostgreSQL, this application provides a comprehensive solution for managing product catalogs with role-based access control.

## 🌟 Overview

VMake Product Catalog is designed for businesses that need to showcase their products to customers while maintaining strict access control. The system features a unique token-based authentication system that allows secure, device-specific access to the catalog without traditional password requirements for regular users.

## ✨ Key Features

### 🔐 Advanced Authentication System
- **Admin Authentication**: Traditional WhatsApp number + password login for administrators
- **Token-Based User Access**: Email-based one-time token links for regular users
- **Device Binding**: Tokens are permanently bound to IP addresses for device-specific access
- **No Password Required**: Regular users access the catalog through secure email tokens
- **Session Management**: Secure session handling with configurable expiration

### 👥 User Management
- **Dual User Roles**: Admin users with full access, regular users with catalog-only access
- **Profile Completion**: One-time profile setup for new users
- **WhatsApp Integration**: Seamless redirection to admin WhatsApp for inquiries
- **Email-Based Access**: Users request access via email and receive secure token links

### 📦 Product Management
- **Complete CRUD Operations**: Add, edit, delete, and view products
- **Image Upload**: Secure file upload with validation and storage
- **Category & Finish Management**: Organize products by categories and finishes
- **Search & Filtering**: Advanced search capabilities with multiple filters
- **CSV Import/Export**: Bulk product management through CSV files
- **Product Analytics**: View product statistics and user engagement

### 🎨 Modern User Interface
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark/Light Mode**: Theme switching for better user experience
- **Interactive Components**: Modern UI components with smooth animations
- **Accessibility**: Built with accessibility standards in mind
- **Progressive Web App**: PWA capabilities for app-like experience

### 🛡️ Security Features
- **Rate Limiting**: Protection against API abuse and brute force attacks
- **Input Validation**: Comprehensive validation using Zod schemas
- **CSRF Protection**: Built-in protection against cross-site request forgery
- **Secure Headers**: Helmet.js for security headers in production
- **File Upload Security**: Secure file handling with type and size validation
- **SQL Injection Protection**: Parameterized queries with Drizzle ORM

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **React 18** with modern hooks and concurrent features
- **TypeScript** for type safety and better development experience
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible, unstyled components
- **React Query** for server state management
- **React Hook Form** for form handling and validation

### Backend (Express.js + TypeScript)
- **Express.js** with TypeScript for robust API development
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **Passport.js** for authentication strategies
- **Multer** for secure file upload handling
- **Nodemailer** for email functionality
- **bcrypt** for secure password hashing

### Database Schema
- **Users Table**: Stores user information, roles, and profile data
- **Products Table**: Product information with categories and finishes
- **Access Tokens Table**: Manages email-based access tokens
- **Device Sessions Table**: Tracks device-specific sessions
- **Wishlists Table**: User product preferences
- **Feedback Table**: User feedback and inquiries

## 🔄 How It Works

### For Regular Users
1. **Request Access**: Users visit the catalog access page and enter their email
2. **Receive Token**: System sends a secure, one-time access link via email
3. **Complete Profile**: First-time users complete their profile (name, WhatsApp, city)
4. **Access Catalog**: Users can browse products, search, and filter
5. **Device Binding**: Token becomes permanently bound to their device/IP
6. **Seamless Return**: Future visits from the same device require no re-authentication

### For Admin Users
1. **Admin Login**: Access admin panel with WhatsApp number and password
2. **Product Management**: Add, edit, delete products with image uploads
3. **User Management**: View all registered users and their access history
4. **Analytics Dashboard**: Monitor product views, user engagement, and system metrics
5. **Bulk Operations**: Import/export products via CSV files
6. **System Configuration**: Manage categories, finishes, and system settings

### Token-Based Security
- **Email Verification**: Tokens are sent only to verified email addresses
- **IP Binding**: Each token is permanently bound to the requesting IP address
- **One-Time Use**: Initial token validation, then device-specific access
- **No Expiration**: Tokens never expire but are device-locked for security
- **Secure Generation**: Cryptographically secure token generation

## 🛠️ Tech Stack Details

### Core Technologies
- **Node.js** (v18+) - JavaScript runtime
- **TypeScript** - Type safety and better development experience
- **React 18** - Modern frontend framework with concurrent features
- **Express.js** - Fast, unopinionated web framework
- **PostgreSQL** - Robust, ACID-compliant relational database
- **Vite** - Next-generation frontend tooling

### Key Libraries & Tools
- **Drizzle ORM** - Type-safe database operations
- **Zod** - Schema validation for TypeScript
- **React Query** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library
- **Helmet.js** - Security headers
- **Multer** - File upload middleware
- **bcrypt** - Password hashing
- **Nodemailer** - Email sending

## 📁 Project Structure

```
vmake-catalog/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components and routing
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and configurations
│   │   └── styles/        # Global styles and Tailwind config
│   └── index.html         # HTML entry point
├── server/                # Express.js backend
│   ├── routes/           # API route handlers
│   ├── middleware/       # Custom middleware functions
│   ├── migrations/       # Database migration files
│   ├── db.ts            # Database connection and configuration
│   ├── storage.ts       # Data access layer
│   ├── email.ts         # Email service configuration
│   └── index.ts         # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schema and validation
├── scripts/             # Utility scripts
│   ├── init-db.js      # Database initialization
│   ├── setup-admin.js  # Admin user setup
│   └── security-check.js # Security validation
└── uploads/             # File upload directory
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (local or cloud)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vmake-catalog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   npm run db:push
   npm run db:setup
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Production Build

```bash
npm run build
npm start
```

## 🔧 Configuration

The application uses environment variables for configuration. See `.env.example` for all available options:

- **Database**: PostgreSQL connection string
- **Session**: Secret key for session encryption
- **Admin**: WhatsApp number for admin access
- **Security**: Bcrypt rounds, rate limiting settings
- **File Upload**: Maximum file size limits
- **Email**: SMTP configuration for token delivery

## 📊 Features in Detail

### Product Catalog
- Grid and list view options
- Advanced search with real-time results
- Category and finish filtering
- Responsive image galleries
- Product detail modals
- Wishlist functionality

### Admin Dashboard
- Real-time analytics and metrics
- User management with access history
- Product management with bulk operations
- File upload with progress tracking
- CSV import/export with validation
- System health monitoring

### Security & Performance
- Rate limiting on all API endpoints
- Input sanitization and validation
- Secure file upload handling
- Optimized database queries
- Caching strategies for better performance
- Error handling and logging

## 🤝 Contributing

This project follows standard open-source contribution guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Submit a pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the changelog for recent updates

---

Built with ❤️ for modern product catalog management
