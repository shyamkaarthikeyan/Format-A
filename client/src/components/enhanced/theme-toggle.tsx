import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { useAccessibility } from '@/contexts/accessibility-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export function ThemeToggle({ variant = 'dropdown', size = 'default', showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { announce, isReducedMotion } = useAccessibility();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'System', icon: Monitor },
  ] as const;

  const currentTheme = themes.find(t => t.value === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    if (newTheme === theme) return;

    setIsTransitioning(true);
    
    // Add transition class if animations are enabled
    if (!isReducedMotion) {
      document.documentElement.classList.add('theme-transitioning');
    }

    // Announce the change
    announce(`Theme changed to ${newTheme === 'auto' ? 'system' : newTheme} mode`);

    // Apply the theme
    setTheme(newTheme);

    // Remove transition class after animation
    if (!isReducedMotion) {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        setIsTransitioning(false);
      }, 300);
    } else {
      setIsTransitioning(false);
    }
  };

  // Cycle through themes for button variant
  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    handleThemeChange(themes[nextIndex].value);
  };

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={cycleTheme}
        disabled={isTransitioning}
        className="gap-2"
        aria-label={`Current theme: ${currentTheme.label}. Click to cycle themes.`}
      >
        <CurrentIcon className="h-4 w-4" />
        {showLabel && <span>{currentTheme.label}</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          disabled={isTransitioning}
          className="gap-2"
          aria-label={`Current theme: ${currentTheme.label}. Click to change theme.`}
        >
          <CurrentIcon className="h-4 w-4" />
          {showLabel && <span>{currentTheme.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = theme === themeOption.value;
          
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className="gap-2 cursor-pointer"
              disabled={isActive}
            >
              <Icon className="h-4 w-4" />
              <span>{themeOption.label}</span>
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Advanced theme toggle with more options
export function AdvancedThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { preferences, updatePreference, isHighContrast } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Theme options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-2">
          <div className="text-sm font-medium mb-2">Theme</div>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {[
              { value: 'light', icon: Sun, label: 'Light' },
              { value: 'dark', icon: Moon, label: 'Dark' },
              { value: 'auto', icon: Monitor, label: 'Auto' },
            ].map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              
              return (
                <Button
                  key={option.value}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme(option.value as any)}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{option.label}</span>
                </Button>
              );
            })}
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm">High Contrast</span>
              <Button
                variant={isHighContrast ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updatePreference('highContrast', !preferences.highContrast)}
                className="h-6 w-6 p-0"
              >
                <div className="h-3 w-3 rounded-full border-2 border-current" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Current: {resolvedTheme} theme
              {isHighContrast && ' (High Contrast)'}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Theme preview component
export function ThemePreview({ theme: previewTheme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={`theme-preview ${previewTheme} rounded-lg border p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 bg-foreground/20 rounded" />
        <div className="h-3 w-3 bg-primary rounded-full" />
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full bg-foreground/10 rounded" />
        <div className="h-2 w-3/4 bg-foreground/10 rounded" />
        <div className="h-2 w-1/2 bg-foreground/10 rounded" />
      </div>
      <div className="flex gap-1">
        <div className="h-6 w-12 bg-primary/20 rounded text-xs flex items-center justify-center">
          Button
        </div>
        <div className="h-6 w-12 bg-secondary rounded text-xs flex items-center justify-center">
          Button
        </div>
      </div>
    </div>
  );
}