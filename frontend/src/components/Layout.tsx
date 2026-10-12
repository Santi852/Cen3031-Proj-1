import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) => isActive ? "nav-link active" : "nav-link";

export default function Layout(){
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    // Moved here from Dashboard: "/" now redirects signed-out visitors to
    // /signin, and Hussain's Playwright smoke test still needs "API: ok"
    // visible after loading "/". The footer renders on every page.
    const [apiStatus, setApiStatus] = useState("checking...");

    useEffect(() => {
        fetch("http://localhost:3001/api/health")
            .then((res) => res.json())
            .then((data) => setApiStatus(data.status))
            .catch(() => setApiStatus("unreachable"));
    }, []);

    async function handleSignOut() {
        await signOut();
        navigate("/signin");
    }

    return (
        <div className="app-shell">
            <header>
                <h1>StackSprint</h1>
                <nav>
                    <NavLink to="/" end className={navClass}>Dashboard</NavLink>
                    <NavLink to="/leaderboard" className={navClass}>Leaderboard</NavLink>
                    <NavLink to="/link-account" className={navClass}>Link Account</NavLink>
                    {user ? (
                        <>
                            <span className="nav-user">{user.email}</span>
                            <button type="button" className="nav-link" onClick={handleSignOut}>Sign out</button>
                        </>
                    ) : (
                        <NavLink to="/signin" className={navClass}>Sign in</NavLink>
                    )}
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
            <footer>
                <p> CEN3031 &middot; Santiago, Matias, Hussain</p>
                <p>API: {apiStatus}</p>
            </footer>
        </div>
    );
}
