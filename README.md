# University Learning Dashboard

## 🎓 Overview

The University Learning Dashboard is a comprehensive educational platform designed to bridge the gap between academic computer science education and industry requirements. It provides an integrated ecosystem featuring secure code execution, AI-powered interview simulation, real-time collaboration, and advanced analytics to help students prepare for tech careers while supporting professors and universities with data-driven insights.

## ✨ Features

### 🔧 Core Platform Features
- **Secure Code Editor**: In-browser VS Code-like experience with Monaco Editor
- **Multi-language Support**: Python, JavaScript, Java, C++ code execution
- **Real LeetCode Problems**: 15+ authentic coding problems with company classifications
- **User Authentication**: JWT-based secure authentication system
- **Role-based Access**: Support for students, professors, and administrators

### 🤖 AI-Powered Features
- **AI Content Generation**: Automated problem and test case creation
- **Intelligent Tutoring System**: Personalized learning assistance
- **Automated Grading & Feedback**: AI-powered code evaluation
- **Smart Recommendations**: Personalized problem suggestions
- **Predictive Analytics**: Performance forecasting and insights
- **Natural Language Processing**: Advanced text analysis capabilities

### 📊 Analytics & Progress Tracking
- **Individual Progress Tracking**: Detailed student performance metrics
- **Institutional Analytics**: University-wide insights and reporting
- **Real-time Dashboards**: Live performance monitoring
- **Advanced Assessment Tools**: Comprehensive evaluation systems

### 🏢 Enterprise Features
- **Course Management**: Full course creation and management for professors
- **LMS Integration**: Seamless integration with existing learning systems
- **User Management**: Advanced admin controls and user administration
- **Company-wise Problem Classification**: Problems tagged by tech companies (Amazon, Google, Facebook, Microsoft, Apple, etc.)

### 🎯 Interview Preparation
- **AI-Powered Mock Interviews**: Realistic technical interview simulation
- **Real-time Collaboration**: Peer programming and code reviews
- **Industry-Relevant Practice**: Problems from actual tech company interviews
- **Performance Analytics**: Detailed interview preparation insights

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Code Editor**: Monaco Editor (VS Code in browser)
- **Build Tool**: Vite for fast development and builds

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js RESTful API
- **Database**: PostgreSQL with Neon hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time**: Socket.io for collaborative features

### Infrastructure
- **Hosting**: Replit deployment environment
- **Database**: Neon PostgreSQL with connection pooling
- **Environment**: Docker-ready architecture
- **Package Management**: npm with dependency locking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or use provided Neon database)
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/university-learning-dashboard.git
   cd university-learning-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Import sample problems (optional)**
   ```bash
   cd scripts
   python3 import_leetcode_data.py
   tsx import_problems_to_db.ts
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5000`

## 📁 Project Structure

```
university-learning-dashboard/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── lib/           # Utility functions
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express application
│   ├── routes/           # API route handlers
│   ├── db.ts             # Database connection
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── scripts/              # Data import and utility scripts
└── docs/                 # Documentation files
```

## 🎯 Usage

### For Students
1. **Sign up** and create your student account
2. **Browse Problems** - Filter by difficulty, topic, or company
3. **Solve Challenges** - Use the integrated code editor
4. **Track Progress** - Monitor your learning journey
5. **Practice Interviews** - Use AI-powered mock interviews
6. **Collaborate** - Work with peers on coding challenges

### For Professors
1. **Create Courses** - Set up structured learning paths
2. **Assign Problems** - Distribute coding challenges to students
3. **Monitor Progress** - Track class performance and engagement
4. **Generate Content** - Use AI to create custom problems
5. **Analyze Performance** - Access detailed analytics and reports

### For Administrators
1. **Manage Users** - Control access and permissions
2. **Institutional Analytics** - University-wide performance insights
3. **System Configuration** - Platform settings and customization
4. **Data Export** - Generate reports for stakeholders

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Problems Endpoints
- `GET /api/problems` - List all problems
- `GET /api/problems/:id` - Get specific problem
- `POST /api/problems` - Create new problem (professors only)

### Submissions Endpoints
- `POST /api/submissions` - Submit code solution
- `GET /api/submissions/user/:id` - Get user submissions
- `POST /api/code/execute` - Execute code in sandbox

### Analytics Endpoints
- `GET /api/analytics/user/:id` - User performance analytics
- `GET /api/analytics/institutional` - Institution-wide analytics
- `GET /api/recommendations/user/:id` - Personalized recommendations

## 🤝 Contributing

We welcome contributions to the University Learning Dashboard! Here's how you can help:

### Development Workflow
1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```
3. **Make your changes**
4. **Add tests** for new functionality
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing new feature"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-new-feature
   ```
7. **Open a Pull Request**

### Code Style
- Use TypeScript for all new code
- Follow the existing code formatting (Prettier configuration)
- Add appropriate type definitions
- Include JSDoc comments for complex functions
- Add data-testid attributes for UI components

### Testing
- Write unit tests for utility functions
- Add integration tests for API endpoints
- Test UI components with appropriate test IDs
- Ensure all tests pass before submitting PR

## 📊 Database Schema

The platform uses PostgreSQL with the following main entities:

- **Users**: Student, professor, and admin accounts
- **Problems**: Coding challenges with metadata
- **Submissions**: Code solutions and execution results
- **User Progress**: Learning journey tracking
- **Interview Sessions**: AI-powered interview data
- **Analytics**: Performance metrics and insights

## 🔒 Security

- JWT-based authentication with secure token management
- bcrypt password hashing with salt rounds
- SQL injection prevention through parameterized queries
- Role-based access control (RBAC)
- Input validation using Zod schemas
- Secure code execution in isolated environments

## 📈 Performance

- Optimized database queries with Drizzle ORM
- Efficient caching with TanStack Query
- Code splitting and lazy loading for frontend
- Connection pooling for database operations
- Asset optimization through Vite build pipeline

## 🌟 Roadmap

### Phase 1: Enhanced AI Features
- [ ] Advanced code analysis and suggestions
- [ ] Automated difficulty adjustment
- [ ] Enhanced natural language explanations

### Phase 2: Collaboration Tools
- [ ] Real-time pair programming
- [ ] Video chat integration
- [ ] Code review workflows

### Phase 3: Mobile Support
- [ ] Progressive Web App (PWA)
- [ ] Mobile-optimized interface
- [ ] Offline code editing

### Phase 4: Advanced Analytics
- [ ] Machine learning-powered insights
- [ ] Plagiarism detection
- [ ] Learning path optimization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LeetCode** for inspiring the problem structure
- **Monaco Editor** for the excellent code editing experience
- **Replit** for providing the development and hosting platform
- **Open Source Community** for the amazing tools and libraries

## 📞 Support

For support, email support@university-dashboard.com or join our Discord community.

## 🔗 Links

- [Live Demo](https://university-learning-dashboard.replit.app)
- [Documentation](https://docs.university-dashboard.com)
- [Issue Tracker](https://github.com/your-username/university-learning-dashboard/issues)
- [Discord Community](https://discord.gg/university-dashboard)

---

**Built with ❤️ for education and powered by the latest web technologies.**