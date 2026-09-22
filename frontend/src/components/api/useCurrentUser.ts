import { useQuery } from "@tanstack/react-query";
import axiosClient from "./userApiClient";
import { useAppDispatch } from "../redux/app/hook";
import { setAuthState, logout } from "../redux/features/User/login/loginSlice";

export const useCurrentUser = () => {
    const dispatch = useAppDispatch();

    return useQuery({
        queryKey: ["currentUser"],
        queryFn: async () => {
            try {
                // GET /profile/me returns a freelance/tutor profile row (most
                // accounts won't have one -> 404). /auth/me is the "who is
                // logged in" endpoint -- always exists for any authenticated
                // account and is guarded by the same requireAuth middleware,
                // which reads Authorization: Bearer <token> (see userApiClient.ts).
                const res = await axiosClient.get("/auth/me");

                // /auth/me returns the account object directly (accountsService.toPublic(user)),
                // not wrapped in a `{ user }` envelope.
                const user = res.data;
                dispatch(setAuthState(user));
                return user;
            } catch (error) {
                dispatch(logout());
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });
};
