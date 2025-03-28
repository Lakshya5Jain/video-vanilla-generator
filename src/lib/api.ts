import { delay, generateUUID } from './utils';
import { GenerationProgress, Video, ScriptOption } from '@/types';
import { mockVideos } from '@/data/mockData';
import { supabase } from "@/integrations/supabase/client";

const getProgressFromStorage = (processId: string): GenerationProgress | null => {
  try {
    const stored = localStorage.getItem(`progress_${processId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error reading progress from storage:", error);
    return null;
  }
};

const updateProgressInStorage = (processId: string, progress: Partial<GenerationProgress>) => {
  try {
    const current = getProgressFromStorage(processId) || {
      progress: 0,
      status: "Starting...",
    };
    const updated = { ...current, ...progress };
    localStorage.setItem(`progress_${processId}`, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error updating progress in storage:", error);
    return progress;
  }
};

export async function uploadFile(file: File): Promise<string> {
  try {
    console.log("Uploading file:", file.name);
    
    if ('publicUrl' in file) {
      // @ts-ignore - custom property we added
      return file.publicUrl;
    }
    
    const fileExt = file.name.split('.').pop();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const fileName = `${uniqueId}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Error uploading to Supabase:", error);
      throw error;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);
    
    console.log("Uploaded to Supabase, public URL:", publicUrlData.publicUrl);
    
    file.publicUrl = publicUrlData.publicUrl;
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    const objectUrl = URL.createObjectURL(file);
    file.publicUrl = objectUrl;
    return objectUrl;
  }
}

export async function generateScript(topic: string): Promise<string> {
  try {
    console.log("Generating script for topic:", topic);
    const { data, error } = await supabase.functions.invoke('generate-script', {
      body: { topic }
    });

    if (error) {
      console.error("Error from generate-script function:", error);
      throw new Error(error.message);
    }
    
    console.log("Script generation successful");
    return data.scriptText;
  } catch (error) {
    console.error('Error generating script:', error);
    throw error;
  }
}

export async function generateVideo(formData: {
  scriptOption: ScriptOption;
  topic?: string;
  customScript?: string;
  supportingMedia?: string;
  supportingMediaFile?: File;
  voiceId: string;
  voiceMedia?: string;
  voiceMediaFile?: File;
  highResolution: boolean;
}): Promise<string> {
  const timestamp = new Date().getTime();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const processId = `process_${timestamp}_${randomStr}`;
  
  console.log("Starting new video generation process with ID:", processId);
  
  updateProgressInStorage(processId, {
    progress: 0,
    status: "Starting...",
    voiceId: formData.voiceId,
    voiceMedia: formData.voiceMedia
  });
  
  setTimeout(() => processVideoGeneration(processId, formData), 0);
  
  return processId;
}

