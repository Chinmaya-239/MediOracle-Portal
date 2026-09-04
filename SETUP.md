# 🚀 MediOracle Healthcare Portal - Complete Setup Guide

**For Recruiters & Evaluators: Follow this guide to run the project on your local machine**

---

## 📋 Prerequisites

Before starting, ensure you have installed:

1. **Node.js** (v16 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **MongoDB** (Choose ONE option)
   - **Option A: Local MongoDB** - https://www.mongodb.com/try/download/community
   - **Option B: MongoDB Atlas (Cloud)** - https://mongodb.com/cloud/atlas (Free tier available)
   - **Option C: Docker** - `docker run -d -p 27017:27017 --name medioracle-db mongo`

3. **Git** (to clone the repository)
   - Download: https://git-scm.com/

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Clone & Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd MediOracle-Portal

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Configure Backend
```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env with your MongoDB connection
# For local: MONGODB_URI=mongodb://localhost:27017/medioracle
# For Docker: MONGODB_URI=mongodb://localhost:27017/medioracle
# For Atlas: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medioracle
```

### Step 3: Start MongoDB (if not using Docker)
```bash
# macOS with Homebrew
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows (in Terminal as Admin)
net start MongoDB
```

### Step 4: Start Backend
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

### Step 5: Start Frontend (New Terminal)
```bash
cd frontend
npm start
# App will open on http://localhost:3000
```

---

## 🐳 Using Docker (Easiest Method)

If you have Docker installed, this is the simplest approach:

```bash
# From root directory
docker-compose up

# Access:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
# - MongoDB: localhost:27017

# Stop
docker-compose down
```

---

## 📝 Test Login Credentials

Once the app starts, use these test accounts:

**Professional Account:**
```
Email: prof@example.com
Password: password123
```

**Facility Manager Account:**
```
Email: facility@example.com
Password: password123
```

**Agency Admin Account:**
```
Email: admin@example.com
Password: password123
```

---

## 🗂️ Project Structure

```
MediOracle-Portal/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, validation
│   │   └── server.js          # Main server
│   ├── package.json
│   ├── .env
│   └── Dockerfile
│
├── frontend/                   # React.js App
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   ├── store/             # State management
│   │   ├── App.js             # Main app
│   │   └── index.js           # Entry point
│   ├── package.json
│   ├── .env
│   └── Dockerfile
│
├── docker-compose.yml         # Docker orchestration
└── README.md                  # Full documentation
```

---

## 🔑 Key Features Implemented

### ✅ Authentication
- JWT-based login/register
- Role-based access control
- Token refresh & validation

### ✅ Professional Portal
- Browse available shifts
- View earnings & payment history
- Track performance metrics
- Update profile & availability

### ✅ Facility Management
- Create & post shifts
- View staffing status
- Real-time analytics
- Professional matching

### ✅ Shift Management
- Post shifts with detailed requirements
- AI-powered matching algorithm
- Status tracking (draft → posted → filled)
- Candidate recommendations

### ✅ Timekeeping System
- Clock in/out with timestamps
- Break tracking
- Manager approval workflow
- Digital timesheets

### ✅ Payment Processing
- Automatic payment calculation
- Multiple payment methods
- Payment history & statements
- Dispute resolution

### ✅ Analytics & Reporting
- Real-time dashboards
- Performance metrics
- Fill rate tracking
- Financial reports

---

## 📡 API Endpoints Reference

### Authentication
```
POST   /api/auth/register      # Create account
POST   /api/auth/login         # Login
GET    /api/auth/me            # Get current user
PUT    /api/auth/update-profile # Update profile
```

### Shifts
```
GET    /api/shifts             # List all shifts
POST   /api/shifts             # Create shift
GET    /api/shifts/:id         # Get shift details
PUT    /api/shifts/:id         # Update shift
GET    /api/shifts/:id/matches # Get matching candidates
```

### Professionals
```
GET    /api/professionals      # List professionals
GET    /api/professionals/:id  # Get professional profile
PUT    /api/professionals/profile/update # Update own profile
```

### Facilities
```
GET    /api/facilities         # List facilities
POST   /api/facilities         # Create facility
GET    /api/facilities/:id     # Get facility details
GET    /api/facilities/:id/analytics # Get analytics
```

### Offers & Bookings
```
POST   /api/offers             # Create offer
PUT    /api/offers/:id/accept  # Accept offer
POST   /api/bookings/:id/clock-in # Clock in
POST   /api/bookings/:id/clock-out # Clock out
```

### Payments
```
GET    /api/payments           # Get payments
POST   /api/payments/create    # Create payment
PUT    /api/payments/:id/approve # Approve payment
```

### Analytics
```
GET    /api/analytics/facility/:id # Facility analytics
GET    /api/analytics/professional/:id # Professional analytics
```

---

## 🧪 Testing the Application

### Test Workflow 1: Professional Perspective
1. Login with professional@example.com
2. Go to "Find Shifts"
3. Browse available shifts
4. View shift details
5. Check earnings dashboard
6. Update profile

### Test Workflow 2: Facility Perspective
1. Login with facility@example.com
2. Go to "Create Shift"
3. Post a new shift
4. View shift analytics
5. See matching candidates
6. Accept/reject applications

### Test Workflow 3: Admin Perspective
1. Login with admin@example.com
2. View platform analytics
3. Manage facilities
4. Process payments
5. View system reports

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# If using Docker
docker ps | grep mongo

# If using local MongoDB
sudo systemctl status mongod
```

### Dependencies Installation Failed
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
- Make sure backend is running on http://localhost:5000
- Frontend should be on http://localhost:3000
- Check that FRONTEND_URL in backend .env is correct

### Login Issues
- Ensure test data exists in MongoDB
- Check that JWT_SECRET in .env matches
- Verify token is stored in localStorage

---

## 📊 Database Seed Data

The application comes with pre-populated data for testing:

**Facilities:**
- St. James Hospital (Dublin)
- Mercy Medical Centre (Cork)

**Professionals:**
- 10 test healthcare workers with different roles

**Shifts:**
- 20+ sample shifts across different departments

To load seed data:
```bash
cd backend
npm run seed
```

---

## 📈 Performance & Optimization

### Database Optimization
- Indexes on frequently queried fields
- Connection pooling
- Query optimization

### Frontend Optimization
- Code splitting with React.lazy
- Memoization of components
- Efficient state management with Zustand

### Backend Optimization
- Rate limiting on API endpoints
- Caching strategies
- Pagination for large datasets

---

## 🔒 Security Features Implemented

- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Role-Based Access Control (RBAC)
- ✅ Input Validation & Sanitization
- ✅ Rate Limiting (100 requests/15 min)
- ✅ CORS Protection
- ✅ Environment Variables for secrets
- ✅ HTTP Security Headers (Helmet.js)

---

## 🚀 Production Deployment

### Deploy Backend (Heroku/Railway)
```bash
# Create Heroku app
heroku create medioracle-api

# Set environment variables
heroku config:set MONGODB_URI=your_prod_uri
heroku config:set JWT_SECRET=your_prod_secret

# Deploy
git push heroku main
```

### Deploy Frontend (Vercel/Netlify)
```bash
# Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

---

## 📞 Support & Documentation

- **API Docs:** Check `/api` endpoint for full documentation
- **Health Check:** GET `/health` returns server status
- **Error Messages:** Check response `error` field for details
- **Logging:** Check console for debug information

---

## ✨ Next Steps to Enhance the Platform

1. **Implement Real-Time Features**
   - WebSocket for live notifications
   - Real-time shift matching

2. **Add Advanced Analytics**
   - Predictive forecasting
   - Custom reports

3. **Integrate Third-Party Services**
   - Payment gateways (Stripe)
   - Email providers (SendGrid)
   - SMS services (Twilio)

4. **Mobile App**
   - React Native app for iOS/Android
   - Offline capabilities

5. **AI Enhancements**
   - Machine learning for better matching
   - Predictive analytics

---

## 📄 Additional Resources

- **Node.js Documentation:** https://nodejs.org/docs
- **MongoDB Docs:** https://docs.mongodb.com
- **React Docs:** https://react.dev
- **Express Documentation:** https://expressjs.com

---

## 🎉 You're All Set!

Your MediOracle Healthcare Portal is now running locally. 

**Next Actions:**
1. Open http://localhost:3000 in your browser
2. Login with test credentials
3. Explore the features
4. Check the API at http://localhost:5000/api
5. Review the code and documentation

---

**Happy Testing! 🚀**

For questions or issues, refer to README.md or check the inline code documentation.
