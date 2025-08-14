import React from 'react';
import ReactPlayer from 'react-player';

// Define as propriedades que nosso componente aceitará
interface VideoPlayerProps {
  url: string; // A URL do vídeo (YouTube, Vimeo, .mp4, etc.)
  onProgress?: (state: any) => void;
  onEnded?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, onProgress, onEnded }) => {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
      <ReactPlayer
        {...{
          url,
          width: '100%',
          height: '100%',
          controls: true,
          playing: false,
          onProgress,
          onEnded,
          style: { position: 'absolute', top: 0, left: 0 }
        } as any}
      />
    </div>
  );
};

export default VideoPlayer;