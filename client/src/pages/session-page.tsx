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
    onError: (err) => console.error("Failed to load table:", err),
  });

  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["/api/tables", tableId, "characters"],
    enabled: !!tableId,
    onError: (err) => console.error("Failed to load characters:", err),
  });

  // Check if user has a character in this table
  const userCharacter = characters.find((c) => c.userId === user?.id);
  const isTableMaster = table?.masterId === user?.id;

  useEffect(() => {
    if (!tableId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log("Connecting to WebSocket:", wsUrl);

    console.log("=== WebSocket Debug Info ===");
    console.log("TableId:", tableId);
    console.log("Protocol:", protocol);
    console.log("Host:", host);
    console.log("Full URL:", wsUrl);
    console.log("Window location:", window.location);
    // console.log("Environment variables:", process.env);
    console.log("============================");

    const socket = new WebSocket(wsUrl);
    console.log("WebSocket created:", socket);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "join_table",
          tableId,
        }),
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        // Handle different message types
        switch (data.type) {
          case "whiteboard_draw":
            console.log("Whiteboard draw data:", data.data);
            break;
          case "chat_message":
            console.log("Chat message:", data.message, "from:", data.sender);
            break;
          case "character_created":
            console.log("Character created:", data.character);
            break;
          case "character_updated":
            console.log("Character updated:", data.character);
            break;
          case "user_joined":
            console.log("User joined table:", data.tableId);
            break;
          case "user_left":
            console.log("User left table:", data.tableId);
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
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
    // Só executa quando todos os dados estiverem carregados
    if (!table || !user || characters === undefined) {
      console.log("Waiting for data to load...");
      return;
    }

    const shouldShowCreation = !userCharacter && !isTableMaster;

    setShowCharacterCreation(shouldShowCreation);
  }, [table, user, characters, userCharacter, isTableMaster]);

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading table...</div>
      </div>
    );
  }

  if (!table || !user || characters === undefined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading session data...</div>
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
      <div className="flex h-full">
        {/* Characters Panel */}
        <div className="h-full w-full bg-gray-800 border-r border-gray-700 overflow-hidden">
          <CharacterPanel
            characters={characters}
            isTableMaster={isTableMaster}
            currentUserId={user?.id}
            ws={ws}
          />
        </div>

        {/* Main Content Area */}
        {/* Collaborative Whiteboard */}
        <div className="bg-gray-900 relative">
          <CollaborativeWhiteboard ws={ws} />
        </div>

        {/* Chat Panel */}
        <div className="h-full w-full bg-gray-800 border-t border-gray-700 overflow-hidden">
          <ChatPanel ws={ws} userName={user?.name || "Unknown"} />
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
