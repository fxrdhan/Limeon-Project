import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import type { NavbarProps } from "@/types";
import { useAuthStore } from "@/store/authStore";
import DateTimeDisplay from "./live-datetime";

const Profile = lazy(() => import("@/components/profile"));
const OnlineUsersControl = lazy(() => import("./online-users-control"));

const OnlineUsersFallback = ({ onInteract }: { onInteract: () => void }) => (
  <button
    type="button"
    aria-label="Muat daftar pengguna online"
    className="flex items-center space-x-3 rounded-xl px-2 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-50"
    onMouseEnter={onInteract}
    onFocus={onInteract}
    onClick={onInteract}
  >
    <div className="flex items-center -space-x-2">
      <span className="h-8 w-8 rounded-full border border-white bg-slate-200" />
      <span className="h-8 w-8 rounded-full border border-white bg-slate-300" />
      <span className="h-8 w-8 rounded-full border border-white bg-slate-100" />
    </div>
    <TbLayoutSidebarLeftExpand className="size-5 text-slate-600" aria-hidden="true" />
  </button>
);

const Navbar = ({ sidebarCollapsed, onOnlineUsersIntent }: NavbarProps) => {
  const { user } = useAuthStore();
  const [shouldLoadOnlineUsers, setShouldLoadOnlineUsers] = useState(false);

  const profileFallback =
    (user?.profilephoto_thumb ?? user?.profilephoto) ? (
      <img
        src={user.profilephoto_thumb || user.profilephoto || ""}
        alt="Profile"
        className="h-11 w-11 rounded-full object-cover"
      />
    ) : (
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/80 text-sm text-white">
        {user?.name?.charAt(0).toUpperCase() || "U"}
      </div>
    );

  const loadOnlineUsers = useCallback(() => {
    setShouldLoadOnlineUsers(true);
    onOnlineUsersIntent?.();
  }, [onOnlineUsersIntent]);

  useEffect(() => {
    loadOnlineUsers();
  }, [loadOnlineUsers]);

  return (
    <nav className="sticky top-0 z-40 box-border h-[73px] select-none border-b border-slate-200 bg-white px-4">
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center h-8">
          <h1 className="flex items-center" style={{ minHeight: "2em" }}>
            <span
              className="text-2xl font-bold text-slate-800"
              style={{
                display: "inline-block",
                verticalAlign: "top",
                lineHeight: "2em",
                height: "2em",
              }}
            >
              Pharma
            </span>
            <span
              className={`inline-block overflow-hidden whitespace-nowrap text-2xl font-bold text-slate-800 transition-all duration-200 ${
                sidebarCollapsed ? "max-w-24 opacity-100" : "max-w-0 opacity-0"
              }`}
              style={{
                verticalAlign: "top",
                lineHeight: "2em",
                height: "2em",
              }}
            >
              Sys
            </span>
            <span
              className={`inline-block overflow-hidden whitespace-nowrap text-2xl font-bold text-slate-800 transition-all duration-200 ${
                sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-16 opacity-100"
              }`}
              style={{
                verticalAlign: "top",
                lineHeight: "2em",
                height: "2em",
              }}
            >
              cy
            </span>
            <span
              className={`inline-block overflow-hidden whitespace-nowrap text-2xl font-bold text-slate-800 transition-all duration-200 ${
                sidebarCollapsed ? "ml-0 max-w-0 opacity-0" : "ml-1.5 max-w-80 opacity-100"
              }`}
              style={{
                verticalAlign: "top",
                lineHeight: "2em",
                height: "2em",
              }}
            >
              Management System
            </span>
          </h1>
        </div>
        <div></div>
        <div className="relative flex justify-end items-center">
          <DateTimeDisplay />

          <div className="h-5 w-px bg-slate-300 mx-4"></div>

          <Suspense fallback={<OnlineUsersFallback onInteract={loadOnlineUsers} />}>
            {shouldLoadOnlineUsers ? (
              <OnlineUsersControl />
            ) : (
              <OnlineUsersFallback onInteract={loadOnlineUsers} />
            )}
          </Suspense>

          <div className="h-5 w-px bg-slate-300 mx-5"></div>

          <Suspense fallback={profileFallback}>
            <Profile />
          </Suspense>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
