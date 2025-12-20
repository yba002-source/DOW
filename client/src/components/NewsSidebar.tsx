import { useNewsList } from "@/hooks/use-news";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, TrendingUp, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface NewsSidebarProps {
  onSelect: (lat: number, lng: number) => void;
}

export function NewsSidebar({ onSelect }: NewsSidebarProps) {
  const { data: news, isLoading } = useNewsList();

  // Sort by corroborations to show "trending"
  const sortedNews = news ? [...news].sort((a, b) => b.corroborations - a.corroborations) : [];

  return (
    <div className="hidden lg:flex flex-col w-96 h-full bg-white/80 backdrop-blur-xl border-r border-border/40 shadow-xl z-20 absolute left-0 top-0 pt-20 pb-6 px-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-primary mb-1">
          <TrendingUp className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Global Feed</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-foreground">Top Stories</h2>
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary/50 animate-spin" />
          </div>
        ) : sortedNews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No news reported yet.</p>
        ) : (
          <div className="space-y-4 pb-4">
            {sortedNews.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => onSelect(item.lat, item.lng)}
                  className="w-full text-left group p-4 rounded-xl border border-transparent hover:bg-white hover:border-border/60 hover:shadow-lg transition-all duration-300"
                >
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {item.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground/80">
                    <span className="font-medium bg-primary/5 text-primary px-2 py-0.5 rounded-full">
                      {item.corroborations} sources
                    </span>
                    {item.createdAt && (
                      <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                    )}
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
