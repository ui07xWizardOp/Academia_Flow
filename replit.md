# University Learning Dashboard

## Overview

The University Learning Dashboard is a comprehensive educational platform designed to bridge the gap between academic computer science education and industry requirements. It provides an integrated ecosystem featuring secure code execution, AI-powered interview simulation, real-time collaboration, and advanced analytics to help students prepare for tech careers while supporting professors and universities with data-driven insights.

## Latest Updates (August 23, 2025)

### Admin Dashboard Implementation (100% Complete)
- **Admin Dashboard**: Comprehensive overview with system metrics, user growth charts, department distribution, system health monitoring, and quick actions
- **User Management**: Full CRUD operations for managing students, professors, and admins with filtering, search, and pagination
- **Institutional Analytics**: Department performance tracking, enrollment trends, student outcomes, faculty metrics, and competency assessments
- **Course Management**: Complete course lifecycle management with modules, assessments, resources, and enrollment tracking
- **AI Content Generation**: OpenAI-powered content creation for courses, problems, and learning materials
- **Automated Grading**: Intelligent code evaluation with test case execution, partial credit, and detailed feedback
- **Intelligent Tutoring**: Personalized AI tutoring with adaptive learning paths and real-time assistance
- **Predictive Analytics**: Advanced analytics for student performance prediction, risk assessment, and intervention recommendations
- **LMS Integration**: Full integration with Canvas, Blackboard, Moodle, and Google Classroom

### Career Services Implementation (100% Complete)
- Job Board with application tracking
- Resume Builder with AI assistance
- Career Counseling with appointment scheduling
- Career Events management
- Alumni Network and mentorship
- Internship opportunities
- Skills Assessment tools

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React-based SPA**: Built with React 18 using TypeScript for type safety
- **Component Library**: Implements shadcn/ui components with Tailwind CSS for consistent styling
- **Code Editor Integration**: Features Monaco Editor for VS Code-like coding experience with syntax highlighting
- **State Management**: Uses TanStack Query for server state management and caching
- **Routing**: Client-side routing with wouter for lightweight navigation
- **Authentication**: JWT-based authentication with context providers for user state management

### Backend Architecture
- **Express.js Server**: RESTful API server with TypeScript support
- **Database Layer**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens with bcrypt for password hashing
- **File Structure**: Modular architecture with separate concerns (routes, storage, database)
- **Development Environment**: Vite for fast development builds and hot module replacement

### Database Design
- **User Management**: Multi-role system supporting students, professors, and administrators
- **Problem Storage**: Structured coding problems with difficulty levels, topics, and test cases
- **Submission Tracking**: Complete submission history with execution results and performance metrics
- **Progress Analytics**: User progress tracking with completion status and time spent
- **Interview Sessions**: AI-powered interview simulation with session recording and feedback

### Security Model
- **Code Execution**: Planned secure Docker container isolation for running user code
- **Authentication**: JWT-based session management with role-based access control
- **Data Validation**: Zod schema validation for all API inputs
- **Database Security**: Parameterized queries through Drizzle ORM preventing SQL injection

### Key Design Patterns
- **Repository Pattern**: Database operations abstracted through storage interfaces
- **Middleware Architecture**: Express middleware for authentication and request logging
- **Component Composition**: React components following single responsibility principle
- **Type Safety**: End-to-end TypeScript implementation with shared schema definitions

## External Dependencies

### Core Technology Stack
- **Database**: PostgreSQL via Neon Database with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Authentication**: JSON Web Tokens (JWT) with bcrypt for password security
- **Frontend Framework**: React 18 with TypeScript and Vite build system

### UI and Styling
- **Component Library**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **Icons**: Lucide React icon library
- **Code Editor**: Monaco Editor for in-browser code editing experience

### Development Tools
- **Build System**: Vite for fast development and production builds
- **Package Manager**: npm with lockfile for dependency consistency
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Development Server**: Express with Vite middleware for hot reloading

### Active Integrations
- **AI Services**: OpenAI GPT integration for interview simulation, content generation, intelligent tutoring, and automated grading
- **Real-time Features**: Socket.io for collaborative coding and peer programming
- **Database**: PostgreSQL with Drizzle ORM for all data persistence
- **Authentication**: JWT-based auth with role-based access control
- **LMS Platforms**: Canvas, Blackboard, Moodle, Google Classroom integration

### Planned Integrations
- **Docker**: Secure code execution in isolated containers (implementation pending)
- **File Storage**: Cloud storage for code submissions and session recordings

### Infrastructure
- **Hosting**: Replit deployment environment with custom domain support
- **Database**: Neon PostgreSQL with automatic connection management
- **Asset Management**: Vite asset pipeline with CDN optimization
- **Environment Configuration**: Environment variable management for secrets and configuration