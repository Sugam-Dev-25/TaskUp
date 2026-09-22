import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { useCurrentUser } from './components/api/useCurrentUser'
import { Auth } from './components/redux/features/User/Auth';
import { useAppSelector, useAppDispatch } from './components/redux/app/hook';
import { logout } from './components/redux/features/User/login/loginSlice';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { GlobalTopLoader } from './components/context/GlobalTopLoader';

function App() {
    const user = useAppSelector(state => state.login.user)
    const dispatch = useAppDispatch();

    const { isFetched } = useCurrentUser();

    // Fired by authRefresh.ts when POST /auth/refresh itself fails — the
    // httpOnly refresh cookie is gone/expired/revoked, so there's no way
    // to get a new access token and the session is genuinely over.
    useEffect(() => {
        const handleSessionExpired = () => dispatch(logout());
        window.addEventListener('auth:sessionExpired', handleSessionExpired);
        return () => window.removeEventListener('auth:sessionExpired', handleSessionExpired);
    }, [dispatch]);

    if (!isFetched) {
        return (
            <div className="flex items-center justify-center min-h-screen text-xl text-gray-700">
                Loading Application Session...
            </div>
        );
    }
    return (
        <>
        <GlobalTopLoader/>
        <Routes>
            <Route path="/" element={<Auth />} />
            <Route
                path="/:role/dashboard/*"
                element={
                    user?.full_name ? (
                        <AdminDashboard />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </>
    )
}

export default App