import { type News } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Eye, Clock } from "lucide-react";

interface MapPopupProps {
  news: News;
}

export function MapPopup({ news }: MapPopupProps) {
  return (
    <div className="flex flex-col">
      <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 p-4 flex items-end relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full -mr-4 -mt-4" />
        <span className="relative z-10 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-md text-[10px] font-bold text-primary uppercase tracking-wider shadow-sm">
          Breaking
        </span>
      </div>
      
      <div className="p-4 space-y-3">
        <h3 className="font-display font-bold text-lg leading-tight text-foreground line-clamp-2">
          {news.title}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {news.content}
        </p>
        
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5 text-primary">
            <Eye className="w-3.5 h-3.5" />
            <span>{news.corroborations} sources</span>
          </div>
          
          {news.createdAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(new Date(news.createdAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
