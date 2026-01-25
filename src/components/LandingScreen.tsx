import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Users, TrendingUp, Award } from "lucide-react";
import academyLogo from "figma:asset/5f0e47ee1de07031fdbf28920fd9d31a3b58bce9.png";
import aerialField from "figma:asset/3fe1ebf5e8b53a08ffda4409adf0d92c279c4e96.png";

const cricketImages = [
  academyLogo,
  aerialField,
  "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwcGxheWVyJTIwYmF0dGluZ3xlbnwxfHx8fDE3NjA4MDg5MjJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1709134800935-d00e89d5b8e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwYm93bGVyJTIwYWN0aW9ufGVufDF8fHx8MTc2MDg4MTMyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1610450294178-f1e30562db21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwdGVhbSUyMGNlbGVicmF0aW9ufGVufDF8fHx8MTc2MDg4MTMyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1677785643764-179393bc3842?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwc3RhZGl1bSUyMGZpZWxkfGVufDF8fHx8MTc2MDc2MjI5MXww&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1685541001104-91fe7ae1d8e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwYWNhZGVteSUyMHRyYWluaW5nfGVufDF8fHx8MTc2MDg3NDQ5MHww&ixlib=rb-4.1.0&q=80&w=1080",
];

const features = [
  {
    icon: Trophy,
    title: "Professional Training",
    description:
      "Expert coaching to develop future cricket stars",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Streamlined player and academy operations",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description: "Data-driven insights for player improvement",
  },
  {
    icon: Award,
    title: "AI-Powered Selection",
    description: "Smart team composition recommendations",
  },
];

export function LandingScreen() {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(
        (prev) => (prev + 1) % cricketImages.length,
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
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
              alt="Future Stars Cricket Academy"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Top Navigation */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo with CricMate Branding */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={academyLogo}
                  alt="Future Stars Cricket Academy"
                  className="h-12 w-12 object-contain rounded-lg bg-white/10 backdrop-blur-md p-1"
                />
                <h2
                  className="text-white"
                  style={{
                    fontFamily:
                      "'Montserrat', 'Inter', sans-serif",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  CricMate
                </h2>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/register/parent")}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Parent? Register Here
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl text-white mb-6">
              Welcome to Future Stars Cricket Academy
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Where passion meets excellence. Our comprehensive
              management system is designed for coaches,
              parents, and aspiring young cricketers. Track
              progress, manage attendance, and nurture talent
              with cutting-edge AI-powered insights.
            </p>
          </motion.div>

          {/* Right Glass Card with Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Main Glass Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
              <h3 className="text-white mb-6">
                Why Future Stars Cricket Academy?
              </h3>
              <div className="space-y-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.6 + index * 0.1,
                      }}
                      className="flex items-start gap-4"
                    >
                      <div className="w-12 h-12 rounded-lg bg-accent/20 backdrop-blur-md border border-accent/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h4 className="text-white mb-1">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-white/70">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="relative z-10 max-w-7xl mx-auto px-6 pb-12"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl text-white mb-2">
                100+
              </p>
              <p className="text-sm text-white/70">
                Dedicated Players
              </p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl text-white mb-2">
                5K+
              </p>
              <p className="text-sm text-white/70">
                Training Sessions
              </p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl text-white mb-2">
                15+
              </p>
              <p className="text-sm text-white/70">
                Expert Coaches
              </p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl text-white mb-2">
                95%
              </p>
              <p className="text-sm text-white/70">
                Parent Engagement
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Image Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
        {cricketImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentImageIndex
                ? "bg-white w-8"
                : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}