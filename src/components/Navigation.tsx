import { NavLink } from './NavLink';
import { Button } from './ui/button';
import { Image, Grid3x3, Sparkles, LogOut, User, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';

export default function Navigation() {
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
              <Sparkles className="w-8 h-8 text-primary relative" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              VinciAI
            </span>
          </NavLink>

          {/* Nav Links */}
          <div className="flex items-center gap-2">
            {user && (
              <>
                <NavLink
                  to="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Image className="w-4 h-4" />
                    <span className="hidden sm:inline">Create</span>
                  </Button>
                </NavLink>
                <NavLink
                  to="/gallery"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Grid3x3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Gallery</span>
                  </Button>
                </NavLink>
                <NavLink
                  to="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <Button variant="ghost" size="sm" className="gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="hidden sm:inline">Pricing</span>
                  </Button>
                </NavLink>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-primary/20">
                          {getInitials(user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">{user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass border-border/30 w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border/30" />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/30" />
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => signOut()}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
