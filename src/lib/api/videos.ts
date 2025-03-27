
import { Video } from '@/types';
import { supabase } from "@/integrations/supabase/client";
import { mockVideos } from '@/data/mockData';

// Get saved videos from database
export async function getVideos(): Promise<{ videos: Video[], stats: any | null }> {
  try {
    // Get user auth token for the request
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      console.error("No active session found");
      return { videos: mockVideos, stats: null };
    }

    console.log("Fetching videos for user:", sessionData.session.user.id);

    // Pass the auth token to the edge function
    const { data, error } = await supabase.functions.invoke('get-videos', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });
    
    if (error) {
      console.error("Error fetching videos:", error);
      // Fall back to mock videos if there's an error
      return { videos: mockVideos, stats: null };
    }
    
    console.log("API Response:", data);
    
    const videos = data.videos.map((video: any) => ({
      id: video.id,
      finalVideoUrl: video.finalVideoUrl,
      scriptText: video.scriptText,
      timestamp: new Date(video.timestamp).getTime(),
      userId: video.userId
    }));

    console.log("Processed videos:", videos);

    return { 
      videos,
      stats: data.stats  // Return the stats data from the edge function
    };
  } catch (error) {
    console.error("Error in getVideos:", error);
    // Fall back to mock videos if there's an error
    return { videos: mockVideos, stats: null };
  }
}
