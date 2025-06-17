import React, { useEffect, useState } from "react";
import { usePresenceStore } from "@/store/presenceStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";

const PresenceDebug: React.FC = () => {
  const { onlineUsers, channel } = usePresenceStore();
  const { user } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<{
    onlineUsers: number;
    channelConnected: boolean;
    channelState?: string;
    user: { id: string; name: string } | null;
    documentVisible: boolean;
    timestamp: string;
  }>({
    onlineUsers: 0,
    channelConnected: false,
    user: null,
    documentVisible: false,
    timestamp: "",
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        onlineUsers,
        channelConnected: !!channel,
        channelState: channel?.state,
        user: user ? { id: user.id, name: user.name } : null,
        documentVisible: document.visibilityState === "visible",
        timestamp: new Date().toLocaleTimeString(),
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, [onlineUsers, channel, user]);

  const testPresence = async () => {
    if (!channel) {
      console.log("No channel available");
      return;
    }

    console.log("Testing presence...");
    const presenceState = channel.presenceState();
    console.log("Current presence state:", presenceState);
    console.log("Presence keys:", Object.keys(presenceState));
    console.log("User count:", Object.keys(presenceState).length);
  };

  const forceReconnect = async () => {
    if (channel) {
      console.log("Force reconnecting...");
      await supabase.removeChannel(channel);
      window.location.reload();
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full text-xs z-50 hover:bg-red-600"
        title="Show Presence Debug"
      >
        DEBUG
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Presence Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Online Users:</strong>
            <div
              className={`${debugInfo.onlineUsers > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {debugInfo.onlineUsers}
            </div>
          </div>
          <div>
            <strong>Channel:</strong>
            <div
              className={`${debugInfo.channelConnected ? "text-green-600" : "text-red-600"}`}
            >
              {debugInfo.channelConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
        </div>

        <div>
          <strong>Channel State:</strong>
          <div className="text-gray-600">{debugInfo.channelState || "N/A"}</div>
        </div>

        <div>
          <strong>User:</strong>
          <div className="text-gray-600">
            {debugInfo.user
              ? `${debugInfo.user.name} (${debugInfo.user.id})`
              : "Not logged in"}
          </div>
        </div>

        <div>
          <strong>Document Visible:</strong>
          <div
            className={`${debugInfo.documentVisible ? "text-green-600" : "text-orange-600"}`}
          >
            {debugInfo.documentVisible ? "Yes" : "No"}
          </div>
        </div>

        <div>
          <strong>Last Update:</strong>
          <div className="text-gray-600">{debugInfo.timestamp}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <button
          onClick={testPresence}
          className="w-full bg-blue-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-blue-600"
        >
          Test Presence
        </button>
        <button
          onClick={forceReconnect}
          className="w-full bg-orange-500 text-white px-2 py-1 rounded-sm text-xs hover:bg-orange-600"
        >
          Force Reconnect
        </button>
      </div>
    </div>
  );
};

export default PresenceDebug;
