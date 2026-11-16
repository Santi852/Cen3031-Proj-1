import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BadgeEditor from "../badge/BadgeEditor";
import BadgeIcon from "../badge/BadgeIcon";
import { useMyBadge } from "../badge/useMyBadge";
import HelpSheet from "./HelpSheet";
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

// Help on the left next to the title, the user's badge on the right. The
// help button opens the help sheet; the badge opens the badge editor.
function TopBar() {
  const { user } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const { badge, save } = useMyBadge(user?.id);

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
      {/* Profile is still one tap away in the tab bar, so the badge can
          open its editor instead of linking there. */}
      {user && (
        <button
          type="button"
          className="avatar badge-button"
          aria-label="Edit your badge"
          aria-expanded={badgeOpen}
          onClick={() => setBadgeOpen(true)}
        >
          <BadgeIcon badge={badge} decorative />
        </button>
      )}
      {badgeOpen && (
        <BadgeEditor
          badge={badge}
          onSave={save}
          onClose={() => setBadgeOpen(false)}
        />
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
      {/* No `end`, so it stays highlighted on a league page too. */}
      <NavLink to="/social" className={tabClass}>
        <TrophyIcon />
        <span className="tab-label">Social</span>
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
