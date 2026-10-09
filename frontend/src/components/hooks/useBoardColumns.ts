import { useAppSelector } from "../redux/app/hook";

export function useBoardColumns(boardId: string | undefined) {
  const allColumns = useAppSelector((state) => state.column.columns);
  return boardId ? allColumns[boardId] || [] : [];
}