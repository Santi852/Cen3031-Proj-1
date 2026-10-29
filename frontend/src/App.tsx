import Layout from "./components/Layout";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import LinkAccount from "./pages/LinkAccount";
import Leaderboard from "./pages/Leaderboard";
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
          <Route path="leaderboard" element={<Leaderboard />} />
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
