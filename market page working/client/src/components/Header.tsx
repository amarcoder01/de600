import { Link } from "wouter";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="text-primary-foreground h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MarketPro</h1>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="text-foreground/60 hover:text-foreground transition-colors">
              <span>Markets</span>
            </Link>
            <Link href="/" className="text-foreground transition-colors">
              <span>Stocks</span>
            </Link>
            <Link href="/" className="text-foreground/60 hover:text-foreground transition-colors">
              <span>Watchlist</span>
            </Link>
            <Link href="/" className="text-foreground/60 hover:text-foreground transition-colors">
              <span>Portfolio</span>
            </Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Badge variant="secondary" className="text-xs font-medium">
              Markets Open
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
