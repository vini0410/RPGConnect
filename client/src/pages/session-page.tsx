import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Settings, Users, X } from "lucide-react";
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
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const tableId = params?.tableId;

  const { data: table } = useQuery<Table, Error>({
    queryKey: ["/api/tables", tableId],
    enabled: !!tableId,
    queryFn: async () => {
      if (!tableId) throw new Error("Table ID is missing.");
      const response = await fetch(`/api/tables/${tableId}`);
      if (!response.ok) {
        throw new Error(`Failed to load table: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: characters } = useQuery<Character[], Error>({
    queryKey: ["/api/tables", tableId, "characters"],
    enabled: !!tableId,
    queryFn: async () => {
      if (!tableId) throw new Error("Table ID is missing.");
      const response = await fetch(`/api/tables/${tableId}/characters`);
      if (!response.ok) {
        throw new Error(`Failed to load characters: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Check if user has a character in this table
  const userCharacter = characters?.find((c: Character) => c.userId === user?.id);
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
        const data = JSON.parse(event.data.toString()); // Ensure data is string
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
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [tableId]);

  // If user doesn't have a character and isn't the table master, show character creation
  useEffect(() => {
    if (!table || !user || characters === undefined) { // Check characters explicitly for undefined
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

  // Refined loading check
  if (!user || characters === undefined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading session data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Session Header */}
      <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
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
                  {table.title} {/* table is guaranteed not null here */}
                </h1>
                <p className="text-sm text-gray-400">
                  Code: {table.accessCode} {/* table is guaranteed not null here */}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-300">
                  {characters?.length ?? 0} players online {/* Nullish coalescing for characters */}
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
      </header>

      {/* Session Content */}
      <main className="flex-grow flex flex-row p-4 gap-4 overflow-hidden relative">
        {/* Backdrop for mobile panel view */}
        {/* Backdrop for mobile panel view */}
        {/* Backdrop for mobile panel view */}
        {/* Backdrop for mobile panel view */}
        {(isLeftPanelOpen || isRightPanelOpen) && (
          <div
            className="fixed inset-0 bg-black/60 z-30 hd:hidden"
            onClick={() => {
              setIsLeftPanelOpen(false);
              setIsRightPanelOpen(false);
            }}
            aria-hidden="true"
          />
        )}

        {/* Mobile Toggle Buttons */}
        <Button
          variant="secondary"
          size="icon"
          className="hd:hidden fixed top-1/2 -translate-y-1/2 left-0 z-40 rounded-l-none shadow-lg"
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          aria-label="Open characters panel"
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="hd:hidden fixed top-1/2 -translate-y-1/2 right-0 z-40 rounded-r-none shadow-lg"
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          aria-label="Open chat panel"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        {/* Characters Panel */}
        <aside
          className={`
            bg-gray-800 rounded-lg border-gray-700 flex-col z-50
            transition-transform duration-300 ease-in-out
            ${isLeftPanelOpen ? "flex" : "hidden"} hd:flex hd:w-[400px]
          `}
        >
          <Button
            variant="ghost"
            size="icon"
            className="hd:hidden absolute top-2 right-2 text-gray-400 hover:text-white"
            onClick={() => setIsLeftPanelOpen(false)}
            aria-label="Close characters panel"
          >
            <X className="w-5 h-5" />
          </Button>
          <CharacterPanel
            characters={characters || []} // Provide empty array if characters is undefined
            isTableMaster={isTableMaster}
            currentUserId={user?.id}
            ws={ws}
          />
        </aside>

        {/* Main Content Area */}
        {/* Collaborative Whiteboard */}
        <section className="flex-grow flex items-center justify-center z-0">
          <CollaborativeWhiteboard ws={ws} />
        </section>

        {/* Chat Panel */}
        <aside
          className={`
            bg-gray-800 rounded-lg border-gray-700 flex-col z-50
            transition-transform duration-300 ease-in-out
            ${isRightPanelOpen ? "flex" : "hidden"} hd:flex hd:w-[400px]
          `}
        >
          <Button
            variant="ghost"
            size="icon"
            className="hd:hidden absolute top-2 left-2 text-gray-400 hover:text-white"
            onClick={() => setIsRightPanelOpen(false)}
            aria-label="Close chat panel"
          >
            <X className="w-5 h-5" />
          </Button>
          <ChatPanel ws={ws} userName={user?.name || "Unknown"} />
        </aside>
      </main>

      {/* Character Creation Modal */}
      <CharacterCreationModal
        open={showCharacterCreation}
        onOpenChange={setShowCharacterCreation}
        tableId={tableId!}
      />
    </div>
  );
}
