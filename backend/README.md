# SACCO Reporting System - Backend API

A comprehensive backend API for SASRA compliance reporting system designed for Kenyan SACCOs.

## Features

- 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control
- 📊 **Report Management**: CRUD operations for SASRA compliance reports
- 🔄 **Real-time Updates**: Socket.io integration for live notifications
- 📝 **Audit Logging**: Comprehensive audit trail for compliance
- 🛡️ **Security**: Rate limiting, input validation, and security headers
- 📈 **Analytics**: Report statistics and compliance metrics

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration.

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Reports

- `GET /api/reports` - Get all reports (with pagination)
- `GET /api/reports/:id` - Get specific report
- `POST /api/reports` - Create new report
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report
- `POST /api/reports/:id/generate` - Generate report file
- `GET /api/reports/stats/overview` - Get report statistics

### Health Check

- `GET /health` - API health status

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Default Users

For testing purposes, the following users are available:

- **Admin User**
  - Email: `admin@sacco.com`
  - Password: `password123`
  - Role: `admin`

- **Manager User**
  - Email: `manager@sacco.com`
  - Password: `password123`
  - Role: `manager`

## Report Types

- `monthly` - Monthly compliance reports
- `quarterly` - Quarterly financial reports
- `annual` - Annual comprehensive reports
- `custom` - Custom report templates

## Report Status

- `pending` - Report created but not generated
- `generating` - Report is being generated
- `completed` - Report generation completed
- `failed` - Report generation failed

## Socket.io Events

### Client to Server
- `join` - Join user room for personalized updates
- `report_progress` - Report generation progress updates
- `notification` - Send notifications

### Server to Client
- `report_update` - Report status updates
- `new_notification` - New notification received

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sacco_reporting
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# SASRA Compliance Settings
SASRA_API_URL=https://api.sasra.go.ke
SASRA_API_KEY=your-sasra-api-key

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

# External Services
CORE_BANKING_API_URL=http://localhost:8080/api
CORE_BANKING_API_KEY=your-core-banking-api-key
```

## Project Structure

```
backend/
├── app.js                 # Main application file
├── package.json           # Dependencies and scripts
├── routes/                # API route handlers
│   ├── auth.js           # Authentication routes
│   └── reports.js        # Report management routes
├── middleware/            # Custom middleware
│   ├── auth.js           # Authentication middleware
│   ├── rateLimiter.js    # Rate limiting
│   └── validation.js     # Input validation
├── utils/                 # Utility functions
│   └── auditLogger.js    # Audit logging utility
├── models/                # Database models (future)
├── services/              # Business logic services (future)
├── config/                # Configuration files (future)
└── logs/                  # Application logs
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (to be implemented)

### Code Style

The project follows standard Node.js/Express.js conventions and includes:

- Input validation using express-validator
- Error handling middleware
- Request logging
- Security headers with helmet
- CORS configuration
- Rate limiting

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- Security headers with helmet
- CORS protection
- Audit logging for compliance

## Compliance Features

- Comprehensive audit trail
- User activity logging
- Report generation tracking
- Data access monitoring
- Configuration change logging
- Compliance event tracking

## Future Enhancements

- Database integration (PostgreSQL/MySQL)
- Redis caching
- Email notifications
- File upload handling
- PDF report generation
- SASRA API integration
- Advanced analytics
- Multi-tenant support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team. 