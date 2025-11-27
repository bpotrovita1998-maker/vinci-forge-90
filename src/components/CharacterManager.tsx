import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CharacterReference {
  id: string;
  name: string;
  description: string | null;
  reference_images: string[];
  created_at: string;
}

interface CharacterManagerProps {
  onSelectCharacter?: (images: string[]) => void;
}

export const CharacterManager = ({ onSelectCharacter }: CharacterManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ["character-references", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("character_references")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CharacterReference[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!name.trim()) throw new Error("Name is required");
      if (selectedImages.length === 0) throw new Error("At least one image is required");

      const { error } = await supabase
        .from("character_references")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          reference_images: selectedImages,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-references"] });
      toast.success("Character saved successfully");
      setName("");
      setDescription("");
      setSelectedImages([]);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save character");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("character_references")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-references"] });
      toast.success("Character deleted");
    },
    onError: () => {
      toast.error("Failed to delete character");
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < Math.min(files.length, 3 - selectedImages.length); i++) {
      const file = files[i];
      const reader = new FileReader();
      
      await new Promise((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
          }
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    setSelectedImages([...selectedImages, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Character Library</h3>
          <p className="text-sm text-muted-foreground">
            Save and reuse character references across videos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Character
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Character Reference</DialogTitle>
              <DialogDescription>
                Save character images to maintain consistency across videos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="character-name">Name</Label>
                <Input
                  id="character-name"
                  placeholder="e.g., Main Hero, Villain, etc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="character-description">Description (optional)</Label>
                <Textarea
                  id="character-description"
                  placeholder="Describe the character's appearance, style, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label>Reference Images (up to 3)</Label>
                <div className="mt-2 space-y-2">
                  {selectedImages.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square">
                          <img
                            src={img}
                            alt={`Reference ${idx + 1}`}
                            className="w-full h-full object-cover rounded border border-border"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() =>
                              setSelectedImages(selectedImages.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !name.trim() || selectedImages.length === 0}
                className="w-full"
              >
                Save Character
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading characters...</div>
      ) : characters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No characters saved yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Card key={character.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base">{character.name}</CardTitle>
                {character.description && (
                  <CardDescription className="line-clamp-2">
                    {character.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {character.reference_images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${character.name} ref ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded border border-border"
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {onSelectCharacter && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onSelectCharacter(character.reference_images)}
                    >
                      Use in Video
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(character.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
