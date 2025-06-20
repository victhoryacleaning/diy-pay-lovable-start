
import { cn } from "@/lib/utils";
import { 
  FileText, 
  DollarSign, 
  Palette, 
  Zap, 
  Share2 
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
}

interface ProductFormNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  mode: 'create' | 'edit';
}

const navigationItems: NavigationItem[] = [
  { id: 'general', label: 'Geral', icon: FileText },
  { id: 'pricing', label: 'Preços e Ofertas', icon: DollarSign },
  { id: 'customization', label: 'Personalização', icon: Palette },
  { id: 'automation', label: 'Automação', icon: Zap },
  { id: 'links', label: 'Links e Divulgação', icon: Share2 },
];

export const ProductFormNavigation = ({ 
  activeSection, 
  onSectionChange, 
  mode 
}: ProductFormNavigationProps) => {
  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left",
              isActive
                ? "bg-diypay-100 text-diypay-700 border border-diypay-200"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};
