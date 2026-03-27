import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Browse from "./pages/Browse";
import Play from "./pages/Play";
import PlayMultiplayer from "./pages/PlayMultiplayer";
import EditorLobby from "./pages/EditorLobby";
import EditorMultiplayer from "./pages/EditorMultiplayer";
import Auth from "./pages/Auth";
import Lobby from "./pages/Lobby";
import LobbyV2 from "./pages/LobbyV2";
import Friends from "./pages/Friends";
import GlobalLeaderboard from "./pages/GlobalLeaderboard";
import Download from "./pages/Download";
import Settings from "./pages/Settings";
import BLOXEditor from "./pages/BLOXEditor";
import TwoFA from "./pages/TwoFA";
import Profile from "./pages/Profile";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";
import { useDiscordPresence } from "@/hooks/useDiscordPresence";
import { StartupWarningDialog } from "@/components/game/StartupWarningDialog";

const queryClient = new QueryClient();

// Clerk publishable key
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Inner component to use hooks
function AppContent() {
  useDiscordPresence();

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <StartupWarningDialog />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor-lobby" element={<EditorLobby />} />
          <Route path="/editor-multiplayer" element={<EditorMultiplayer />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/play" element={<Play />} />
          <Route path="/play-multiplayer" element={<PlayMultiplayer />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/two-fa" element={<TwoFA />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/lobby-v2" element={<LobbyV2 />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/leaderboard" element={<GlobalLeaderboard />} />
          <Route path="/download" element={<Download />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/blox-editor" element={<BLOXEditor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

const App = () => {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default App;
