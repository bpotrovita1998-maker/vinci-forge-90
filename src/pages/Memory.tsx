import { useState } from 'react';
import { Brain, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemory } from '@/hooks/useMemory';
import { Skeleton } from '@/components/ui/skeleton';

const Memory = () => {
  const {
    instructions,
    patterns,
    loading,
    saveInstruction,
    updateInstruction,
    deleteInstruction
  } = useMemory();

  const [newInstruction, setNewInstruction] = useState({
    title: '',
    instruction: '',
    instruction_type: 'generation_rule',
    priority: 0
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddInstruction = async () => {
    if (!newInstruction.title || !newInstruction.instruction) return;

    await saveInstruction(
      newInstruction.title,
      newInstruction.instruction,
      newInstruction.instruction_type,
      newInstruction.priority
    );

    setNewInstruction({
      title: '',
      instruction: '',
      instruction_type: 'generation_rule',
      priority: 0
    });
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    await updateInstruction(id, { is_active });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pb-20 space-y-6 max-h-screen overflow-y-auto">
      <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Memory</h1>
          <p className="text-muted-foreground">
            Teach your AI about your preferences and style
          </p>
        </div>
      </div>

      <Tabs defaultValue="instructions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instructions">Custom Instructions</TabsTrigger>
          <TabsTrigger value="patterns">Learning Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Instruction</CardTitle>
              <CardDescription>
                Create rules that apply to all your AI generations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Preferred Art Style"
                  value={newInstruction.title}
                  onChange={(e) =>
                    setNewInstruction({ ...newInstruction, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instruction">Instruction</Label>
                <Textarea
                  id="instruction"
                  placeholder="e.g., Always use vibrant colors and add dramatic lighting"
                  rows={4}
                  value={newInstruction.instruction}
                  onChange={(e) =>
                    setNewInstruction({ ...newInstruction, instruction: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newInstruction.instruction_type}
                    onValueChange={(value) =>
                      setNewInstruction({ ...newInstruction, instruction_type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generation_rule">Generation Rule</SelectItem>
                      <SelectItem value="style_rule">Style Rule</SelectItem>
                      <SelectItem value="behavior_rule">Behavior Rule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="10"
                    value={newInstruction.priority}
                    onChange={(e) =>
                      setNewInstruction({
                        ...newInstruction,
                        priority: parseInt(e.target.value) || 0
                      })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleAddInstruction} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Instruction
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Instructions</h2>
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
              {instructions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No instructions yet. Add your first instruction above!
                  </CardContent>
                </Card>
              ) : (
                instructions.map((instruction) => (
                <Card key={instruction.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{instruction.title}</h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {instruction.instruction_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Priority: {instruction.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {instruction.instruction}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={instruction.is_active}
                          onCheckedChange={(checked) =>
                            handleToggleActive(instruction.id, checked)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInstruction(instruction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Patterns</CardTitle>
              <CardDescription>
                AI has learned these patterns from your usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No patterns learned yet. Keep using Vinci AI and it will learn your preferences!
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold capitalize">
                              {pattern.pattern_type.replace('_', ' ')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Used {pattern.usage_count} times
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last used: {new Date(pattern.last_used_at).toLocaleDateString()}
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
  );
};

export default Memory;