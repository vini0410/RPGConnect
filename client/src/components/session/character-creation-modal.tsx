import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCharacterSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const createCharacterSchema = insertCharacterSchema;
type CreateCharacterData = z.infer<typeof createCharacterSchema>;

interface CharacterCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
}

export function CharacterCreationModal({ open, onOpenChange, tableId }: CharacterCreationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateCharacterData>({
    resolver: zodResolver(createCharacterSchema),
    defaultValues: {
      name: "",
      health: 100,
      mana: 50,
      strength: 10,
      agility: 10,
      intelligence: 10,
      tableId,
    },
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (data: CreateCharacterData) => {
      const res = await apiRequest("POST", `/api/tables/${tableId}/characters`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", tableId, "characters"] });
      toast({
        title: "Character created successfully!",
        description: "You can now participate in the session",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create character",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateCharacterData) => {
    createCharacterMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Character</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">Character Name</Label>
            <Input
              id="name"
              placeholder="Enter character name"
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-red-400 text-sm">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          {/* Attributes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="health" className="text-gray-300">Health</Label>
              <Input
                id="health"
                type="number"
                min="1"
                max="999"
                className="bg-gray-900 border-gray-600 text-white focus:border-blue-500"
                {...form.register("health", { valueAsNumber: true })}
              />
              {form.formState.errors.health && (
                <p className="text-red-400 text-sm">{form.formState.errors.health.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mana" className="text-gray-300">Mana</Label>
              <Input
                id="mana"
                type="number"
                min="0"
                max="999"
                className="bg-gray-900 border-gray-600 text-white focus:border-blue-500"
                {...form.register("mana", { valueAsNumber: true })}
              />
              {form.formState.errors.mana && (
                <p className="text-red-400 text-sm">{form.formState.errors.mana.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="strength" className="text-gray-300">Strength</Label>
              <Input
                id="strength"
                type="number"
                min="1"
                max="30"
                className="bg-gray-900 border-gray-600 text-white focus:border-blue-500"
                {...form.register("strength", { valueAsNumber: true })}
              />
              {form.formState.errors.strength && (
                <p className="text-red-400 text-sm">{form.formState.errors.strength.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agility" className="text-gray-300">Agility</Label>
              <Input
                id="agility"
                type="number"
                min="1"
                max="30"
                className="bg-gray-900 border-gray-600 text-white focus:border-blue-500"
                {...form.register("agility", { valueAsNumber: true })}
              />
              {form.formState.errors.agility && (
                <p className="text-red-400 text-sm">{form.formState.errors.agility.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="intelligence" className="text-gray-300">Intelligence</Label>
              <Input
                id="intelligence"
                type="number"
                min="1"
                max="30"
                className="bg-gray-900 border-gray-600 text-white focus:border-blue-500"
                {...form.register("intelligence", { valueAsNumber: true })}
              />
              {form.formState.errors.intelligence && (
                <p className="text-red-400 text-sm">{form.formState.errors.intelligence.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-gray-900 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCharacterMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {createCharacterMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Character"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
