import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useApp } from './AppContext';
import { motion } from 'motion/react';
import { UserPlus, Mail, Phone, Lock, Key, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import academyLogo from 'figma:asset/5f0e47ee1de07031fdbf28920fd9d31a3b58bce9.png';

export function ParentRegistrationScreen() {
  const navigate = useNavigate();
  const { setUser, user, players, parents, setParents } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [linkedChildName, setLinkedChildName] = useState<string | null>(null);

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const authService = (await import('../services/authService')).default;

      // Register the parent
      const response = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: 'parent'
      });

      // Don't auto-login if account is pending
      if (response.user.accountStatus === 'pending') {
        setRegistrationSuccess(true);
        setIsSubmitting(false);

        // Redirect to login after showing success message
        setTimeout(() => {
          navigate('/login');
        }, 4000);
      } else {
        // For non-parent roles or if somehow approved immediately
        setUser({
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email,
          role: 'parent' as const,
          phone: response.user.phone
        });

        toast.success('Registration successful!');
        setRegistrationSuccess(true);
        setIsSubmitting(false);

        setTimeout(() => {
          navigate('/parent/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/90 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-warning" />
            </motion.div>

            <h2 className="mb-2">Registration Submitted!</h2>

            <p className="text-muted-foreground mb-4">
              Welcome to CricMate, {formData.name}!
            </p>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-warning mb-2">
                ⏳ Pending Approval
              </p>
              <p className="text-sm text-muted-foreground">
                Your account is currently pending approval by an administrator.
                You will receive an email notification once your account has been approved.
              </p>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Please wait for approval before attempting to log in. An admin email notification has been sent.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Redirecting to login page...
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <img
              src={academyLogo}
              alt="CricMate"
              className="h-16 w-16 object-contain rounded-lg bg-white/10 backdrop-blur-md p-2"
            />
            <div>
              <h1 className="text-white">Parent Registration</h1>
              <p className="text-white/80">Join CricMate and track your child's cricket journey</p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="07XXXXXXXX"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information Section */}
              <div>
                <h3 className="mb-4">Account Information</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Min. 8 characters"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className={`pl-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Child Linking Section (Optional) */}
              <div className="border-t border-border pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Key className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="mb-1">Link Your Child (Optional)</h3>
                    <p className="text-sm text-muted-foreground">
                      Have an invite code? Enter it below to immediately link your child's profile.
                      You can also link your child later from your dashboard.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="e.g., FSCA-X87K (optional)"
                      value={formData.inviteCode}
                      onChange={(e) => handleInputChange('inviteCode', e.target.value.toUpperCase())}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ask your child's coach for the invite code if you haven't received it yet.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Registering...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-white/80">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-accent hover:underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
