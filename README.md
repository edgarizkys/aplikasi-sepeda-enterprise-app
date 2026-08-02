# Aplikasi Sepeda Enterprise

Aplikasi manajemen sepeda enterprise dengan fitur CRUD lengkap, dashboard analytics, dan multi-tenant support.

## 📋 Fitur Utama

- **CRUD Operations**: Kelola items dengan interface yang intuitif
- **Dashboard**: Visualisasi data real-time dengan metrics penting
- **Analytics**: Analisis mendalam untuk decision making
- **Authentication**: Sistem login aman dengan JWT token
- **Multi-Tenant**: Dukungan multiple tenant dengan data isolation
- **Responsive Design**: Kompatibel dengan semua ukuran perangkat

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + bcryptjs
- **Validation**: Zod
- **Language**: TypeScript

### Frontend
- **Framework**: Next.js 14
- **Rendering**: React Server Components
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Language**: TypeScript

## 📦 Prerequisites

- Node.js 18 atau lebih tinggi
- PostgreSQL 12 atau lebih tinggi
- npm atau yarn package manager
- Git

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd aplikasi-sepeda-enterprise
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Configure database connection in .env
DATABASE_URL="postgresql://user:password@localhost:5432/aplikasi_sepeda"

# Run database migrations
npx prisma migrate dev

# Seed sample data (optional)
npx prisma db seed

# Start development server
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Configure API endpoint
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# Start development server
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## 📁 Project Structure

```
aplikasi-sepeda-enterprise/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── config/
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── api/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── styles/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
└── README.md
```

## 🔐 Authentication

### Login Flow

1. User menginput email dan password
2. Backend validate credentials
3. Generate JWT access token (15 menit) + refresh token (7 hari)
4. Frontend menyimpan tokens di secure storage
5. Setiap request dilengkapi dengan access token di header Authorization

### Protected Routes

```
GET    /api/items              - List items (Auth required)
GET    /api/items/:id          - Get item detail (Auth required)
POST   /api/items              - Create item (Auth required)
PUT    /api/items/:id          - Update item (Auth required)
DELETE /api/items/:id          - Delete item (Auth required)
```

## 📊 API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Item 1",
    "description": "Sample",
    "status": "active",
    "createdAt": "2026-08-02T17:50:37.777Z",
    "updatedAt": "2026-08-02T17:50:37.777Z"
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters"
  }
}
```

## 🗄️ Database Schema

### Items Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Tenant identifier |
| name | String | Nama item |
| description | String | Deskripsi item |
| status | String | Status (active/inactive) |
| createdAt | DateTime | Timestamp pembuatan |
| updatedAt | DateTime | Timestamp update terakhir |
| deletedAt | DateTime \| Null | Soft delete flag |

## 🔌 Environment Variables

### Backend (.env)

```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/aplikasi_sepeda
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Aplikasi Sepeda Enterprise
```

## 📝 Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow clean code principles
- Add JSDoc comments untuk public functions
- Use meaningful variable names in English
- User-facing text dalam Bahasa Indonesia

### Commit Convention

```
feat: Tambah fitur baru
fix: Perbaiki bug
docs: Update dokumentasi
style: Format code
refactor: Reorganisasi kode
test: Tambah/update tests
chore: Update dependencies
```

### Testing

```bash
# Backend
cd backend
npm run test                 # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# Frontend
cd frontend
npm run test                # Run tests
npm run test:watch         # Watch mode
```

## 🚢 Deployment

### Backend Deployment (Docker)

```bash
cd backend
docker build -t aplikasi-sepeda-api:latest .
docker run -e DATABASE_URL="..." -p 3001:3001 aplikasi-sepeda-api:latest
```

### Frontend Deployment (Vercel)

```bash
cd frontend
npm run build
vercel deploy --prod
```

## 📚 API Documentation

Dokumentasi API lengkap tersedia di `/api-docs` (Swagger UI):

```
http://localhost:3001/api-docs
```

## 🐛 Troubleshooting

### Database Connection Error

1. Pastikan PostgreSQL running
2. Verify DATABASE_URL di .env
3. Run migrations: `npx prisma migrate dev`

### JWT Token Expired

1. Use refresh token untuk mendapatkan access token baru
2. Endpoint: `POST /api/auth/refresh`
3. Include refresh token di request body

### CORS Error

1. Update `NEXT_PUBLIC_API_URL` di frontend .env
2. Verify backend CORS configuration di express middleware
3. Pastikan API URL matches exactly

## 📞 Support

Untuk bantuan teknis, silakan:

1. Buka issue di repository
2. Sediakan detailed error log
3. Jelaskan steps untuk reproduce

## 📄 License

Proprietary - Aplikasi Sepeda Enterprise

## 👥 Contributors

- Development Team

---

**Last Updated**: 2 Agustus 2026
**Version**: 1.0.0