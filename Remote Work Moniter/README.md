# 🏢 Remote Work Monitor & Team Collaboration Suite

A premium, full-featured platform for remote teams to stay synchronized, manage tasks, track productivity, and communicate in real-time. Built with **React**, **Vite**, **Supabase**, and **WebRTC**.

![App Preview](https://via.placeholder.com/1200x600?text=Remote+Work+Monitor+Dashboard)

## 🚀 Key Features

### 📡 Real-time Communication
-   **Video Calls (1-on-1)**: Initiate face-to-face signals directly through the platform.
-   **Channel Huddles**: Instant group voice/video sync-ups in team channels.
-   **Premium Chat**: Threaded conversations, emoji support, and file sharing (Images/Documents).

### 📋 Project & Task Management
-   **Kanban Board**: Drag-and-drop task management with "To Do", "In Progress", and "Done" columns.
-   **Subtask Checklists**: Break down complex tasks with progress tracking.
-   **Real-time Sync**: All team members see task updates instantly.

### 🕒 Productivity & Tracking
-   **Work Sessions**: One-click session start/stop with automated duration tracking.
-   **Idle Detection**: Automatically pause sessions and notify admins when inactivity is detected.
-   **Screen Sharing**: Built-in WebRTC screen monitoring for team transparency.
-   **Functional Analytics**: Comprehensive dashboard showing productivity scores, active hours, and task metrics.

### 📅 Attendance & Admin
-   **Leave Management**: Employees can apply for sick, vacation, or unpaid leave; Admins approve/reject in real-time.
-   **Employee Onboarding**: Secure invitation system for team expansion.
-   **Role-Based Access**: Specialized dashboards for Admins and Employees.

## 🛠️ Tech Stack
-   **Frontend**: React 18, Vite, Framer Motion, Recharts, Lucide Icons, Tailwind CSS.
-   **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage).
-   **State Management**: Redux Toolkit.
-   **Communication**: WebRTC for Peer-to-Peer media streaming.

---

## ⚙️ Setup & Installation

### 1. Prerequisites
-   Node.js (v18+)
-   NPM or Yarn
-   A Supabase Project

### 2. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Setup
Execute the following SQL scripts in your Supabase SQL Editor in order:
1.  `supabase_schema.sql` (Main tables & Roles)
2.  `supabase_leaves_schema.sql` (Leave management)
3.  `supabase_subtasks_schema.sql` (Subtasks logic)
4.  `supabase_chat_files_schema.sql` (Storage configurations)
5.  `supabase_calls_schema.sql` (WebRTC signaling)

### 4. Running Locally
```bash
npm install
npm run dev
```

## 📦 Deployment
This project is Vite-based and can be deployed easily to **Vercel**, **Netlify**, or **GitHub Pages**.

1.  Build the project: `npm run build`
2.  Upload the `dist` folder to your provider.
3.  Configure your environment variables in the provider's dashboard.

---

## 📜 License
Private Project - All Rights Reserved.
