import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Character } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Edit2, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CharacterPanelProps {
  characters: Character[];
  isTableMaster: boolean;
  currentUserId?: number;
  ws: WebSocket | null;
}

export function CharacterPanel({ characters, isTableMaster, currentUserId, ws }: CharacterPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Character>>({});

  const updateCharacterMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Character> }) => {
      const res = await apiRequest("PUT", `/api/characters/${id}`, updates);
      return await res.json();
    },
    onSuccess: (character) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", character.tableId, "characters"] });
      toast({
        title: "Character updated successfully",
      });
      setEditingCharacter(null);
      setEditValues({});
    },
    onError: (error) => {
      toast({
        title: "Failed to update character",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (character: Character) => {
    setEditingCharacter(character.id);
    setEditValues({
      health: character.health,
      mana: character.mana,
      strength: character.strength,
      agility: character.agility,
      intelligence: character.intelligence,
    });
  };

  const handleSave = (characterId: string) => {
    updateCharacterMutation.mutate({
      id: characterId,
      updates: editValues,
    });
  };

  const handleCancel = () => {
    setEditingCharacter(null);
    setEditValues({});
  };

  const canEditCharacter = (character: Character) => {
    return isTableMaster || character.userId === currentUserId;
  };

  const getHealthPercentage = (health: number, maxHealth: number = 100) => {
    return Math.max(0, Math.min(100, (health / maxHealth) * 100));
  };

  const getManaPercentage = (mana: number, maxMana: number = 100) => {
    return Math.max(0, Math.min(100, (mana / maxMana) * 100));
  };

  const getHealthColor = (percentage: number) => {
    if (percentage > 60) return "from-green-500 to-green-600";
    if (percentage > 30) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-red-600";
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-blue-500" />
        Characters
      </h2>
      
      <div className="space-y-4">
        {characters.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No characters yet</p>
            <p className="text-sm">Join the table to create a character</p>
          </div>
        ) : (
          characters.map((character) => (
            <div key={character.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{character.name}</h3>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-blue-600 text-white text-xs">
                    {character.userId === currentUserId ? "You" : "Player"}
                  </Badge>
                  {canEditCharacter(character) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(character)}
                      className="text-gray-400 hover:text-white p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {editingCharacter === character.id ? (
                <div className="space-y-3">
                  {/* Health */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Health</span>
                      <Input
                        type="number"
                        value={editValues.health || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, health: parseInt(e.target.value) }))}
                        className="w-20 h-6 text-xs bg-gray-800 border-gray-600 text-white"
                        min="0"
                        max="999"
                      />
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r ${getHealthColor(getHealthPercentage(editValues.health || 0))} h-2 rounded-full transition-all`}
                        style={{ width: `${getHealthPercentage(editValues.health || 0)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Mana */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Mana</span>
                      <Input
                        type="number"
                        value={editValues.mana || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, mana: parseInt(e.target.value) }))}
                        className="w-20 h-6 text-xs bg-gray-800 border-gray-600 text-white"
                        min="0"
                        max="999"
                      />
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${getManaPercentage(editValues.mana || 0)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Attributes */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-gray-400">STR</div>
                      <Input
                        type="number"
                        value={editValues.strength || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, strength: parseInt(e.target.value) }))}
                        className="w-full h-6 text-xs bg-gray-800 border-gray-600 text-white text-center"
                        min="1"
                        max="30"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">AGI</div>
                      <Input
                        type="number"
                        value={editValues.agility || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, agility: parseInt(e.target.value) }))}
                        className="w-full h-6 text-xs bg-gray-800 border-gray-600 text-white text-center"
                        min="1"
                        max="30"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">INT</div>
                      <Input
                        type="number"
                        value={editValues.intelligence || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, intelligence: parseInt(e.target.value) }))}
                        className="w-full h-6 text-xs bg-gray-800 border-gray-600 text-white text-center"
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                  
                  {/* Edit Actions */}
                  <div className="flex space-x-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleSave(character.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={updateCharacterMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Health Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Health</span>
                      <span className="text-white">{character.health}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r ${getHealthColor(getHealthPercentage(character.health))} h-2 rounded-full transition-all`}
                        style={{ width: `${getHealthPercentage(character.health)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Mana Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Mana</span>
                      <span className="text-white">{character.mana}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${getManaPercentage(character.mana)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Attributes */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-gray-400">STR</div>
                      <div className="text-white font-semibold">{character.strength}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">AGI</div>
                      <div className="text-white font-semibold">{character.agility}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400">INT</div>
                      <div className="text-white font-semibold">{character.intelligence}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
