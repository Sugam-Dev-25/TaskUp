
import { Sidebar } from './Sidebar'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HomeTab } from './tabs/HomeTab'
import { useAppSelector } from '../redux/app/hook'
import { Topbar } from './TopBar'
import { TasksPageWrapper } from './TaskPagewrapper'
import { useState } from 'react'
import { BoardQueryWrapper } from '../hooks/BoardQueryWrapper'
import { Teams } from './tabs/Team'
import { TaskPage } from './pages/TaskPage'
import { Profile } from './pages/Profile'


export const AdminDashboard = () => {
  const [collapsed, setCollapsed] = useState(false);

  const user = useAppSelector(state => state.login.user);
  const role = user?.role;

  const location = useLocation();
  const isChatPage = location.pathname.endsWith("/chats");


  return (
    <div className='min-h-screen'>

      {!isChatPage && (
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      )}

      <div className={`transition-all duration-300 ${!isChatPage
        ? collapsed
          ? "ml-16"
          : "ml-64"
        : ""
        }`}>

        {!isChatPage && <Topbar />}
        <Routes>
          <Route index element={role ? <HomeTab /> : <div className="p-10 text-center text-gray-400">Loading...</div>} />
          <Route path=":boardSlug" element={<BoardQueryWrapper />} />
          <Route path="tasks" element={<TasksPageWrapper />} />
          <Route path="*" element={<Navigate to={`/`} replace />} />
          <Route path="teams" element={<Teams />} />
          <Route path="tasks/:taskId" element={<TaskPage />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
};

