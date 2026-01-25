import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import adminService from '../services/adminService';

interface PlayerRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (player: any) => void;
}

export function PlayerRegistrationDialog({
  open,
  onOpenChange,
  onSuccess,
}: PlayerRegistrationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    role: '',
    email: '',
   phone: '',
    password: '',
    bowlingStyle: '',
    battingStyle: '',
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const generateInviteCode = () => {
    const prefix = 'FSCA-';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + code;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.age || !formData.role || !formData.email || !formData.phone || !formData.password || !formData.bowlingStyle || !formData.battingStyle) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Close registration dialog and show confirmation
    setShowConfirmDialog(true);
  };

  const handleGenerateCode = async (generate: boolean) => {
    setShowConfirmDialog(false);
    
    try {
      const response = await adminService.createPlayer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        age: parseInt(formData.age),
        battingStyle: formData.battingStyle,
        bowlingStyle: formData.bowlingStyle,
        playerRole: formData.role,
        generateInviteCode: generate
      });

      if (response.inviteCode) {
        setInviteCode(response.inviteCode);
        setShowCodeDialog(true);
      }

      const newPlayer = {
        id: response.player.id.toString(),
        name: response.player.name,
        age: response.player.age,
        role: formData.role,
        photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
        stats: { matches: 0, runs: 0, wickets: 0, average: 0, strikeRate: 0, economy: 0 },
        inviteCode: response.inviteCode || '',
      };
      
      if (!response.inviteCode) {
        onSuccess(newPlayer);
        resetForm();
        onOpenChange(false);
      }

      toast.success('Player registered successfully!');
    } catch (error: any) {
      console.error('Create player error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create player';
      toast.error(errorMessage);
      setShowConfirmDialog(false);
    }
  };

  const handleCodeDialogClose = () => {
    // Save player with code
    const newPlayer = {
      id: Date.now().toString(),
      name: formData.name,
      age: parseInt(formData.age),
      role: formData.role,
      photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200',
      stats: { matches: 0, runs: 0, wickets: 0, average: 0, strikeRate: 0, economy: 0 },
      inviteCode: inviteCode,
    };
    
    onSuccess(newPlayer);
    setShowCodeDialog(false);
    resetForm();
    onOpenChange(false);
    toast.success('Player registered successfully with invite code!');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Invite code copied to clipboard!');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      role: '',
      email: '',
      phone: '',
      password: '',
      bowlingStyle: '',
      battingStyle: '',
    });
    setInviteCode('');
  };

  return (
    <>
      {/* Registration Form Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New Player</DialogTitle>
            <DialogDescription>
              Fill in the player details to register them in the system.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter player's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="Enter player's age"
                min="5"
                max="25"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Player Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Batsman">Batsman</SelectItem>
                  <SelectItem value="Bowler">Bowler</SelectItem>
                  <SelectItem value="All-rounder">All-rounder</SelectItem>
                  <SelectItem value="Wicket-keeper">Wicket-keeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="player@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+94 77 123 4567"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a password for this player"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="battingStyle">Batting Style *</Label>
              <Select
                value={formData.battingStyle}
                onValueChange={(value) => setFormData({ ...formData, battingStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batting style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Right Hand">Right Hand</SelectItem>
                  <SelectItem value="Left Hand">Left Hand</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bowlingStyle">Bowling Style *</Label>
              <Select
                value={formData.bowlingStyle}
                onValueChange={(value) => setFormData({ ...formData, bowlingStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bowling style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Right Arm Fast">Right Arm Fast</SelectItem>
                  <SelectItem value="Left Arm Fast">Left Arm Fast</SelectItem>
                  <SelectItem value="Right Arm Off Spin">Right Arm Off Spin</SelectItem>
                  <SelectItem value="Right Arm Leg Spin">Right Arm Leg Spin</SelectItem>
                  <SelectItem value="Left Arm Orthodox">Left Arm Orthodox</SelectItem>
                  <SelectItem value="Left Arm Unorthodox">Left Arm Unorthodox</SelectItem>
                  <SelectItem value="Ambidextrous">Ambidextrous</SelectItem>
                  <SelectItem value="Wicket Keeper">Wicket Keeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Register Player
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate Code Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Redeem Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to generate an invite/redeem code for this player? This code can be used by the player or their parent to link their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleGenerateCode(false)}>
              No, Skip
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleGenerateCode(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Yes, Generate Code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Display Invite Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Invite Code Generated
            </DialogTitle>
            <DialogDescription>
              Share this code with the player or their parent to link their account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="bg-muted rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Invite Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl tracking-wider select-all">{inviteCode}</p>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleCodeDialogClose}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
