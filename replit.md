# RPG Session Manager

## Overview

This is a full-stack web application for managing tabletop RPG sessions. It allows users to create and join RPG tables, manage characters, and participate in real-time collaborative sessions with features like chat, whiteboard drawing, and character management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple
- **Real-time Communication**: WebSocket support for collaborative features
- **API Design**: RESTful API with structured error handling

### Data Storage
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon serverless driver with WebSocket support

## Key Components

### Authentication System
- **Strategy**: Session-based authentication with secure password hashing using scrypt
- **Features**: User registration, login, logout with proper session management
- **Security**: CSRF protection through session cookies, password hashing with salt

### Table Management
- **Creation**: Users can create RPG tables with title, rulebook, and unique access codes
- **Access Control**: Table masters have full control, players join via access codes
- **Discovery**: Users can view tables they own vs tables they participate in

### Character System
- **Attributes**: Health, mana, strength, agility, intelligence with customizable values
- **Ownership**: Characters belong to users and are associated with specific tables
- **Management**: Real-time character updates with validation

### Real-time Features
- **WebSocket Integration**: Live updates for character changes, chat, and whiteboard
- **Collaborative Whiteboard**: Real-time drawing with multiple tools and colors
- **Chat System**: Instant messaging within game sessions
- **Session State**: Live synchronization of game state across all participants

## Data Flow

1. **Authentication Flow**: User registers/logs in → Session created → Access to protected routes
2. **Table Creation**: Authenticated user creates table → Unique access code generated → Table stored in database
3. **Joining Tables**: User enters access code → Table validation → Character creation required → Access granted
4. **Session Participation**: WebSocket connection established → Real-time updates for chat, whiteboard, character changes
5. **Character Management**: CRUD operations on characters with real-time synchronization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **passport**: Authentication middleware with local strategy
- **express-session**: Session management with PostgreSQL store
- **ws**: WebSocket implementation for real-time features

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form handling with validation
- **zod**: Runtime type validation and schema generation
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **esbuild**: Production bundling for server

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Environment variable `DATABASE_URL` for database connection
- **Session Secret**: Environment variable `SESSION_SECRET` for session encryption
- **Development Scripts**: `npm run dev` for development, `npm run check` for type checking

### Production Build
- **Client Build**: Vite builds React app to `dist/public`
- **Server Build**: ESBuild bundles Express server to `dist/index.js`
- **Static Serving**: Express serves built client files in production
- **Database Migration**: `npm run db:push` applies schema changes

### Key Architecture Decisions

1. **Monorepo Structure**: Shared schema between client and server in `/shared` directory
2. **Type Safety**: End-to-end TypeScript with shared types and Zod validation
3. **Real-time Communication**: WebSocket integration for collaborative features
4. **Session-based Auth**: Traditional sessions over JWT for better security and UX
5. **Component Architecture**: Radix UI + shadcn/ui for accessible, customizable components
6. **Database Strategy**: Drizzle ORM for type safety with PostgreSQL for reliability and real-time features