import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useNewsList } from "@/hooks/use-news";
import { MapPopup } from "@/components/MapPopup";
import { CreateNewsDialog } from "@/components/CreateNewsDialog";
import { NewsSidebar } from "@/components/NewsSidebar";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

// Helper component to programmatically move the map
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  if (center) {
    map.flyTo(center, 8, { duration: 2 });
  }
  return null;
}

export default function Home() {
  const { data: news, isLoading, error } = useNewsList();
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  const handleSelectNews = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
  };

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading news</AlertTitle>
          <AlertDescription>
            {(error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full h-20 z-[1000] pointer-events-none flex justify-between items-center px-4 md:px-8">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-5 py-2 rounded-full shadow-lg border border-white/20 mt-4">
          <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-rose-600 bg-clip-text text-transparent">
            Veritas Map
          </h1>
        </div>

        <div className="pointer-events-auto mt-4">
          <CreateNewsDialog />
        </div>
      </div>

      {/* Sidebar - Desktop Only */}
      <NewsSidebar onSelect={handleSelectNews} />

      {/* Main Map */}
      <div className="w-full h-full lg:pl-96 transition-all duration-300">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground font-medium animate-pulse">Initializing Global Feed...</p>
            </div>
          </div>
        ) : (
          <MapContainer 
            center={[20, 0]} 
            zoom={3} 
            scrollWheelZoom={true}
            zoomControl={false}
            className="w-full h-full outline-none"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapController center={mapCenter} />

            {news?.map((item) => {
              // Calculate radius based on corroborations: bigger = more sources
              // Minimum size 10, scales with sqrt to prevent massive circles
              const radius = Math.min(Math.sqrt(item.corroborations) * 8 + 6, 50);
              
              // Color intensity based on corroborations
              const intensity = Math.min(item.corroborations / 20, 1); // Cap at 20 for max opacity
              
              return (
                <CircleMarker
                  key={item.id}
                  center={[item.lat, item.lng]}
                  radius={radius}
                  pathOptions={{
                    color: `hsl(350, 89%, ${60 - (intensity * 20)}%)`,
                    fillColor: `hsl(350, 89%, 60%)`,
                    fillOpacity: 0.4 + (intensity * 0.4),
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => handleSelectNews(item.lat, item.lng)
                  }}
                >
                  <Popup>
                    <MapPopup news={item} />
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Mobile Overlay - Only visible on small screens */}
      <AnimatePresence>
        {!isLoading && news && news.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden absolute bottom-8 left-4 right-4 z-[999] bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/40"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-foreground">Latest Updates</h3>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                {news.length} Active
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {news[0].title}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
