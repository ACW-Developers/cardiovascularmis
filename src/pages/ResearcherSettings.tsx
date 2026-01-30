import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Sun, 
  Monitor,
  Eye,
  Download,
  FileText
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ResearcherSettings() {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [department, setDepartment] = useState(profile?.department || '');
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { first_name: string; last_name: string; phone: string; department: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone,
      department,
    });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title text-xl sm:text-2xl lg:text-3xl">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your account preferences and settings
          </p>
        </div>
      </div>

      {/* Profile Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Research, Cardiology"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={profile?.email || ''} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <Button 
            onClick={handleSaveProfile} 
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the application looks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="flex gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('light')}
                className="flex items-center gap-2"
              >
                <Sun className="w-4 h-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeChange('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="w-4 h-4" />
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for important alerts
              </p>
            </div>
            <Switch
              checked={soundNotifications}
              onCheckedChange={setSoundNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Download Preferences */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Download Preferences
          </CardTitle>
          <CardDescription>
            Configure your default download settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-save Downloads</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save download records to history
              </p>
            </div>
            <Switch
              checked={autoDownload}
              onCheckedChange={setAutoDownload}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Password Management</p>
                <p className="text-sm text-muted-foreground">
                  To change your password, visit your profile page
                </p>
              </div>
            </div>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/profile">Go to Profile</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Application</p>
              <p className="font-medium">{settings?.site_name || 'CardioRegistry'}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Your Role</p>
              <p className="font-medium capitalize">Researcher</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Account Status</p>
              <p className="font-medium text-success">Active</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString() 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
