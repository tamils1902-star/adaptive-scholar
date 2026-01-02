import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import LessonView from "./pages/LessonView";
import QuizView from "./pages/QuizView";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLessons from "./pages/AdminLessons";
import AdminAnalytics from "./pages/AdminAnalytics";
import ProfileSettings from "./pages/ProfileSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
            <Route path="/lesson/:lessonId" element={<LessonView />} />
            <Route path="/quiz/:quizId" element={<QuizView />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/course/:courseId/lessons" element={<AdminLessons />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
