import Layout from "./components/Layout";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import LinkAccount from "./pages/LinkAccount";
import Leaderboard from "./pages/Leaderboard";
import Problem from "./pages/Problem";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="link-account" element={<LinkAccount />} />
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="problem/:slug" element={<Problem />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
