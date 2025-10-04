import React, { useEffect, useState } from 'react';
import { useKeyboardNavigation, KeyboardShortcut } from '@/hooks/use-keyboard-navigation';
import { useAccessibility } from '@/contexts/accessibility-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Keyboard, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsManagerProps {
  shortcuts: KeyboardShortcut[];
  onSave?: () => void;
  onPreview?: () => void;
  onNewDocument?: () => void;
  onTogglePreview?: () => void;
  onToggleSidebar?: () => void;
  onFocusSearch?: () => void;
  onNextSection?: () => void;
  onPreviousSection?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function KeyboardShortcutsManager({
  shortcuts,
  onSave,
  onPreview,
  onNewDocument,
  onTogglePreview,
  onToggleSidebar,
  onFocusSearch,
  onNextSection,
  onPreviousSection,
  onUndo,
  onRedo,
}: KeyboardShortcutsManagerProps) {
  const { announce } = useAccessibility();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Default application shortcuts
  const defaultShortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        onSave?.();
        announce('Document saved');
      },
      description: 'Save document',
      category: 'Document'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => {
        onPreview?.();
        announce('Preview opened');
      },
      description: 'Open preview',
      category: 'Document'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        onNewDocument?.();
        announce('New document created');
      },
      description: 'New document',
      category: 'Document'
    },
    {
      key: 'b',
      ctrlKey: true,
      action: () => {
        onToggleSidebar?.();
        announce('Sidebar toggled');
      },
      description: 'Toggle sidebar',
      category: 'Navigation'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        onFocusSearch?.();
        announce('Search focused');
      },
      description: 'Focus search',
      category: 'Navigation'
    },
    {
      key: 'ArrowDown',
      ctrlKey: true,
      action: () => {
        onNextSection?.();
        announce('Next section');
      },
      description: 'Next section',
      category: 'Navigation'
    },
    {
      key: 'ArrowUp',
      ctrlKey: true,
      action: () => {
        onPreviousSection?.();
        announce('Previous section');
      },
      description: 'Previous section',
      category: 'Navigation'
    },
    {
      key: 'z',
      ctrlKey: true,
      action: () => {
        onUndo?.();
        announce('Undo');
      },
      description: 'Undo',
      category: 'Editing'
    },
    {
      key: 'y',
      ctrlKey: true,
      action: () => {
        onRedo?.();
        announce('Redo');
      },
      description: 'Redo',
      category: 'Editing'
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => setIsHelpOpen(true),
      description: 'Show keyboard shortcuts',
      category: 'Help'
    },
    {
      key: 'Escape',
      action: () => {
        setIsHelpOpen(false);
        announce('Dialog closed');
      },
      description: 'Close dialogs/modals',
      category: 'General'
    }
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  // Set up keyboard navigation
  useKeyboardNavigation({
    shortcuts: allShortcuts,
  });

  // Group shortcuts by category
  const groupedShortcuts = allShortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.metaKey) keys.push('Cmd');
    keys.push(shortcut.key);
    return keys.join(' + ');
  };

  return (
    <>
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
            <span className="sr-only">Keyboard shortcuts</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatShortcut(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
                {Object.keys(groupedShortcuts).indexOf(category) < Object.keys(groupedShortcuts).length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Press <Badge variant="outline" className="text-xs">Ctrl + /</Badge> to show this dialog</li>
                  <li>• Press <Badge variant="outline" className="text-xs">Escape</Badge> to close dialogs</li>
                  <li>• Use <Badge variant="outline" className="text-xs">Tab</Badge> to navigate between elements</li>
                  <li>• Hold <Badge variant="outline" className="text-xs">Shift + Tab</Badge> to navigate backwards</li>
                </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook for common document shortcuts
export function useDocumentShortcuts() {
  const { announce } = useAccessibility();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      ctrlKey: true,
      action: () => {
        // Add new section/paragraph
        announce('New section added');
      },
      description: 'Add new section',
      category: 'Editing'
    },
    {
      key: 'Delete',
      ctrlKey: true,
      action: () => {
        // Delete current section
        announce('Section deleted');
      },
      description: 'Delete current section',
      category: 'Editing'
    },
    {
      key: 'ArrowLeft',
      altKey: true,
      action: () => {
        // Move section up
        announce('Section moved up');
      },
      description: 'Move section up',
      category: 'Editing'
    },
    {
      key: 'ArrowRight',
      altKey: true,
      action: () => {
        // Move section down
        announce('Section moved down');
      },
      description: 'Move section down',
      category: 'Editing'
    }
  ];

  return shortcuts;
}