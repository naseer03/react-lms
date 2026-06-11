# LMS Platform — Learning Management System

A production-ready, full-stack Learning Management System built with the MERN stack.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Tailwind CSS, React Query, React Hook Form |
| Backend | Node.js, Express.js, Mongoose |
| Database | MongoDB |
| Auth | JWT (Access + Refresh Tokens), HttpOnly Cookies |
| Email | Nodemailer |
| Deployment | Docker, Nginx, PM2, Let's Encrypt |

## Project Structure

```
react-lms/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, error, validation
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helpers (email, jwt, logger)
│   ├── .env.example
│   ├── Dockerfile
│   └── ecosystem.config.js  # PM2 config
└── frontend/
    ├── src/
    │   ├── components/      # Reusable UI components
    │   ├── contexts/        # React contexts
    │   ├── layouts/         # Admin & Student layouts
    │   ├── pages/           # Page components
    │   ├── routes/          # Protected routes
    │   └── services/        # API service layer
    ├── Dockerfile
    └── nginx.conf
```

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- MongoDB running locally
- npm or yarn

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run seed     # Create admin + sample data
npm run dev      # Start dev server on :5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm start        # Start dev server on :3000
```

### Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@lms.com | Admin@1234 |
| Student | alice@student.com | Student@1234 |

> Students must change their password on first login.

## Docker Setup

```bash
# Copy and configure env
cp backend/.env.example backend/.env

# Build and run
docker-compose up -d --build

# Run seed inside container
docker exec lms-backend node src/utils/seed.js
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/change-password | Change password |
| POST | /api/auth/forgot-password | Request reset email |
| POST | /api/auth/reset-password/:token | Reset password |

### Students (Admin only)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/students | List students (paginated) |
| POST | /api/admin/students | Create student |
| GET | /api/admin/students/:id | Get student |
| PUT | /api/admin/students/:id | Update student |
| PATCH | /api/admin/students/:id/block | Block student |
| PATCH | /api/admin/students/:id/unblock | Unblock student |
| POST | /api/admin/students/:id/reset-password | Reset password |
| DELETE | /api/admin/students/:id | Delete student |
| GET | /api/admin/students/stats | Dashboard stats |

## Production Deployment (Ubuntu 24.04 VPS)

### 1. Install dependencies

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install -y nginx

# MongoDB
# Follow: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
```

### 2. Deploy backend

```bash
cd /var/www/lms/backend
npm ci --only=production
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx config

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /var/www/lms/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Build Phases

| Phase | Status | Features |
|---|---|---|
| Phase 1 | ✅ Complete | Auth + Student Management |
| Phase 2 | 🔜 Next | Course Management + Video Streaming (HLS) |
| Phase 3 | 🔜 | Test Module + Coding Assessments |
| Phase 4 | 🔜 | Certificates + Reports |
| Phase 5 | 🔜 | Backups + Production Deployment |
