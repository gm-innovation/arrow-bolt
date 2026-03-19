import { LogOut, User, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUserAvatar } from "@/hooks/useUserAvatar";

interface UserMenuProps {
  userType: string;
}

export const UserMenu = ({ userType }: UserMenuProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { avatarUrl } = useUserAvatar();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return userType === "super-admin" ? "SA" : userType === "admin" ? "A" : userType === "manager" ? "M" : userType === "hr" ? "RH" : "T";
  };

  const getUserTitle = () => {
    switch (userType) {
      case "super-admin": return "Super Administrador";
      case "admin": return "Coordenador";
      case "manager": return "Gerente";
      case "tech": return "Técnico";
      case "hr": return "Recursos Humanos";
      case "commercial": return "Comercial";
      case "compras": return "Suprimentos";
      case "qualidade": return "Qualidade";
      case "financeiro": return "Financeiro";
      case "director": return "Diretor";
      default: return "";
    }
  };

  const getProfilePath = () => {
    switch (userType) {
      case "super-admin": return "/super-admin/profile";
      case "admin": return "/admin/profile";
      case "manager": return "/manager/profile";
      case "tech": return "/tech/profile";
      case "hr": return "/hr/profile";
      case "commercial": return "/commercial/profile";
      case "compras": return "/supplies/profile";
      case "qualidade": return "/quality/profile";
      case "financeiro": return "/finance/profile";
      case "director": return "/corp/profile";
      default: return "/";
    }
  };

  const getSettingsPath = () => {
    switch (userType) {
      case "super-admin": return "/super-admin/settings";
      case "admin": return "/admin/settings";
      case "manager": return "/manager/settings";
      case "tech": return "/tech/settings";
      case "hr": return "/hr/settings";
      case "commercial": return "/commercial/settings";
      case "compras": return "/supplies/settings";
      case "qualidade": return "/quality/settings";
      case "financeiro": return "/finance/settings";
      case "director": return "/manager/settings";
      default: return "/";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
          <Avatar className="h-8 w-8 cursor-pointer">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt="Avatar" className="object-cover" />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.user_metadata?.full_name || "Usuário"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {getUserTitle()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(getProfilePath())}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(getSettingsPath())}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
