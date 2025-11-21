import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function AccountPage() {
  const { user, updateUserMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (user) {
      await updateUserMutation.mutateAsync({ name, email });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto py-12">
        <Button variant="outline" onClick={() => setLocation("/")} className="mb-4 bg-gray-800 hover:bg-gray-700 border-gray-600">
          Back to Home
        </Button>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="bg-gray-700 border-gray-600"
              />
            </div>
            {isEditing ? (
              <div className="flex space-x-2">
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSave}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  className="bg-gray-600 hover:bg-gray-500 border-gray-500"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
