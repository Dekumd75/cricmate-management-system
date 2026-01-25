# CricMate Management System

A comprehensive Cricket Academy Management System built with React, Node.js, Express, and MySQL.

## Features

- **User Management**: Multi-role support (Admin, Coach, Player, Parent)
- **Player Profiles**: Track player statistics and performance
- **Attendance Tracking**: Monitor player attendance
- **Payment Management**: Handle academy fees and payments
- **Password Reset**: Email-based password reset with Gmail SMTP
- **Audit Logging**: Track all system activities
- **Reports**: Generate comprehensive reports

## Tech Stack

### Frontend
- React with TypeScript
- Vite
- TailwindCSS
- Motion (Framer Motion)
- Sonner (Toast notifications)

### Backend
- Node.js
- Express
- Sequelize ORM
- MySQL
- JWT Authentication
- Bcrypt
- Nodemailer (Gmail SMTP)

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MySQL Server
- Gmail account (for password reset emails)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Dekumd75/cricmate-management-system.git
cd cricmate-management-system
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ..
npm install
```

3. **Configure environment variables**

Create `backend/.env` file:
```env
# Server
PORT=5000

# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=cricmate
DB_DIALECT=mysql

# JWT
JWT_SECRET=your_secret_key_here

# Email (Gmail SMTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=CricMate <your-email@gmail.com>
```

4. **Create MySQL Database**
```sql
CREATE DATABASE cricmate;
```

5. **Run the application**
```bash
# Start backend (from backend folder)
cd backend
npm start

# Start frontend (from root folder)
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Default Credentials

- **Admin**: admin@cricmate.com / admin123

## Gmail SMTP Setup

To enable password reset emails:

1. Enable 2-Factor Authentication on your Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add credentials to `backend/.env`

## Project Structure

```
cricmate-management-system/
├── backend/
│   ├── config/         # Database configuration
│   ├── models/         # Sequelize models
│   ├── routes/         # API routes
│   ├── services/       # Business logic (email service)
│   ├── middleware/     # Auth middleware
│   └── server.js       # Entry point
├── src/
│   ├── components/     # React components
│   ├── services/       # API services
│   └── assets/         # Images and static files
└── public/            # Public assets
```

## License

MIT

## Author

Dekumd75
