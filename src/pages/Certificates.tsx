import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowLeft, Award, Download, Share2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  completion_percentage: number;
  final_score: number | null;
  course_id: string;
  course_title?: string;
}

export default function Certificates() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return;

    const { data: certs, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching certificates:', error);
    } else if (certs) {
      // Fetch course titles for each certificate
      const certsWithCourses = await Promise.all(
        certs.map(async (cert) => {
          const { data: course } = await supabase
            .from('courses')
            .select('title')
            .eq('id', cert.course_id)
            .single();
          return { ...cert, course_title: course?.title || 'Unknown Course' };
        })
      );
      setCertificates(certsWithCourses);
    }
    setIsLoading(false);
  };

  const handleDownload = (cert: Certificate) => {
    // Generate a simple certificate as downloadable content
    const certificateContent = `
═══════════════════════════════════════════════════
              CERTIFICATE OF COMPLETION
═══════════════════════════════════════════════════

This is to certify that the holder has successfully 
completed the course:

${cert.course_title}

Certificate Number: ${cert.certificate_number}
Completion: ${cert.completion_percentage}%
${cert.final_score ? `Final Score: ${cert.final_score}%` : ''}
Date Issued: ${new Date(cert.issued_at).toLocaleDateString()}

═══════════════════════════════════════════════════
              AdaptLearn Platform
═══════════════════════════════════════════════════
    `;

    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.certificate_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Certificate Downloaded',
      description: 'Your certificate has been downloaded.',
    });
  };

  const handleShare = (cert: Certificate) => {
    if (navigator.share) {
      navigator.share({
        title: 'My Certificate',
        text: `I completed ${cert.course_title} on AdaptLearn!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`I completed ${cert.course_title} on AdaptLearn! Certificate: ${cert.certificate_number}`);
      toast({
        title: 'Copied to Clipboard',
        description: 'Certificate details copied to clipboard.',
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">My Certificates</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Your Achievements 🏆</h1>
          <p className="text-muted-foreground">Certificates earned through your learning journey</p>
        </div>

        {certificates.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                <Award className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Complete courses to earn certificates. Your achievements will be displayed here.
              </p>
              <Button variant="gradient" onClick={() => navigate('/courses')}>
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
                <div className="h-2 gradient-primary" />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Award className="w-8 h-8 text-primary" />
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      Verified
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{cert.course_title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Certificate #</span>
                      <span className="font-mono text-xs">{cert.certificate_number.slice(0, 12)}...</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold">{cert.completion_percentage}%</span>
                    </div>
                    {cert.final_score && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Final Score</span>
                        <span className="font-semibold">{cert.final_score}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(cert)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleShare(cert)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
