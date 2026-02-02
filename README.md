# Twin Campus

A web-based Digital Twin of a college campus, built as a 12-week capstone project MVP.

## Project Overview

**Twin Campus** is an interactive 3D visualization platform that creates a digital representation of a physical college campus. The project aims to provide an immersive, web-based experience where users can explore campus buildings, floors, and rooms in a three-dimensional environment.

## Goals

- Build a functional MVP of a campus digital twin accessible via web browser
- Implement a geospatially-accurate 3D representation of campus buildings
- Create an intuitive navigation system for exploring campus spaces
- Establish a scalable architecture for future expansion and feature additions

## Technology Stack

### Frontend
- **React** with **TypeScript** - Core framework
- **React Three Fiber** - 3D rendering and scene management
- **Three.js** - 3D graphics library
- **@react-three/drei** - React Three Fiber helpers and utilities
- **Vite** - Build tool and development server

### Backend
- **AWS** - Cloud infrastructure and hosting
- **S3 + CloudFront** - Asset hosting and CDN for 3D models
- **Prisma** - ORM for database management
- **REST API** - Backend services

## Architecture

### Database Schema
The project uses a recursive database structure with a single `locations` table:
- **Hierarchy:** `CAMPUS` → `BUILDING` → `FLOOR` → `ROOM`
- **Implementation:** Self-referencing table with `parent_id` relationships

### 3D Asset Strategy
- **Hero Assets:** High-fidelity photogrammetry models (limited to 3-4 key locations)
- **Greybox Assets:** Low-poly placeholder models for context
- **Compression:** All 3D models are Draco-compressed via `gltf-pipeline`
- **Hosting:** Frontend code on Vercel; heavy assets (.glb files) on AWS S3 + CloudFront

### Coordinate System
The 3D scene uses a geospatial anchor system:
- All positions are calculated from a real-world GPS anchor point
- Buildings are positioned using latitude/longitude coordinates
- Conversion utilities transform GPS coordinates to 3D vector positions

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd DigitalTwin
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Project Status

**Current Phase:** Early Development (Phase 1)

This project is in the initial stages of development. Current focus areas include:
- Setting up the geospatial coordinate system
- Establishing the 3D scene architecture
- Configuring asset hosting infrastructure
- Building core navigation components

## License

This project is part of a capstone course and is not currently licensed for public use.
