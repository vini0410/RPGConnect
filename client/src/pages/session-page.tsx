import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users } from "lucide-react";
import { Table, Character } from "@shared/schema";
import { CharacterPanel } from "@/components/session/character-panel";
import { CollaborativeWhiteboard } from "@/components/session/collaborative-whiteboard";
import { ChatPanel } from "@/components/session/chat-panel";
import { CharacterCreationModal } from "@/components/session/character-creation-modal";

export default function SessionPage() {
  const { user } = useAuth();
  const [, params] = useRoute("/session/:tableId");
  const [, setLocation] = useLocation();
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const tableId = params?.tableId;

  const { data: table } = useQuery<Table>({
    queryKey: ["/api/tables", tableId],
    enabled: !!tableId,
  });

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["/api/tables", tableId, "characters"],
    enabled: !!tableId,
  });

  // Check if user has a character in this table
  const userCharacter = characters.find(c => c.userId === user?.id);
  const isTableMaster = table?.masterId === user?.id;

  useEffect(() => {
    if (!tableId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join_table',
        tableId
      }));
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [tableId]);

  // If user doesn't have a character and isn't the table master, show character creation
  useEffect(() => {
    if (table && !userCharacter && !isTableMaster) {
      setShowCharacterCreation(true);
    }
  }, [table, userCharacter, isTableMaster]);

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Session Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {table.title}
                </h1>
                <p className="text-sm text-gray-400">
                  Code: {table.accessCode}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-300">
                  {characters.length} players online
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Session Content */}
      <div className="flex h-screen">
        {/* Characters Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <CharacterPanel
            characters={characters}
            isTableMaster={isTableMaster}
            currentUserId={user?.id}
            ws={ws}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Collaborative Whiteboard */}
          <div className="flex-1 bg-gray-900 relative">
            <CollaborativeWhiteboard ws={ws} />
          </div>

          {/* Chat Panel */}
          <div className="h-48 bg-gray-800 border-t border-gray-700">
            <ChatPanel ws={ws} userName={user?.name || "Unknown"} />
          </div>
        </div>
      </div>

      {/* Character Creation Modal */}
      <CharacterCreationModal
        open={showCharacterCreation}
        onOpenChange={setShowCharacterCreation}
        tableId={tableId!}
      />
    </div>
  );
}
