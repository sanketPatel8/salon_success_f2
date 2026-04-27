import { useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_TUTORIAL_VIDEO = {
  embedUrl: "https://www.youtube.com/embed/Ie1-B8ze_TE?rel=0&modestbranding=1",
  externalUrl: "https://www.youtube.com/watch?v=Ie1-B8ze_TE",
};

type TutorialVideoCardProps = {
  title: string;
  description: string;
  videoTitle?: string;
  embedUrl?: string;
  className?: string;
};

export default function TutorialVideoCard({
  title,
  description,
  videoTitle = "Tutorial Walkthrough",
  embedUrl = DEFAULT_TUTORIAL_VIDEO.embedUrl,
  className = "",
}: TutorialVideoCardProps) {
  const [showCard, setShowCard] = useState(Boolean(embedUrl));
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  if (!showCard || !embedUrl) {
    return null;
  }

  return (
    <>
      <Card
        className={`border border-primary bg-gradient-to-r from-white via-primary/20 to-primary/50 ${className}`}
      >
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Optional tutorial
            </div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="max-w-2xl text-sm text-slate-600">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="bg-slate-900 text-white"
              onClick={() => setIsVideoOpen(true)}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Play video
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCard(false)}
            >
              <X className="mr-2 h-4 w-4" />
              Close video
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-slate-200 bg-white p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{videoTitle}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            <div className="overflow-hidden rounded-xl bg-slate-100">
              <div className="aspect-video">
                <iframe
                  className="h-full w-full"
                  src={embedUrl}
                  title={videoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  style={{ border: 0 }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
