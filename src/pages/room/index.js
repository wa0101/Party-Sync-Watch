import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRoom } from '../../context/RoomContext';
import Sidebar from '../../components/Sidebar';
import VideoPlayer from '../../components/VideoPlayer';

export default function Room() {
  const router = useRouter();
  const { roomCode, isHost, setVideoUrl } = useRoom();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      router.push('/');
    }
  }, [roomCode, router]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);

    setUploading(true);
    try {
      const response = await fetch('http://localhost:4000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setVideoUrl(data.videoUrl);
    } catch (error) {
      console.error('Error uploading video:', error);
    }
    setUploading(false);
  };

  if (!roomCode) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      <Sidebar />
      <main className="ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          <VideoPlayer />
          
          {isHost && (
            <div className="mt-4">
              <label className="block mb-2 text-white">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    disabled:opacity-50"
                />
              </label>
              {uploading && (
                <p className="text-blue-400">Uploading video...</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 