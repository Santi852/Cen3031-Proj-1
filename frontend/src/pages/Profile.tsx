import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useApiStatus } from "../components/useApiStatus";
import GoalSettings from "../goals/GoalSettings";
import { useWeeklyGoal } from "../goals/useWeeklyGoal";
import { getLinkedAccount } from "../leetcode/linkService";

// Account details, weekly goal, linked services and sign out. Later also the
// home for the timezone setting (1-11).
export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const apiStatus = useApiStatus();
  const weeklyGoal = useWeeklyGoal(user?.id);
  // undefined until the server answers, null if nothing is linked.
  const [leetcodeUsername, setLeetcodeUsername] = useState<
    string | null | undefined
  >(undefined);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLinkedAccount().then(
      (account) => {
        if (!cancelled) setLeetcodeUsername(account?.username ?? null);
      },
      () => {
        if (!cancelled) setLinkError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/signin");
  }

  return (
    <section>
      {/* Hidden like the Dashboard title: the tab bar shows where you are. */}
      <h2 className="visually-hidden">Profile</h2>

      <div className="profile-card">
        <p className="profile-email">{user?.email}</p>
      </div>

      <GoalSettings {...weeklyGoal} />

      <section className="profile-card" aria-labelledby="linked-accounts">
        <h3 id="linked-accounts">Linked accounts</h3>
        <div className="profile-row">
          <div>
            <p className="profile-row-title">LeetCode</p>
            <p className="profile-row-detail">
              {linkError
                ? "Couldn't load"
                : leetcodeUsername === undefined
                  ? "Loading…"
                  : (leetcodeUsername ?? "Not linked")}
            </p>
          </div>
          {/* The API doesn't allow switching accounts once linked, so there's
              no Change button. */}
          {leetcodeUsername === null && (
            <Link to="/link-account" className="button button-secondary">
              Link
            </Link>
          )}
        </div>
      </section>

      <button
        type="button"
        className="button button-secondary profile-sign-out"
        onClick={() => void handleSignOut()}
      >
        Sign out
      </button>

      <p className="profile-meta">API: {apiStatus}</p>
    </section>
  );
}
