export interface NavItem {
  label: string;
  href: string;
  items?: { label: string; href: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
 
];