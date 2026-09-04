# Nexgile-MediOracle Healthcare Workforce Portal
## Full-Stack React + Node.js Application

### 📋 Project Overview
Enterprise healthcare workforce management platform with AI-powered matching, shift management, timekeeping, and payment processing.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 16+ 
- npm or yarn
- MongoDB (local or cloud)
- Git

### Installation & Running

#### 1️⃣ Clone & Setup
```bash
# Clone the project
git clone <your-repo>
cd MediOracle-Portal

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

#### 2️⃣ Configure Environment
**Backend (.env)**
```bash
cd backend
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medioracle
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF
```

**Frontend (.env)**
```bash
cd ../frontend
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5000/api
EOF
```

#### 3️⃣ Start MongoDB (if local)
```bash
# Using Docker (easiest)
docker run -d -p 27017:27017 --name medioracle-db mongo

# OR use MongoDB Atlas (cloud) and update MONGODB_URI
```

#### 4️⃣ Run Backend
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

#### 5️⃣ Run Frontend (New Terminal)
```bash
cd frontend
npm start
# App opens on http://localhost:3000
```

---

## 📁 Project Structure
```
MediOracle-Portal/
├── frontend/                    # React.js application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API calls
│   │   ├── context/            # State management
│   │   ├── styles/             # CSS files
│   │   └── App.js
│   ├── package.json
│   └── .env
│
├── backend/                     # Node.js/Express server
│   ├── src/
│   │   ├── models/             # MongoDB schemas
│   │   ├── routes/             # API endpoints
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # Auth, validation
│   │   ├── utils/              # Helpers
│   │   └── server.js
│   ├── package.json
│   └── .env
│
├── docker-compose.yml          # Docker setup
└── README.md
```

---

## 🔑 Key Features Implemented

### ✅ Facility Management
- Dashboard with real-time staffing status
- Create, edit, delete shifts
- View pending offers and confirmations
- Department budget tracking
- Fill rate analytics

### ✅ Professional Portal
- Browse available shifts with filters
- Apply to shifts
- View accepted bookings
- Digital timekeeping (clock in/out)
- Earnings dashboard

### ✅ AI Matching Engine
- Intelligent candidate ranking
- Confidence scoring
- Match explanations
- Facility preference matching

### ✅ Timekeeping & Payment
- Digital clock in/out with timestamps
- Break tracking
- Timesheet approval
- Payment processing
- Earnings history

### ✅ Compliance & Quality
- Credential tracking
- License verification
- Post-shift ratings
- Reference system

### ✅ Analytics & Reports
- Real-time dashboards
- Fill rate metrics
- Professional performance
- Financial reports

---

## 🔐 User Roles & Access

| Role | Access |
|------|--------|
| **Facility Admin** | Create shifts, manage team, view analytics, approve timesheets |
| **Facility Manager** | View staffing, confirm professionals, manage department |
| **Professional** | Browse shifts, apply, track earnings, clock in/out |
| **Agency Admin** | Oversee all facilities, compliance, payments, reports |
| **Recruiter** | Search candidates, view performance, analytics |

---

## 🗄️ Database Schema
- **Facilities** - Healthcare organizations
- **Professionals** - Healthcare workers
- **Shifts** - Job postings
- **Offers** - Shift offers to professionals
- **Bookings** - Confirmed assignments
- **Timesheets** - Clock events
- **Payments** - Payment records
- **Ratings** - Quality feedback
- **Users** - Login accounts

---

## 📡 API Endpoints

### Facilities
```
GET    /api/facilities
POST   /api/facilities
GET    /api/facilities/:id
PUT    /api/facilities/:id
DELETE /api/facilities/:id
```

### Shifts
```
GET    /api/shifts
POST   /api/shifts
GET    /api/shifts/:id
PUT    /api/shifts/:id
DELETE /api/shifts/:id
```

### Professionals
```
GET    /api/professionals
POST   /api/professionals
GET    /api/professionals/:id
PUT    /api/professionals/:id
```

### Matching & Offers
```
POST   /api/offers
GET    /api/offers/:shiftId
PUT    /api/offers/:offerId/accept
PUT    /api/offers/:offerId/reject
```

### Timekeeping
```
POST   /api/timesheets/clock-in
POST   /api/timesheets/clock-out
GET    /api/timesheets/:professionalId
```

### Payments
```
GET    /api/payments/:professionalId
POST   /api/payments/process
GET    /api/payments/:id
```

---

## 🐳 Docker Deployment

### Run Everything with Docker
```bash
docker-compose up -d
```

This starts:
- Frontend (port 3000)
- Backend (port 5000)
- MongoDB (port 27017)

### Docker Compose File
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/medioracle
      - JWT_SECRET=your_jwt_secret_key
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 📊 Demo Data

The application comes with seed data for testing:

**2 Facilities:**
- St. James Hospital (Dublin)
- Mercy Medical Centre (Cork)

**10 Professional Profiles:**
- Registered Nurses
- Healthcare Assistants
- Pharmacists

**20 Sample Shifts:**
- Various departments
- Different times and requirements

Load demo data:
```bash
cd backend
npm run seed
```

---

## 🔒 Security Features
- JWT authentication
- Password hashing (bcrypt)
- Role-based access control (RBAC)
- Input validation
- Rate limiting
- CORS protection
- Environment variables

---

## 📞 Support & Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh

# Or use MongoDB Atlas (free cloud): https://mongodb.com/cloud/atlas
```

### CORS Errors
Update `backend/src/server.js`:
```javascript
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};
```

---

## 📈 Production Deployment

### Deploy Backend (Heroku/Railway)
```bash
# Install Heroku CLI
heroku create medioracle-api
git push heroku main
```

### Deploy Frontend (Vercel/Netlify)
```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

---

## 👥 Team & Contact
- **Project**: Nexgile-MediOracle Healthcare Portal
- **Built with**: React, Node.js, MongoDB, Express
- **Status**: MVP Production Ready

---

## 📄 License
MIT License - Free to use and modify

---

**Ready to run? Start with:** `npm install && npm run setup`
