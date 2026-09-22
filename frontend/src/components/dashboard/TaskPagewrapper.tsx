
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../redux/app/hook';
import { getTasks } from '../redux/features/Task/taskSlice';
import { useEffect } from 'react';
import { GlobalSpinner } from '../context/GlobalSpinner';
import { MyTask } from './tabs/MyTask';
import { AllTask } from './tabs/AllTask';

export const TasksPageWrapper = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope'); // "mine" or "all"
  const userRole = useAppSelector(state => state.login.user?.role);
  const loading = useAppSelector(state => state.task.loading);

  useEffect(() => {
    dispatch(getTasks({ scope: scope === 'mine' ? 'mine' : 'all' }));
  }, [dispatch, scope]);

  if (loading === 'pending') return <GlobalSpinner />;

  // Render based on role and scope
  if (scope === 'mine') return <MyTask />;
  if (scope === 'all' && (userRole === 'admin' || userRole === 'super-admin')) return <AllTask />;

  // fallback
  return <MyTask />;
};
