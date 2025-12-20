import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { insertNewsSchema } from "@shared/schema";
import { useCreateNews } from "@/hooks/use-news";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Globe } from "lucide-react";
import { z } from "zod";

// Frontend validation might need string coercion for number inputs
const formSchema = insertNewsSchema.extend({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  corroborations: z.coerce.number().default(1),
});

type FormData = z.infer<typeof formSchema>;

export function CreateNewsDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createNews = useCreateNews();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      corroborations: 1,
      lat: 0,
      lng: 0,
    }
  });

  const onSubmit = (data: FormData) => {
    createNews.mutate(data, {
      onSuccess: () => {
        toast({ title: "News Reported", description: "The event has been added to the global map." });
        setOpen(false);
        reset();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="lg" 
          className="rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-1 bg-gradient-to-r from-primary to-rose-600 border-0"
        >
          <Plus className="w-5 h-5 mr-2" />
          Report News
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-white/20 shadow-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-display">Report Global Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Headline</Label>
            <Input 
              id="title" 
              placeholder="e.g. Major breakthrough in renewable energy" 
              className="bg-muted/50 focus:bg-background transition-colors"
              {...register("title")} 
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Summary</Label>
            <Textarea 
              id="content" 
              placeholder="Describe the event details..." 
              className="min-h-[100px] bg-muted/50 focus:bg-background transition-colors resize-none"
              {...register("content")} 
            />
            {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input 
                id="lat" 
                type="number" 
                step="any" 
                className="bg-muted/50 focus:bg-background"
                {...register("lat")} 
              />
              {errors.lat && <p className="text-sm text-destructive">{errors.lat.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input 
                id="lng" 
                type="number" 
                step="any"
                className="bg-muted/50 focus:bg-background"
                {...register("lng")} 
              />
              {errors.lng && <p className="text-sm text-destructive">{errors.lng.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="corroborations">Corroborations (Source Count)</Label>
            <Input 
              id="corroborations" 
              type="number" 
              min="1"
              className="bg-muted/50 focus:bg-background"
              {...register("corroborations")} 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createNews.isPending} className="bg-primary hover:bg-primary/90 min-w-[120px]">
              {createNews.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
