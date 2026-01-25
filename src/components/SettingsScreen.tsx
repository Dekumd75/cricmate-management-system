import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { CoachSidebar } from './CoachSidebar';
import { ParentSidebar } from './ParentSidebar';
import { PlayerSidebar } from './PlayerSidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { useApp } from './AppContext';
import { Camera, Lock, Mail, Phone, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import authService from '../services/authService';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function SettingsScreen() {
  const { user, theme, setTheme } = useApp();
  const [profilePhoto, setProfilePhoto] = useState(user?.photo || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const getSidebar = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminSidebar />;
      case 'coach':
        return <CoachSidebar />;
      case 'parent':
        return <ParentSidebar />;
      case 'player':
        return <PlayerSidebar />;
      default:
        return <CoachSidebar />;
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        toast.success('Profile photo updated!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields', { duration: 5000 });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match', { duration: 5000 });
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters', { duration: 5000 });
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast.success('Password changed successfully!');
    } catch (error: any) {
      console.error('Change password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleContactUpdate = () => {
    if (!email) {
      toast.error('Email is required', { duration: 5000 });
      return;
    }

    // Mock contact update
    toast.success('Contact details updated successfully!');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {getSidebar()}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1>Settings</h1>
              <span className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary capitalize">
                {user?.role} Portal
              </span>
            </div>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Photo */}
            <Card className="p-6">
              <h3 className="mb-4">Profile Photo</h3>
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profilePhoto} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    variant="outline"
                    className="mb-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </Card>

            {/* Theme */}
            <Card className="p-6">
              <h3 className="mb-4">Appearance</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">
                      {theme === 'light' ? 'Light mode' : 'Dark mode'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                  />
                </div>

                <Button
                  onClick={handleContactUpdate}
                  className="bg-primary hover:bg-primary/90"
                >
                  Update Contact Details
                </Button>
              </div>
            </Card>

            {/* Password */}
            <Card className="p-6">
              <h3 className="mb-4">
                <Lock className="w-5 h-5 inline mr-2" />
                Change Password
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </Card>

            {/* Account Information (Read-only) */}
            <Card className="p-6 bg-muted/50">
              <h3 className="mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{user?.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-medium">{user?.id}</p>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  These details cannot be changed. Contact an administrator if you need to update this information.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
