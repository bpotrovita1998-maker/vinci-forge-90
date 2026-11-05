import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { videoClipCredits } from "@/lib/subscription-plans";

export interface SceneVideoRequest {
  prompt: string;
  characters: string;
  motion: string;
  style: string;
  duration: 5 | 10;
}

interface SceneVideoDialogProps {
  open: boolean;
  mode: "regenerate" | "continue";
  sceneTitle: string;
  initialPrompt: string;
  initialDuration: number;
  defaultCharacters?: string;
  defaultStyle?: string;
  isOwner?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (request: SceneVideoRequest) => void;
}

const MOTION_PRESETS = ["Slow push-in", "Slow pan right", "Handheld tracking", "Orbit around subject", "Slow motion", "Locked-off wide"];
const STYLE_PRESETS = ["Cinematic", "Anime", "3D render", "Watercolor", "Pixel art", "Claymation"];

export function SceneVideoDialog(props: SceneVideoDialogProps) {
  const { open, mode, initialPrompt, initialDuration, defaultCharacters, defaultStyle } = props;
  const [prompt, setPrompt] = useState("");
  const [characters, setCharacters] = useState("");
  const [motion, setMotion] = useState("");
  const [style, setStyle] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);

  useEffect(() => {
    if (!open) return;
    setPrompt(mode === "continue" ? "" : initialPrompt);
    setCharacters(defaultCharacters ?? "");
    setStyle(defaultStyle ?? "");
    setMotion("");
    setDuration(initialDuration >= 10 ? 10 : 5);
  }, [open, mode, initialPrompt, initialDuration, defaultCharacters, defaultStyle]);

  const { data: savedCharacters = [] } = useQuery({
    queryKey: ["character-references-names"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("character_references").select("id, name, description").limit(20);
      return data ?? [];
    },
  });

  const price = videoClipCredits("animatediff", duration);
  const isContinue = mode === "continue";

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isContinue ? "Continue video" : "Regenerate video"}</DialogTitle>
          <DialogDescription>
            {isContinue
              ? `The new clip starts from the last frame of "${props.sceneTitle}" and is added right after it.`
              : `Make a new version of "${props.sceneTitle}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scene-video-prompt">{isContinue ? "What happens next?" : "Scene prompt"}</Label>
            <Textarea
              id="scene-video-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={isContinue ? "Charizard lifts off and circles above the valley as smoke drifts past" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scene-video-characters">Characters</Label>
            <Input
              id="scene-video-characters"
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              placeholder="Charizard, a massive orange dragon; Sceptile, a green lizard with leaf blades"
            />
            {savedCharacters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {savedCharacters.map((c) => (
                  <Badge
                    key={c.id}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setCharacters((prev) => [prev, `${c.name}${c.description ? ` (${c.description})` : ""}`].filter(Boolean).join("; "))}
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scene-video-motion">Animation and camera</Label>
            <Input id="scene-video-motion" value={motion} onChange={(e) => setMotion(e.target.value)} placeholder="Slow push-in" />
            <div className="flex flex-wrap gap-2">
              {MOTION_PRESETS.map((m) => (
                <Badge key={m} variant={motion === m ? "default" : "outline"} className="cursor-pointer" onClick={() => setMotion(m)}>
                  {m}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scene-video-style">Art style</Label>
            <Input id="scene-video-style" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Cinematic" />
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((s) => (
                <Badge key={s} variant={style === s ? "default" : "outline"} className="cursor-pointer" onClick={() => setStyle(s)}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label>Duration</Label>
            {([5, 10] as const).map((d) => (
              <Button key={d} type="button" size="sm" variant={duration === d ? "default" : "outline"} onClick={() => setDuration(d)}>
                {d}s
              </Button>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {props.isOwner ? "Owner mode: paid from your Replicate balance, no app credits used." : `Cost: ${price} credits`}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!prompt.trim()}
            onClick={() => props.onConfirm({ prompt: prompt.trim(), characters, motion, style, duration })}
            className="gap-2"
          >
            {isContinue ? <Film className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            {isContinue ? "Continue video" : "Regenerate video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
