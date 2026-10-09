import { Navigate, useParams } from 'react-router-dom';
import { useBoardData } from './useBoardData';
import { DashBoardHeader } from '../dashboard/tabs/DashBoardHeader';
import { DashBoardBody } from '../dashboard/tabs/DashBoardBody';

export const BoardQueryWrapper = () => {
  const { boardSlug } = useParams();
  useBoardData(); // fires fetchBoard/getTasks/fetchColumn as needed

  if (!boardSlug || boardSlug === "undefined") {
    return <Navigate to=".." />;
  }

  return (
    <>
      <DashBoardHeader />
      <DashBoardBody />
    </>
  );
};