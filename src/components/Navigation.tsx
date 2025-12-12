import { NavLink } from './NavLink';
import { Button } from './ui/button';
import { Image, Grid3x3, Sparkles, LogOut, User, DollarSign, Coins, Video, Brain, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const { tokenBalance, isAdmin } = useSubscription();

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
                  to="/create"
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
                  to="/scenes"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Scenes</span>
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
                <NavLink
                  to="/memory"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  activeClassName="text-primary"
                >
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Brain className="w-4 h-4" />
                    <span className="hidden sm:inline">Memory</span>
                  </Button>
                </NavLink>

                {/* Token Balance */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {isAdmin ? (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                        Unlimited
                      </Badge>
                    ) : (
                      <>
                        {tokenBalance?.balance.toLocaleString() || '0'}
                        {tokenBalance && (tokenBalance.free_tokens_granted - tokenBalance.free_tokens_used) > 0 && (
                          <span className="ml-1 text-xs text-primary">
                            (+{tokenBalance.free_tokens_granted - tokenBalance.free_tokens_used} free)
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>

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
                    <DropdownMenuItem asChild>
                      <NavLink to="/settings" className="flex items-center w-full">
                        <SettingsIcon className="w-4 h-4 mr-2" />
                        Settings
                      </NavLink>
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
