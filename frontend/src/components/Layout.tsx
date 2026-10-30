import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import HelpSheet from "./HelpSheet";
import DemoBanner from "./DemoBanner";
import TimeZoneProvider from "../settings/TimeZoneProvider";
import {
  CodeIcon,
  DashboardIcon,
  HelpIcon,
  ProfileIcon,
  TrophyIcon,
} from "./icons";
import { useApiStatus } from "./useApiStatus";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header>
        <TopBar />
        {user && <TabBar />}
      </header>
      <DemoBanner />
      <TimeZoneProvider key={user?.id ?? "signed-out"} enabled={Boolean(user)}>
        <main>
          <Outlet />
        </main>
      </TimeZoneProvider>
      {/* Signed-out pages only. Hussain's Playwright smoke test loads "/",
          lands on /signin and checks for "API: ok", so it has to live here.
          Signed-in users see the API status on their Profile page. */}
      {!user && <SignedOutFooter />}
    </div>
  );
}

// Help on the left next to the title, profile on the right. The help button
// opens the help sheet.
function TopBar() {
  const { user } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="top-bar">
      <button
        type="button"
        className="icon-button"
        aria-label="Help"
        aria-expanded={helpOpen}
        onClick={() => setHelpOpen(true)}
      >
        <HelpIcon />
      </button>
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
      {/* Tapping the name goes home, like most apps. Signed out, "/" sends
          you on to sign-in. */}
      <h1>
        <Link to="/" className="brand-link">
          StackSprint
        </Link>
      </h1>
      {/* Placeholder: the user's first initial. To be replaced by the
          customizable badge. */}
      {user && (
        <Link to="/profile" className="avatar" aria-label="Profile">
          {user.email[0].toUpperCase()}
        </Link>
      )}
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
  // Same for a single problem and its posts, under Problems.
  const onProblem = pathname.startsWith("/problem/");

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "tab active" : "tab";

  return (
    <nav className="tab-bar" aria-label="Main">
      <NavLink
        to="/problems"
        className={({ isActive }) =>
          tabClass({ isActive: isActive || onProblem })
        }
      >
        <CodeIcon />
        <span className="tab-label">Problems</span>
      </NavLink>
      <NavLink to="/" end className={tabClass}>
        <DashboardIcon />
        <span className="tab-label">Dashboard</span>
      </NavLink>
      <NavLink to="/leaderboard" className={tabClass}>
        <TrophyIcon />
        <span className="tab-label">Leaderboard</span>
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
