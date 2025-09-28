'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SosoIcon } from '@/components/icons/SosoIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Moon, Sun, Heart, LogOut } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import useUserSession from '@/hooks/use-user-session';

export function MainHeader() {
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useUserSession();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    setUser(null);
    router.push('/');
  };

  const navLinks = [
    { href: '/lobby', label: 'الغرف' },
    { href: '/profile', label: 'الملف الشخصي' },
  ];

  return (
    <header className="bg-card/50 backdrop-blur-lg border-b border-accent/20 sticky top-0 z-40">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link
          href="/lobby"
          className="flex items-center gap-2"
          aria-label="Home"
        >
          <SosoIcon className="h-10 w-10 text-accent" />
          <span className="hidden sm:inline-block font-headline text-2xl font-bold text-foreground">
            اصيل سينما
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4 rounded-full bg-background/50 p-1 border border-transparent">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm sm:text-base font-medium transition-colors',
                pathname === link.href
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-card/80 backdrop-blur-lg"
            >
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="h-4 w-4 me-2" /> فاتح
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="h-4 w-4 me-2" /> داكن
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('romantic')}>
                <Heart className="h-4 w-4 me-2" /> رومانسي
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
            </span>
            <span className="sr-only">Notifications</span>
          </Button>

          {user && (
            <div className="text-sm text-muted-foreground hidden md:block">
              مرحباً،{' '}
              <span className="font-bold text-foreground">{user.name}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-full"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
