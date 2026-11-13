import Layout from "./components/Layout";
import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import LinkAccount from "./pages/LinkAccount";
import Social from "./pages/Social";
import League from "./pages/League";
import Problem from "./pages/Problem";
import Problems from "./pages/Problems";
import PostDetail from "./pages/PostDetail";
import PostEditor from "./pages/PostEditor";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import RequireAuth from "./auth/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route element={<RequireAuth />}>
          <Route index element={<Dashboard />} />
          <Route path="social" element={<Social />} />
          <Route path="social/leagues/:id" element={<League />} />
          {/* Old links and bookmarks to the Leaderboard tab still work. */}
          <Route
            path="leaderboard"
            element={<Navigate to="/social" replace />}
          />
          <Route path="profile" element={<Profile />} />
          <Route path="link-account" element={<LinkAccount />} />
          <Route path="problems" element={<Problems />} />
          <Route path="problem/:slug" element={<Problem />} />
          <Route path="problem/:slug/new" element={<PostEditor />} />
          <Route path="problem/:slug/posts/:postId" element={<PostDetail />} />
          <Route
            path="problem/:slug/posts/:postId/edit"
            element={<PostEditor />}
          />
        </Route>
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
