import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useApiStatus } from "../components/useApiStatus";
import { getLinkedUsername } from "../leetcode/linkService";

// Account details, linked services and sign out. Later the natural home for
// settings such as weekly goals and the timezone setting (1-11).
export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const apiStatus = useApiStatus();
  // Stub: the link-account stub remembers the username until a page reload.
  // Swap for the real linked account once Matias's 1-04 is merged.
  const leetcodeUsername = getLinkedUsername();

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

      <section className="profile-card" aria-labelledby="linked-accounts">
        <h3 id="linked-accounts">Linked accounts</h3>
        <div className="profile-row">
          <div>
            <p className="profile-row-title">LeetCode</p>
            <p className="profile-row-detail">
              {leetcodeUsername ?? "Not linked"}
            </p>
          </div>
          <Link to="/link-account" className="button button-secondary">
            {leetcodeUsername ? "Change" : "Link"}
          </Link>
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
