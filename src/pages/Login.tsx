import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual authentication
    if (email && password) {
      // Temporary navigation based on email domain
      if (email.includes("superadmin")) {
        navigate("/super-admin/dashboard");
      } else if (email.includes("admin")) {
        navigate("/admin/dashboard");
      } else {
        navigate("/tech/dashboard");
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-light to-navy">
      <Card className="w-[350px]">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Ship className="h-12 w-12 text-navy-bright" />
          </div>
          <CardTitle className="text-2xl text-center">Naval OS Manager</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-navy-bright hover:bg-navy-medium">
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;