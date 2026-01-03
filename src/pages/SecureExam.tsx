import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Maximize,
  Eye,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  points: number;
}

interface ExamSession {
  id: string;
  quiz_id: string;
  started_at: string;
  tab_switches: number;
  fullscreen_exits: number;
  is_flagged: boolean;
}

export default function SecureExam() {
  const { quizId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [examSession, setExamSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && quizId) {
      fetchQuizData();
    }
  }, [user, quizId]);

  // Timer
  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, timeLeft]);

  // Tab visibility detection
  useEffect(() => {
    if (!examStarted || !examSession) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityViolation('tab_switch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examStarted, examSession]);

  // Fullscreen detection
  useEffect(() => {
    if (!examStarted) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        handleSecurityViolation('fullscreen_exit');
      }
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted, isFullscreen]);

  // Prevent copy/paste and right-click
  useEffect(() => {
    if (!examStarted) return;

    const preventAction = (e: Event) => {
      e.preventDefault();
      toast({
        title: 'Action Blocked',
        description: 'Copy/paste is disabled during the exam.',
        variant: 'destructive',
      });
    };

    document.addEventListener('copy', preventAction);
    document.addEventListener('paste', preventAction);
    document.addEventListener('contextmenu', preventAction);

    return () => {
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('paste', preventAction);
      document.removeEventListener('contextmenu', preventAction);
    };
  }, [examStarted]);

  const fetchQuizData = async () => {
    const { data: questionsData, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index');

    if (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exam questions.',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    const formattedQuestions: Question[] = (questionsData || []).map((q) => ({
      id: q.id,
      question: q.question,
      options: Array.isArray(q.options) ? q.options as string[] : [],
      correct_answer: q.correct_answer,
      points: q.points || 10,
    }));
    
    setQuestions(formattedQuestions);
    setIsLoading(false);
  };

  const handleSecurityViolation = async (type: 'tab_switch' | 'fullscreen_exit') => {
    if (!examSession) return;

    const field = type === 'tab_switch' ? 'tab_switches' : 'fullscreen_exits';
    const newCount = (examSession[field] || 0) + 1;

    // Update session
    await supabase
      .from('exam_sessions')
      .update({ 
        [field]: newCount,
        is_flagged: newCount >= 3,
        flag_reason: newCount >= 3 ? `Multiple ${type.replace('_', ' ')}s detected` : null
      })
      .eq('id', examSession.id);

    setExamSession({ ...examSession, [field]: newCount, is_flagged: newCount >= 3 });

    if (newCount >= 3) {
      setWarningMessage('Your exam has been flagged due to multiple security violations. The exam will now end.');
      setShowWarning(true);
      setTimeout(() => handleSubmitExam(), 3000);
    } else {
      toast({
        title: 'Warning',
        description: `${type === 'tab_switch' ? 'Tab switch' : 'Fullscreen exit'} detected. (${newCount}/3 allowed)`,
        variant: 'destructive',
      });
    }
  };

  const startExam = async () => {
    if (!user || !quizId) return;

    // Request fullscreen
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }

    // Create exam session
    const { data: session, error } = await supabase
      .from('exam_sessions')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return;
    }

    setExamSession(session);
    setExamStarted(true);
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Calculate score
    let correctCount = 0;
    let totalPoints = 0;

    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
        totalPoints += q.points;
      }
    });

    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    // Save quiz attempt
    if (user && quizId) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        correct_answers: correctCount,
        total_questions: questions.length,
        time_taken_seconds: 1800 - timeLeft,
      });

      // End exam session
      if (examSession) {
        await supabase
          .from('exam_sessions')
          .update({
            ended_at: new Date().toISOString(),
            is_active: false,
          })
          .eq('id', examSession.id);
      }
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    toast({
      title: 'Exam Submitted',
      description: `Your score: ${score}%`,
    });

    navigate('/dashboard');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 gradient-primary rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Secure Exam Environment</CardTitle>
            <CardDescription>
              This exam will be conducted in a secure environment with anti-cheat measures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Maximize className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Fullscreen Mode</p>
                  <p className="text-xs text-muted-foreground">Exam runs in fullscreen</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Eye className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-sm">Tab Monitoring</p>
                  <p className="text-xs text-muted-foreground">Switching tabs will be recorded</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Lock className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-sm">Copy/Paste Disabled</p>
                  <p className="text-xs text-muted-foreground">To prevent cheating</p>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Important</p>
                  <p className="text-xs text-muted-foreground">
                    3 security violations will flag and end your exam automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={startExam}>
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display font-bold">Secure Exam</span>
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-success" />
                <span className="text-xs text-success">Protected</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {examSession?.is_flagged && (
              <Badge variant="destructive">Flagged</Badge>
            )}
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm">{(examSession?.tab_switches || 0) + (examSession?.fullscreen_exits || 0)}/3</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-24 container mx-auto px-4 max-w-3xl">
        {question && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">Question {currentQuestion + 1} of {questions.length}</Badge>
                <Badge className="bg-primary/10 text-primary">{question.points} points</Badge>
              </div>
              <CardTitle className="text-xl">{question.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(question.id, idx)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answers[question.id] === idx
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[question.id] === idx
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {answers[question.id] === idx && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="container mx-auto max-w-3xl flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                  idx === currentQuestion
                    ? 'bg-primary text-primary-foreground'
                    : answers[questions[idx]?.id] !== undefined
                    ? 'bg-success/20 text-success'
                    : 'bg-muted hover:bg-muted-foreground/20'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmitExam} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
            >
              Next
            </Button>
          )}
        </div>
      </footer>

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Security Violation
            </AlertDialogTitle>
            <AlertDialogDescription>{warningMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarning(false)}>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
