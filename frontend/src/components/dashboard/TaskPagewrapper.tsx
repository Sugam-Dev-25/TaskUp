
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../redux/app/hook';
import { getTasks } from '../redux/features/Task/taskSlice';
import { useEffect } from 'react';

import { MyTask } from './tabs/MyTask';
import { AllTask } from './tabs/AllTask';

export const TasksPageWrapper = () => {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const scope = searchParams.get('scope'); // "mine" or "all"
  const userRole = useAppSelector(state => state.login.user?.role);


  useEffect(() => {
    dispatch(getTasks({ scope: scope === 'mine' ? 'mine' : 'all' }));
  }, [dispatch, scope]);


  // Render based on role and scope
  if (scope === 'mine') return <MyTask />;
  if (scope === 'all' && (userRole === 'ceo' || userRole === 'manager')) return <AllTask />;

  // fallback
  return <MyTask />;
};
