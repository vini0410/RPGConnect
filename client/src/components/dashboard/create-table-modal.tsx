import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTableSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const createTableSchema = insertTableSchema;
type CreateTableData = z.infer<typeof createTableSchema>;

interface CreateTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTableModal({ open, onOpenChange }: CreateTableModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateTableData>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      title: "",
      rulebook: "",
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: CreateTableData) => {
      const res = await apiRequest("POST", "/api/tables", data);
      return await res.json();
    },
    onSuccess: (table) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables/owned"] });
      toast({
        title: "Table created successfully!",
        description: `Access code: ${table.accessCode}`,
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create table",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateTableData) => {
    createTableMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Table</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300">Table Title</Label>
            <Input
              id="title"
              placeholder="Enter table name"
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-red-400 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rulebook" className="text-gray-300">Rulebook</Label>
            <Select onValueChange={(value) => form.setValue("rulebook", value)}>
              <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                <SelectValue placeholder="Select a rulebook" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="dnd5e">D&D 5th Edition</SelectItem>
                <SelectItem value="pathfinder">Pathfinder</SelectItem>
                <SelectItem value="call-of-cthulhu">Call of Cthulhu</SelectItem>
                <SelectItem value="vampire">Vampire: The Masquerade</SelectItem>
                <SelectItem value="custom">Custom System</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.rulebook && (
              <p className="text-red-400 text-sm">{form.formState.errors.rulebook.message}</p>
            )}
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
              disabled={createTableMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {createTableMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Table"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
