import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../redux/app/hook";
import { slugify } from "./slugify";

export function useCurrentBoard() {
  const boards = useAppSelector((state) => state.board.boards);
  const { boardSlug } = useParams<{ boardSlug: string }>();

  return useMemo(
    () => (boardSlug ? boards.find((b) => slugify(b.name) === boardSlug) ?? null : null),
    [boards, boardSlug]
  );
}