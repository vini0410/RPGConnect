import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const joinTableSchema = z.object({
  accessCode: z.string().min(6, "Access code must be 6 characters").max(6, "Access code must be 6 characters"),
});

type JoinTableData = z.infer<typeof joinTableSchema>;

interface JoinTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTableModal({ open, onOpenChange }: JoinTableModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<JoinTableData>({
    defaultValues: {
      accessCode: "",
    },
  });

  const joinTableMutation = useMutation({
    mutationFn: async (data: JoinTableData) => {
      const res = await apiRequest("POST", "/api/tables/join", data);
      return await res.json();
    },
    onSuccess: (table) => {
      toast({
        title: "Table found!",
        description: `Joining "${table.title}"`,
      });
      onOpenChange(false);
      form.reset();
      setLocation(`/session/${table.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to join table",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: JoinTableData) => {
    joinTableMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Join Table</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="accessCode" className="text-gray-300">Access Code</Label>
            <Input
              id="accessCode"
              placeholder="ABC123"
              maxLength={6}
              className="bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-purple-500 text-center text-2xl font-mono tracking-widest uppercase"
              {...form.register("accessCode", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            <p className="text-gray-400 text-sm">
              Enter the 6-character code provided by the table master
            </p>
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
              disabled={joinTableMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {joinTableMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Table"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
