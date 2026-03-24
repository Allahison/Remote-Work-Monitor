# 🏢 Remote Work Monitor & Team Collaboration Suite

A premium, full-featured platform for remote teams to stay synchronized, manage tasks, track productivity, and communicate in real-time. Built with **React**, **Vite**, **Supabase**, and **WebRTC**.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg?style=for-the-badge&logo=vercel)](https://remote-work-monitor-nzrm.vercel.app/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-blue?style=for-the-badge&logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react)](https://react.dev)

---

## 🚀 Live Demo
**Check out the live application here:** [https://remote-work-monitor-nzrm.vercel.app/](https://remote-work-monitor-nzrm.vercel.app/)

---

## 📋 Table of Contents
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-setup--installation)
- [Database Setup](#-database-setup)
- [Deployment Tips](#-deployment)

---

## 🚀 Key Features

### 📡 Real-time Communication
- **Video Calls (1-on-1)**: Instant face-to-face signals directly through the platform.
- **Channel Huddles**: Instant group voice/video sync-ups in team channels.
- **Premium Chat**: Threaded conversations, emoji support, and file sharing (Images/Documents).

### 📋 Project & Task Management
- **Kanban Board**: Drag-and-drop task management with "To Do", "In Progress", and "Done" columns.
- **Subtask Checklists**: Break down complex tasks with progress tracking.
- **Real-time Sync**: All team members see task updates instantly.

### 🕒 Productivity & Tracking
- **Work Sessions**: One-click session start/stop with automated duration tracking.
- **Idle Detection**: Automatically pause sessions and notify admins when inactivity is detected.
- **Functional Analytics**: Comprehensive dashboard showing productivity scores, active hours, and task metrics.

### 📅 Attendance & Admin
- **Leave Management**: Employees can apply for leaves; Admins approve/reject in real-time.
- **Employee Onboarding**: Secure invitation system for team expansion.
- **Role-Based Access**: Specialized dashboards for Admins and Employees.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Framer Motion, Recharts, Lucide Icons, Tailwind CSS.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Communication**: WebRTC for Peer-to-Peer media streaming.

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
