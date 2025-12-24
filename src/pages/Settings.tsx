import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMemory } from '@/hooks/useMemory';
import { useToast } from '@/hooks/use-toast';
import { Brain, Save, Trash2, Plus, Edit, Settings2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NoIndexSEO } from '@/components/SEO';

export default function Settings() {
  const { 
    preferences, 
    instructions, 
    patterns, 
    loading, 
    savePreference, 
    saveInstruction, 
    updateInstruction, 
    deleteInstruction,
    refreshMemory 
  } = useMemory();
  const { toast } = useToast();

  // Auto-save settings
  const [autoSaveWidth, setAutoSaveWidth] = useState(true);
  const [autoSaveHeight, setAutoSaveHeight] = useState(true);
  const [autoSaveSteps, setAutoSaveSteps] = useState(true);
  const [autoLearnPatterns, setAutoLearnPatterns] = useState(true);

  // New instruction dialog state
  const [isNewInstructionOpen, setIsNewInstructionOpen] = useState(false);
  const [newInstruction, setNewInstruction] = useState({ title: '', instruction: '', priority: 0 });

  // Edit instruction dialog state
  const [isEditInstructionOpen, setIsEditInstructionOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<any>(null);

  const handleToggleAutoSave = async (key: string, value: boolean) => {
    await savePreference('auto_save_settings', key, value, true);
    toast({
      title: "Setting updated",
      description: `Auto-save for ${key} has been ${value ? 'enabled' : 'disabled'}.`,
    });
  };

  const handleCreateInstruction = async () => {
    if (!newInstruction.title || !newInstruction.instruction) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and instruction.",
        variant: "destructive",
      });
      return;
    }

    await saveInstruction(
      newInstruction.title,
      newInstruction.instruction,
      'generation_rule',
      newInstruction.priority
    );
    
    setNewInstruction({ title: '', instruction: '', priority: 0 });
    setIsNewInstructionOpen(false);
  };

  const handleUpdateInstruction = async () => {
    if (!editingInstruction) return;

    await updateInstruction(editingInstruction.id, {
      title: editingInstruction.title,
      instruction: editingInstruction.instruction,
      priority: editingInstruction.priority,
      is_active: editingInstruction.is_active,
    });

    setEditingInstruction(null);
    setIsEditInstructionOpen(false);
  };

  const handleDeleteInstruction = async (id: string) => {
    await deleteInstruction(id);
  };

  const handleToggleInstruction = async (instruction: any) => {
    await updateInstruction(instruction.id, {
      is_active: !instruction.is_active,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <>
      <NoIndexSEO title="Settings" />
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your preferences, memory features, and custom instructions
        </p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">Auto-Save Preferences</TabsTrigger>
          <TabsTrigger value="instructions">Custom Instructions</TabsTrigger>
          <TabsTrigger value="patterns">Generation Patterns</TabsTrigger>
        </TabsList>

        {/* Auto-Save Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Auto-Save Settings
              </CardTitle>
              <CardDescription>
                Choose which settings to automatically save as preferences when you generate content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-save-width">Auto-save width</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save width setting for future generations
                  </p>
                </div>
                <Switch
                  id="auto-save-width"
                  checked={autoSaveWidth}
                  onCheckedChange={(checked) => {
                    setAutoSaveWidth(checked);
                    handleToggleAutoSave('width', checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-save-height">Auto-save height</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save height setting for future generations
                  </p>
                </div>
                <Switch
                  id="auto-save-height"
                  checked={autoSaveHeight}
                  onCheckedChange={(checked) => {
                    setAutoSaveHeight(checked);
                    handleToggleAutoSave('height', checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-save-steps">Auto-save inference steps</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save steps setting for future generations
                  </p>
                </div>
                <Switch
                  id="auto-save-steps"
                  checked={autoSaveSteps}
                  onCheckedChange={(checked) => {
                    setAutoSaveSteps(checked);
                    handleToggleAutoSave('steps', checked);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-learn">AI pattern learning</Label>
                  <p className="text-sm text-muted-foreground">
                    Analyze your generations to learn your style and preferences
                  </p>
                </div>
                <Switch
                  id="auto-learn"
                  checked={autoLearnPatterns}
                  onCheckedChange={(checked) => {
                    setAutoLearnPatterns(checked);
                    handleToggleAutoSave('auto_learn_patterns', checked);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Preferences</CardTitle>
              <CardDescription>
                Your currently saved preferences ({preferences.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No preferences saved yet. Generate some content to start building your preferences!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {preferences.map((pref) => (
                    <div
                      key={pref.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="font-medium text-sm">{pref.preference_key}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Type: {pref.preference_type}
                      </div>
                      <div className="text-sm font-mono mt-2">
                        {JSON.stringify(pref.preference_value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Instructions Tab */}
        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Custom Instructions
                  </CardTitle>
                  <CardDescription>
                    Create custom rules that are automatically applied to your prompts
                  </CardDescription>
                </div>
                <Dialog open={isNewInstructionOpen} onOpenChange={setIsNewInstructionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Instruction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Custom Instruction</DialogTitle>
                      <DialogDescription>
                        Add a new instruction that will be applied to your generations
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-title">Title</Label>
                        <Input
                          id="new-title"
                          placeholder="e.g., Cinematic Style"
                          value={newInstruction.title}
                          onChange={(e) => setNewInstruction({ ...newInstruction, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-instruction">Instruction</Label>
                        <Textarea
                          id="new-instruction"
                          placeholder="e.g., Always use cinematic lighting with dramatic shadows..."
                          value={newInstruction.instruction}
                          onChange={(e) => setNewInstruction({ ...newInstruction, instruction: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-priority">Priority (0-10)</Label>
                        <Input
                          id="new-priority"
                          type="number"
                          min="0"
                          max="10"
                          value={newInstruction.priority}
                          onChange={(e) => setNewInstruction({ ...newInstruction, priority: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsNewInstructionOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateInstruction}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {instructions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No custom instructions yet. Create your first instruction to teach the AI your preferences!
                </p>
              ) : (
                <div className="space-y-3">
                  {instructions.map((instruction) => (
                    <Card key={instruction.id} className={instruction.is_active ? 'border-primary' : 'opacity-60'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{instruction.title}</h3>
                              {instruction.is_active ? (
                                <Badge variant="default" className="text-xs">Active</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Priority: {instruction.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{instruction.instruction}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleInstruction(instruction)}
                            >
                              <Switch checked={instruction.is_active} />
                            </Button>
                            <Dialog open={isEditInstructionOpen && editingInstruction?.id === instruction.id} onOpenChange={(open) => {
                              setIsEditInstructionOpen(open);
                              if (!open) setEditingInstruction(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingInstruction(instruction)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Instruction</DialogTitle>
                                </DialogHeader>
                                {editingInstruction && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-title">Title</Label>
                                      <Input
                                        id="edit-title"
                                        value={editingInstruction.title}
                                        onChange={(e) => setEditingInstruction({ ...editingInstruction, title: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-instruction">Instruction</Label>
                                      <Textarea
                                        id="edit-instruction"
                                        value={editingInstruction.instruction}
                                        onChange={(e) => setEditingInstruction({ ...editingInstruction, instruction: e.target.value })}
                                        rows={4}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-priority">Priority (0-10)</Label>
                                      <Input
                                        id="edit-priority"
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={editingInstruction.priority}
                                        onChange={(e) => setEditingInstruction({ ...editingInstruction, priority: parseInt(e.target.value) || 0 })}
                                      />
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsEditInstructionOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateInstruction}>Save Changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteInstruction(instruction.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generation Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generation Patterns</CardTitle>
              <CardDescription>
                AI-learned patterns from your generation history ({patterns.length} patterns)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No patterns learned yet. Keep generating to build your pattern library!
                </p>
              ) : (
                <div className="space-y-3">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{pattern.pattern_type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                Used {pattern.usage_count} times
                              </span>
                            </div>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                              {JSON.stringify(pattern.pattern_data, null, 2)}
                            </pre>
                            <p className="text-xs text-muted-foreground">
                              Last used: {new Date(pattern.last_used_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