async function processVideoGeneration(processId: string, formData: {
  scriptOption: ScriptOption;
  topic?: string;
  customScript?: string;
  supportingMedia?: string;
  supportingMediaFile?: File;
  voiceId: string;
  voiceMedia?: string;
  voiceMediaFile?: File;
  highResolution: boolean;
}) {
  try {
    const filesToCleanup: string[] = [];
    
    let supportingMediaUrl = formData.supportingMedia;
    let voiceMediaUrl = formData.voiceMedia;
    
    if (formData.supportingMediaFile) {
      updateProgressInStorage(processId, {
        status: "Uploading supporting media...",
        progress: 10
      });
      
      try {
        if ('publicUrl' in formData.supportingMediaFile) {
          supportingMediaUrl = formData.supportingMediaFile.publicUrl;
          console.log("Using existing public URL for supporting media:", supportingMediaUrl);
        } else {
          supportingMediaUrl = await uploadFile(formData.supportingMediaFile);
          if (!supportingMediaUrl.startsWith('blob:')) {
            filesToCleanup.push(supportingMediaUrl);
          }
          console.log("Supporting media uploaded successfully:", supportingMediaUrl);
        }
      } catch (uploadError) {
        console.error("Error uploading supporting media:", uploadError);
      }
    }
    
    if (formData.voiceMediaFile) {
      updateProgressInStorage(processId, {
        status: "Uploading voice character image...",
        progress: 15
      });
      
      try {
        if ('publicUrl' in formData.voiceMediaFile) {
          voiceMediaUrl = formData.voiceMediaFile.publicUrl;
          console.log("Using existing public URL for voice media:", voiceMediaUrl);
        } else {
          voiceMediaUrl = await uploadFile(formData.voiceMediaFile);
          if (!voiceMediaUrl.startsWith('blob:')) {
            filesToCleanup.push(voiceMediaUrl);
          }
          console.log("Voice media uploaded successfully:", voiceMediaUrl);
        }
      } catch (uploadError) {
        console.error("Error uploading voice media:", uploadError);
      }
    }
    
    updateProgressInStorage(processId, { 
      supportingMediaUrl,
      voiceMedia: voiceMediaUrl
    });
    
    let scriptText: string;
    
    if (formData.scriptOption === ScriptOption.GPT && formData.topic) {
      updateProgressInStorage(processId, {
        status: "Generating script...",
        progress: 25
      });
      
      try {
        scriptText = await generateScript(formData.topic);
      } catch (scriptError) {
        console.error("Error generating script:", scriptError);
        scriptText = `Here's a cool video about ${formData.topic}!`;
      }
    } else if (formData.scriptOption === ScriptOption.CUSTOM && formData.customScript) {
      updateProgressInStorage(processId, {
        status: "Using custom script...",
        progress: 25
      });
      
      scriptText = formData.customScript;
    } else {
      throw new Error("Invalid script option or missing required data");
    }
    
    updateProgressInStorage(processId, { scriptText });
    
    updateProgressInStorage(processId, {
      status: "Generating AI video...",
      progress: 50
    });
    
    const { data: startData, error: startError } = await supabase.functions.invoke('generate-ai-video', {
      body: {
        script: scriptText,
        voiceId: formData.voiceId,
        voiceMedia: voiceMediaUrl,
        highResolution: formData.highResolution,
        processId
      }
    });
    
    if (startError) {
      console.error("Error starting AI video:", startError);
      throw new Error(`Error starting AI video: ${startError.message}`);
    }
    
    const jobId = startData.jobId;
    console.log("AI video generation started with job ID:", jobId);
    
    let aiVideoUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (!aiVideoUrl && attempts < maxAttempts) {
      await delay(5000);
      attempts++;
      
      try {
        const { data: statusData, error: statusError } = await supabase.functions.invoke('check-ai-video-status', {
          body: { jobId, processId }
        });
        
        if (statusError) {
          console.error(`Error checking AI video status (attempt ${attempts}):`, statusError);
          continue;
        }
        
        if (statusData.completed) {
          aiVideoUrl = statusData.videoUrl;
          console.log("AI video completed:", aiVideoUrl);
        } else {
          console.log(`AI video status (attempt ${attempts}): ${statusData.status}`);
          updateProgressInStorage(processId, {
            status: `AI video processing: ${statusData.status}...`,
          });
        }
      } catch (pollError) {
        console.error(`Error polling AI video status (attempt ${attempts}):`, pollError);
      }
    }
    
    if (!aiVideoUrl) {
      throw new Error("AI video generation timed out after multiple attempts");
    }
    
    updateProgressInStorage(processId, { 
      aiVideoUrl,
      status: "Creating final video...",
      progress: 75
    });
    
    const { data: renderData, error: renderError } = await supabase.functions.invoke('create-final-video', {
      body: {
        aiVideoUrl,
        supportingVideo: supportingMediaUrl,
        processId
      }
    });
    
    if (renderError) {
      console.error("Error creating final video:", renderError);
      throw new Error(`Error creating final video: ${renderError.message}`);
    }
    
    const renderId = renderData.renderId;
    console.log("Final video render started with ID:", renderId);
    
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    let finalVideoUrl: string | null = null;
    attempts = 0;
    
    while (!finalVideoUrl && attempts < maxAttempts) {
      await delay(5000);
      attempts++;
      
      try {
        const { data: finalStatusData, error: finalStatusError } = await supabase.functions.invoke('check-final-video-status', {
          body: { 
            renderId,
            scriptText,
            aiVideoUrl,
            userId,
            processId
          }
        });
        
        if (finalStatusError) {
          console.error(`Error checking final video status (attempt ${attempts}):`, finalStatusError);
          continue;
        }
        
        if (finalStatusData.completed) {
          finalVideoUrl = finalStatusData.url;
          console.log("Final video completed:", finalVideoUrl);
        } else {
          console.log(`Final video status (attempt ${attempts}): ${finalStatusData.status}`);
          updateProgressInStorage(processId, {
            status: `Final video processing: ${finalStatusData.status}...`,
          });
        }
      } catch (pollError) {
        console.error(`Error polling final video status (attempt ${attempts}):`, pollError);
      }
    }
    
    if (!finalVideoUrl) {
      throw new Error("Final video generation timed out after multiple attempts");
    }
    
    updateProgressInStorage(processId, {
      finalVideoUrl,
      progress: 100,
      status: "Complete!"
    });
    
    if (filesToCleanup.length > 0) {
      try {
        await supabase.functions.invoke('cleanup-files', {
          body: { filePaths: filesToCleanup, processId }
        });
        console.log("Cleaned up temporary files:", filesToCleanup);
      } catch (cleanupError) {
        console.error("Error cleaning up files (non-fatal):", cleanupError);
      }
    }
    
  } catch (error) {
    console.error("Error in video generation process:", error);
    updateProgressInStorage(processId, {
      status: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: 100
    });
  }
}

export async function checkProgress(processId: string): Promise<GenerationProgress> {
  const progress = getProgressFromStorage(processId);
  
  if (!progress) {
    throw new Error("Process not found");
  }
  
  return progress;
}

export async function getVideos(): Promise<Video[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    const { data, error } = await supabase.functions.invoke('get-videos', {
      body: { userId }
    });
    
    if (error) {
      console.error("Error fetching videos:", error);
      return mockVideos;
    }
    
    return data.videos.map((video: any) => ({
      id: video.id,
      finalVideoUrl: video.final_video_url,
      scriptText: video.script_text,
      timestamp: new Date(video.timestamp).getTime()
    }));
  } catch (error) {
    console.error("Error in getVideos:", error);
    return mockVideos;
  }
}
