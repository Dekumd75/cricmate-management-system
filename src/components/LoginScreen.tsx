import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { toast } from 'sonner';
import academyLogo from '../assets/5f0e47ee1de07031fdbf28920fd9d31a3b58bce9.png';
import aerialField from '../assets/3fe1ebf5e8b53a08ffda4409adf0d92c279c4e96.png';
import logo from '../assets/cricmate-logo.png';

const cricketImages = [
  academyLogo,
  aerialField,
  "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwcGxheWVyJTIwYmF0dGluZ3xlbnwxfHx8fDE3NjA4MDg5MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1709134800935-d00e89d5b8e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwYm93bGVyJTIwYWN0aW9ufGVufDF8fHx8MTc2MDg4MTMyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1610450294178-f1e30562db21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwdGVhbSUyMGNlbGVicmF0aW9ufGVufDF8fHx8MTc2MDg4MTMyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1677785643764-179393bc3842?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwc3RhZGl1bSUyMGZpZWxkfGVufDF8fHx8MTc2MDc2MjI5MXww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1685541001104-91fe7ae1d8e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwYWNhZGVteSUyMHRyYWluaW5nfGVufDF8fHx8MTc2MDg3NDQ5MHww&ixlib=rb-4.1.0&q=80&w=1080",
];

export function LoginScreen() {
  const navigate = useNavigate();
  const { setUser, user } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const roleRoutes = {
        admin: '/admin/dashboard',
        coach: '/coach/dashboard',
        player: '/player/dashboard',
        parent: '/parent/dashboard'
      };
      navigate(roleRoutes[user.role], { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prev) => (prev + 1) % cricketImages.length,
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const authService = (await import('../services/authService')).default;
      const response = await authService.login({ email, password });

      // Set user in context
      setUser({
        id: response.user.id.toString(),
        name: response.user.name,
        email: response.user.email,
        role: response.user.role as 'admin' | 'coach' | 'player' | 'parent',
        phone: response.user.phone
      });

      // Navigate based on role
      const roleRoutes = {
        admin: '/admin/dashboard',
        coach: '/coach/dashboard',
        player: '/player/dashboard',
        parent: '/parent/dashboard'
      };

      navigate(roleRoutes[response.user.role as keyof typeof roleRoutes] || '/');
    } catch (err: any) {
      console.error('Login error:', err);

      // Check if account is pending approval
      if (err.response?.data?.status === 'pending') {
        const errorMessage = 'Your account is still pending approval';
        setError(errorMessage);
        toast.error(errorMessage, {
          description: 'Please wait for an administrator to approve your account. You will receive an email notification once approved.',
          duration: 8000
        });
        return;
      }

      // Handle other errors
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center p-4">
      {/* Animated Background Images */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.15, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <img
              src={cricketImages[currentImageIndex]}
              alt="Background"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <Card className="w-full max-w-md p-8 relative z-10 bg-white/10 backdrop-blur-md border-white/20 shadow-2xl text-white">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 -ml-2 text-white hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>



        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 shadow-lg p-4">
            <img src={logo} alt="CricMate Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CricMate</h1>
          <p className="text-white/70 mt-2 font-medium">Welcome Back to the Pitch</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/90">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/90">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:bg-white/20 transition-all"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold shadow-lg transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2 inline-block" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button onClick={() => navigate('/forgot-password')} className="text-white/80 hover:text-white hover:underline transition-colors">
            Forgot Password?
          </button>
        </div>
      </Card>
    </div>
  );
}
