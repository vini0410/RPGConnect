import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dice6, Plus, LogIn, Users, Key, ArrowRight, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateTableModal } from "@/components/dashboard/create-table-modal";
import { JoinTableModal } from "@/components/dashboard/join-table-modal";
import { Table } from "@shared/schema";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [showJoinTable, setShowJoinTable] = useState(false);

  const { data: ownedTables = [], isLoading: loadingOwned } = useQuery<Table[]>({
    queryKey: ["/api/tables/owned"],
  });

  const { data: joinedTables = [], isLoading: loadingJoined } = useQuery<Table[]>({
    queryKey: ["/api/tables/joined"],
  });

  const handleEnterTable = (tableId: string) => {
    setLocation(`/session/${tableId}`);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Header */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Dice6 className="text-blue-500 text-2xl mr-3" />
              <span className="text-xl font-bold text-white">RPG Manager</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.name}</span>
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-gray-900 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700 text-white">
                    <DropdownMenuItem
                      onClick={() => setLocation("/account")}
                      className="hover:bg-gray-700 cursor-pointer"
                    >
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="hover:bg-gray-700 cursor-pointer"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-400">Manage your RPG tables and characters</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setShowCreateTable(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-12 text-left justify-start"
          >
            <div className="flex flex-col items-start">
              <Plus className="text-2xl mb-2" />
              <h3 className="font-semibold">Create New Table</h3>
              <p className="text-blue-100 text-sm font-light">Start a new RPG session</p>
            </div>
          </Button>
          
          <Button
            onClick={() => setShowJoinTable(true)}
            variant="outline"
            className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-white p-12 text-left justify-start"
          >
            <div className="flex flex-col items-start">
              <LogIn className="text-purple-500 text-2xl mb-2" />
              <h3 className="font-semibold">Join Table</h3>
              <p className="text-gray-400 text-sm font-light">Enter an access code</p>
            </div>
          </Button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Owned Tables */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Your Tables</h2>
            <div className="space-y-4">
              {loadingOwned ? (
                <div className="text-gray-400">Loading...</div>
              ) : ownedTables.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No tables created yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Click "Create New Table" to get started
                    </p>
                  </CardContent>
                </Card>
              ) : (
                ownedTables.map((table) => (
                  <Card key={table.id} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {table.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-3">
                            {table.rulebook}
                          </p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center text-gray-400">
                              <Key className="w-4 h-4 mr-2" />
                              {table.accessCode}
                            </span>
                            <span className="flex items-center text-gray-400">
                              <Users className="w-4 h-4 mr-2" />
                              Active
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-blue-600 text-white">Master</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEnterTable(table.id)}
                            className="text-blue-400 hover:text-purple-400"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Joined Tables */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Joined Tables</h2>
            <div className="space-y-4">
              {loadingJoined ? (
                <div className="text-gray-400">Loading...</div>
              ) : joinedTables.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">No tables joined yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Click "Join Table" to enter a game
                    </p>
                  </CardContent>
                </Card>
              ) : (
                joinedTables.map((table) => (
                  <Card key={table.id} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {table.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-3">
                            {table.rulebook}
                          </p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="flex items-center text-gray-400">
                              <User className="w-4 h-4 mr-2" />
                              Game Master
                            </span>
                            <span className="flex items-center text-green-500">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                              Active
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-purple-600 text-white">Player</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEnterTable(table.id)}
                            className="text-purple-400 hover:text-blue-400"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTableModal
        open={showCreateTable}
        onOpenChange={setShowCreateTable}
      />
      <JoinTableModal
        open={showJoinTable}
        onOpenChange={setShowJoinTable}
      />
    </div>
  );
}
