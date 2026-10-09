import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/app/hook";
import { useCurrentBoard } from "./useCurrentBoard";
import { fetchBoard } from "../redux/features/Board/boardSlice";
import { fetchColumn } from "../redux/features/Column/columnSlice";
import { getTasks } from "../redux/features/Task/taskSlice";
import { useParams } from "react-router-dom";

export function useBoardData() {
  const dispatch = useAppDispatch();
  const currentBoard = useCurrentBoard();
  const boards = useAppSelector((state) => state.board.boards);
  const { boardSlug } = useParams<{ boardSlug: string }>();

  const isBoardLoading = useAppSelector((state) => state.board.loading === "pending");
  const isTaskLoading = useAppSelector((state) => state.task.loading === "pending");

  useEffect(() => {
    if (boardSlug) dispatch(fetchBoard());
  }, [boardSlug, dispatch]);

  useEffect(() => {
    if (currentBoard?.id) {
      dispatch(getTasks({ boardId: currentBoard.id }));
      dispatch(fetchColumn(currentBoard.id));
    } else if (!boardSlug) {
      dispatch(getTasks());
    }
  }, [currentBoard?.id, boardSlug, dispatch]);

  useEffect(() => {
    if (!boardSlug && boards.length > 0) {
      boards.forEach((b) => dispatch(fetchColumn(b.id)));
    }
  }, [boardSlug, boards, dispatch]);

  return { board: currentBoard, loading: isBoardLoading || isTaskLoading };
}