import { NavLink, Outlet } from "react-router-dom";

const navClass = ({ isActive }: { isActive: boolean }) => isActive ? "nav-link active" : "nav-link";

export default function Layout(){
    return (
        <div className="app-shell">
            <header>
                <h1>StackSprint</h1>
                <nav>
                    <NavLink to="/" end className={navClass}>Dashboard</NavLink>
                    <NavLink to="/leaderboard" className={navClass}>Leaderboard</NavLink>
                    <NavLink to="/link-account" className={navClass}>Link Account</NavLink>
                    <NavLink to="/signin" className={navClass}>Sign in</NavLink>
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
            <footer>
                <p> CEN3031 &middot; Santiago, Matias, Hussain</p>
            </footer>
        </div>
    );
}  
