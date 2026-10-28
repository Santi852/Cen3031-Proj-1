import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { DashboardIcon, ProfileIcon, TrophyIcon } from "./icons";
import { useApiStatus } from "./useApiStatus";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header>
        <h1>StackSprint</h1>
        {user && <TabBar />}
      </header>
      <main>
        <Outlet />
      </main>
      {/* Signed-out pages only. Hussain's Playwright smoke test loads "/",
          lands on /signin and checks for "API: ok", so it has to live here.
          Signed-in users see the API status on their Profile page. */}
      {!user && <SignedOutFooter />}
    </div>
  );
}

// One nav for every screen size: a row under the title on desktop, pinned to
// the bottom of the screen on phones (see the CSS). Dashboard sits in the
// middle as the home tab, like most mobile apps.
function TabBar() {
  const { pathname } = useLocation();
  // Link Account is reached from Profile, so Profile stays highlighted there.
  const onProfile = pathname.startsWith("/link-account");

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "tab active" : "tab";

  return (
    <nav className="tab-bar" aria-label="Main">
      <NavLink to="/leaderboard" className={tabClass}>
        <TrophyIcon />
        <span className="tab-label">Leaderboard</span>
      </NavLink>
      <NavLink to="/" end className={tabClass}>
        <DashboardIcon />
        <span className="tab-label">Dashboard</span>
      </NavLink>
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          tabClass({ isActive: isActive || onProfile })
        }
      >
        <ProfileIcon />
        <span className="tab-label">Profile</span>
      </NavLink>
    </nav>
  );
}

function SignedOutFooter() {
  const apiStatus = useApiStatus();
  return (
    <footer>
      <p>API: {apiStatus}</p>
    </footer>
  );
}
