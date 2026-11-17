import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BadgeEditor from "../badge/BadgeEditor";
import BadgeIcon from "../badge/BadgeIcon";
import { useMyBadge } from "../badge/useMyBadge";
import FriendsSheet from "../friends/FriendsSheet";
import { OPEN_FRIENDS, type FriendsTab } from "../friends/openFriends";
import {
  CodeIcon,
  DashboardIcon,
  ProfileIcon,
  TrophyIcon,
  UsersIcon,
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

// Friends on the left next to the title, the user's badge on the right.
// Friends opens the friends sheet (#93); the badge opens the badge editor.
// Help moved to Profile.
function TopBar() {
  const { user } = useAuth();
  // Which tab the friends sheet opened on, or null while it's closed.
  const [friendsTab, setFriendsTab] = useState<FriendsTab | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const { badge, save } = useMyBadge(user?.id);

  // Other parts of the app open the sheet with openFriends().
  useEffect(() => {
    const open = (event: Event) =>
      setFriendsTab((event as CustomEvent<FriendsTab>).detail);
    window.addEventListener(OPEN_FRIENDS, open);
    return () => window.removeEventListener(OPEN_FRIENDS, open);
  }, []);

  return (
    <div className="top-bar">
      {user && (
        <button
          type="button"
          className="icon-button"
          aria-label="Friends"
          aria-expanded={friendsTab !== null}
          onClick={() => setFriendsTab("following")}
        >
          <UsersIcon />
        </button>
      )}
      {user && friendsTab && (
        <FriendsSheet
          initialTab={friendsTab}
          onClose={() => setFriendsTab(null)}
        />
      )}
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
