import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface Quiz {
  id: string;
  title: string;
  lesson_id: string;
  difficulty: string;
  passing_score: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  points: number;
  order_index: number;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
}

export default function QuizView() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, number>>(new Map());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [showExplanation, setShowExplanation] = useState(false);

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

  const fetchQuizData = async () => {
    if (!user || !quizId) return;
    
    setIsLoading(true);

    // Fetch quiz details
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .maybeSingle();

    if (quizError || !quizData) {
      toast({
        title: 'Error',
        description: 'Quiz not found.',
        variant: 'destructive',
      });
      navigate('/courses');
      return;
    }

    setQuiz(quizData);

    // Fetch lesson
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('id, course_id, title')
      .eq('id', quizData.lesson_id)
      .maybeSingle();

    if (lessonData) {
      setLesson(lessonData);
    }

    // Fetch questions
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (questionsData) {
      const formattedQuestions: Question[] = questionsData.map(q => ({
        id: q.id,
        question: q.question,
        options: parseOptions(q.options),
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        points: q.points || 10,
        order_index: q.order_index || 0,
      }));
      setQuestions(formattedQuestions);
    }

    setIsLoading(false);
  };

  const parseOptions = (options: Json): string[] => {
    if (Array.isArray(options)) {
      return options.map(opt => String(opt));
    }
    if (typeof options === 'string') {
      try {
        return JSON.parse(options);
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleSelectAnswer = (questionId: string, answerIndex: number) => {
    if (isSubmitted) return;
    
    const newAnswers = new Map(selectedAnswers);
    newAnswers.set(questionId, answerIndex);
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitQuiz = async () => {
    if (!user || !quiz || questions.length === 0) return;

    let correctCount = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      const selectedAnswer = selectedAnswers.get(q.id);
      if (selectedAnswer === q.correct_answer) {
        correctCount++;
        totalPoints += q.points;
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    setScore(scorePercentage);
    setIsSubmitted(true);

    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    // Save quiz attempt
    await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quiz.id,
        score: scorePercentage,
        correct_answers: correctCount,
        total_questions: questions.length,
        time_taken_seconds: timeTaken,
      });

    // Update points in profile
    if (scorePercentage >= quiz.passing_score) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, current_level')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const newPoints = (profile.total_points || 0) + totalPoints;
        let newLevel = profile.current_level;

        // Adaptive level adjustment
        if (newPoints >= 500 && profile.current_level === 'beginner') {
          newLevel = 'intermediate';
        } else if (newPoints >= 1500 && profile.current_level === 'intermediate') {
          newLevel = 'advanced';
        }

        await supabase
          .from('profiles')
          .update({ 
            total_points: newPoints,
            current_level: newLevel as 'beginner' | 'intermediate' | 'advanced'
          })
          .eq('id', user.id);

        if (newLevel !== profile.current_level) {
          toast({
            title: 'Level Up!',
            description: `Congratulations! You've advanced to ${newLevel} level!`,
          });
        }
      }
    }

    // Create recommendations based on performance
    if (scorePercentage < quiz.passing_score && lesson) {
      await supabase
        .from('recommendations')
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          reason: `Review this lesson - you scored ${scorePercentage}% on the quiz`,
          priority: 10,
        });
    }
  };

  const handleRetry = () => {
    setSelectedAnswers(new Map());
    setIsSubmitted(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    setShowExplanation(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-success/10 text-success border-success/20';
      case 'intermediate':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'advanced':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="border-0 shadow-lg max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No questions available for this quiz.</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressValue = ((currentQuestionIndex + 1) / questions.length) * 100;
  const passed = score >= quiz.passing_score;

  // Results View
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/lesson/${lesson?.id}`)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 gradient-primary rounded-xl">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-display font-bold">Quiz Results</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className={`border-0 shadow-lg ${passed ? 'gradient-hero' : ''}`}>
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                passed ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
              }`}>
                {passed ? (
                  <Trophy className="w-10 h-10" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
              </div>
              
              <h2 className="text-3xl font-display font-bold mb-2">
                {passed ? 'Congratulations!' : 'Keep Practicing!'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {passed 
                  ? 'You passed the quiz! Great job understanding the material.'
                  : `You need ${quiz.passing_score}% to pass. Review the lesson and try again.`
                }
              </p>

              <div className="text-6xl font-display font-bold mb-2">
                {score}%
              </div>
              <p className="text-muted-foreground mb-8">
                {selectedAnswers.size} of {questions.length} questions answered correctly
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={handleRetry}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  {showExplanation ? 'Hide' : 'Show'} Answers
                </Button>
                <Button variant="gradient" onClick={() => navigate(`/lesson/${lesson?.id}`)}>
                  Back to Lesson
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Show explanations */}
          {showExplanation && (
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-display font-bold">Review Answers</h3>
              {questions.map((q, idx) => {
                const selectedAnswer = selectedAnswers.get(q.id);
                const isCorrect = selectedAnswer === q.correct_answer;

                return (
                  <Card key={q.id} className={`border-0 shadow-md ${isCorrect ? 'bg-success/5' : 'bg-destructive/5'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
                        }`}>
                          {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium">Question {idx + 1}: {q.question}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Your answer: {selectedAnswer !== undefined ? q.options[selectedAnswer] : 'Not answered'}
                          </p>
                          <p className="text-sm text-success mt-1">
                            Correct answer: {q.options[q.correct_answer]}
                          </p>
                          {q.explanation && (
                            <p className="text-sm mt-2 p-3 bg-muted rounded-lg">{q.explanation}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Quiz View
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/lesson/${lesson?.id}`)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 gradient-primary rounded-xl">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{quiz.title}</p>
                  <p className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
              </div>
            </div>
            
            <Badge variant="outline" className={getDifficultyColor(quiz.difficulty)}>
              {quiz.difficulty}
            </Badge>
          </div>
          
          <div className="mt-4">
            <Progress value={progressValue} className="h-1" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
            <CardDescription>Select the correct answer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswers.get(currentQuestion.id) === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(currentQuestion.id, idx)}
                    className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button 
              variant="gradient" 
              onClick={handleSubmitQuiz}
              disabled={selectedAnswers.size < questions.length}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              variant="gradient"
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question Navigation */}
        <div className="mt-8">
          <p className="text-sm text-muted-foreground mb-3">Question Navigation</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const isAnswered = selectedAnswers.has(q.id);
              const isCurrent = idx === currentQuestionIndex;
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent 
                      ? 'bg-primary text-primary-foreground' 
                      : isAnswered 
                        ? 'bg-success/20 text-success border border-success/30' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
