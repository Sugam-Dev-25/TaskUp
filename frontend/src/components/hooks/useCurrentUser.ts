import { useSelector } from "react-redux";
import type { RootState } from "../redux/app/store";

export const useCurrentUser = () => {
  return useSelector(
    (state: RootState) => state.login?.user
  );
};
