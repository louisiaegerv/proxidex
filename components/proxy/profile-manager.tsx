'use client';

import { useState } from 'react';
import { Save, FolderOpen, Trash2, Check, X, ChevronDown, RotateCcw, Factory } from 'lucide-react';
import { useProfiles } from '@/stores/profiles';
import { useProxyList } from '@/stores/proxy-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ProfileManager() {
  const { profiles, activeProfileId, saveProfile, loadProfile, deleteProfile, setActiveProfile, getActiveProfile } = useProfiles();
  const { settings, updateSettings, resetSettings } = useProxyList();
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [showResetOptions, setShowResetOptions] = useState(false);
  
  const activeProfile = getActiveProfile();

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;
    saveProfile(profileName.trim(), settings);
    setProfileName('');
    setIsSaveDialogOpen(false);
  };

  const handleLoadProfile = (id: string) => {
    const profileSettings = loadProfile(id);
    if (profileSettings) {
      // Apply all settings from profile
      Object.entries(profileSettings).forEach(([key, value]) => {
        updateSettings({ [key]: value });
      });
    }
  };

  const handleDeleteProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteProfile(id);
  };

  const handleResetToFactory = () => {
    resetSettings();
    setActiveProfile(null);
    setShowResetOptions(false);
  };

  const handleResetToProfile = () => {
    if (activeProfileId) {
      const profileSettings = loadProfile(activeProfileId);
      if (profileSettings) {
        Object.entries(profileSettings).forEach(([key, value]) => {
          updateSettings({ [key]: value });
        });
      }
    }
    setShowResetOptions(false);
  };

  return (
    <div className="space-y-3">
      {/* Profile Selector */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-between border-slate-700 bg-slate-900/50 text-slate-100 hover:bg-slate-800 hover:text-slate-100"
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-slate-400" />
                <span className="truncate">
                  {activeProfile ? activeProfile.name : 'Select Profile'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 border-slate-700 bg-slate-900">
            {profiles.length === 0 ? (
              <DropdownMenuItem disabled className="text-slate-500">
                No saved profiles
              </DropdownMenuItem>
            ) : (
              <>
                {profiles.map((profile) => (
                  <DropdownMenuItem
                    key={profile.id}
                    onClick={() => handleLoadProfile(profile.id)}
                    className="flex items-center justify-between text-slate-100 focus:bg-slate-800 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {activeProfileId === profile.id && (
                        <Check className="h-4 w-4 text-blue-400" />
                      )}
                      <span className={activeProfileId === profile.id ? 'text-blue-400' : ''}>
                        {profile.name}
                      </span>
                    </span>
                    <button
                      onClick={(e) => handleDeleteProfile(e, profile.id)}
                      className="p-1 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save Button */}
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Save current settings as profile"
            >
              <Save className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="border-slate-800 bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Save Profile</DialogTitle>
              <DialogDescription className="text-slate-500">
                Save your current print settings for quick access later.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <Input
                placeholder="Profile name (e.g., 'Home Printer', 'Office A4')"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="border-slate-700 bg-slate-800 text-slate-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveProfile();
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsSaveDialogOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={!profileName.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Save Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset Options */}
      <DropdownMenu open={showResetOptions} onOpenChange={setShowResetOptions}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Settings...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 border-slate-700 bg-slate-900">
          <DropdownMenuItem
            onClick={handleResetToFactory}
            className="text-slate-100 focus:bg-slate-800 cursor-pointer"
          >
            <Factory className="mr-2 h-4 w-4 text-slate-400" />
            <div>
              <div className="text-sm">Factory Defaults</div>
              <div className="text-xs text-slate-500">Reset to original defaults</div>
            </div>
          </DropdownMenuItem>
          
          {activeProfile && (
            <>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleResetToProfile}
                className="text-slate-100 focus:bg-slate-800 cursor-pointer"
              >
                <FolderOpen className="mr-2 h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-sm">"{activeProfile.name}" Defaults</div>
                  <div className="text-xs text-slate-500">Reset to profile settings</div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Profile Indicator */}
      {activeProfile && (
        <div className="text-xs text-blue-400 text-center">
          Using profile: <span className="font-medium">{activeProfile.name}</span>
        </div>
      )}
    </div>
  );
}
