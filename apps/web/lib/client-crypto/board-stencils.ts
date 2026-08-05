/** Curated Lucide stencil catalog for board diagrams (ciphertext tokens). */

import type { LucideIcon } from "lucide-react";
import {
  AntennaIcon,
  AppWindowIcon,
  ArchiveIcon,
  BatteryIcon,
  BotIcon,
  BoxIcon,
  BoxesIcon,
  BriefcaseIcon,
  Building2Icon,
  BuildingIcon,
  CableIcon,
  CameraIcon,
  CarIcon,
  CircuitBoardIcon,
  CloudCogIcon,
  CloudIcon,
  CodeIcon,
  ContainerIcon,
  CpuIcon,
  DatabaseBackupIcon,
  DatabaseIcon,
  FactoryIcon,
  FileIcon,
  FingerprintIcon,
  FolderIcon,
  GitBranchIcon,
  GlobeIcon,
  HardDriveIcon,
  HomeIcon,
  HotelIcon,
  KeyIcon,
  LaptopIcon,
  LayersIcon,
  LinkIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  MemoryStickIcon,
  MonitorIcon,
  NetworkIcon,
  PackageIcon,
  PhoneIcon,
  PlaneIcon,
  PlugIcon,
  PrinterIcon,
  RadioIcon,
  RouterIcon,
  ServerCogIcon,
  ServerIcon,
  SettingsIcon,
  Share2Icon,
  ShieldIcon,
  ShipIcon,
  SmartphoneIcon,
  StoreIcon,
  TabletIcon,
  TerminalIcon,
  TruckIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  WarehouseIcon,
  WebhookIcon,
  WifiIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";

export const BOARD_STENCIL_CATEGORIES = [
  "compute",
  "storage",
  "network",
  "cloud",
  "facilities",
  "people",
  "general",
] as const;

export type BoardStencilCategory = (typeof BOARD_STENCIL_CATEGORIES)[number];

export const BOARD_STENCIL_CATEGORY_LABELS: Record<
  BoardStencilCategory,
  string
> = {
  compute: "Compute",
  storage: "Storage",
  network: "Network",
  cloud: "Cloud",
  facilities: "Facilities",
  people: "People",
  general: "General",
};

/** Allowlisted Lucide tokens used by board stencils. */
export const BOARD_STENCIL_ICON_TOKENS = [
  "antenna",
  "app-window",
  "archive",
  "battery",
  "bot",
  "box",
  "boxes",
  "briefcase",
  "building",
  "building-2",
  "cable",
  "camera",
  "car",
  "circuit-board",
  "cloud",
  "cloud-cog",
  "code",
  "container",
  "cpu",
  "database",
  "database-backup",
  "factory",
  "file",
  "fingerprint",
  "folder",
  "git-branch",
  "globe",
  "hard-drive",
  "home",
  "hotel",
  "key",
  "laptop",
  "layers",
  "link",
  "lock",
  "mail",
  "map-pin",
  "memory-stick",
  "monitor",
  "network",
  "package",
  "phone",
  "plane",
  "plug",
  "printer",
  "radio",
  "router",
  "server",
  "server-cog",
  "settings",
  "share-2",
  "shield",
  "ship",
  "smartphone",
  "store",
  "tablet",
  "terminal",
  "truck",
  "user",
  "user-cog",
  "users",
  "warehouse",
  "webhook",
  "wifi",
  "wrench",
  "zap",
] as const;

export type BoardStencilIcon = (typeof BOARD_STENCIL_ICON_TOKENS)[number];

export function isBoardStencilIcon(
  value: unknown,
): value is BoardStencilIcon {
  return (
    typeof value === "string" &&
    (BOARD_STENCIL_ICON_TOKENS as readonly string[]).includes(value)
  );
}

export const BOARD_STENCIL_ICON_COMPONENTS: Record<
  BoardStencilIcon,
  LucideIcon
> = {
  antenna: AntennaIcon,
  "app-window": AppWindowIcon,
  archive: ArchiveIcon,
  battery: BatteryIcon,
  bot: BotIcon,
  box: BoxIcon,
  boxes: BoxesIcon,
  briefcase: BriefcaseIcon,
  building: BuildingIcon,
  "building-2": Building2Icon,
  cable: CableIcon,
  camera: CameraIcon,
  car: CarIcon,
  "circuit-board": CircuitBoardIcon,
  cloud: CloudIcon,
  "cloud-cog": CloudCogIcon,
  code: CodeIcon,
  container: ContainerIcon,
  cpu: CpuIcon,
  database: DatabaseIcon,
  "database-backup": DatabaseBackupIcon,
  factory: FactoryIcon,
  file: FileIcon,
  fingerprint: FingerprintIcon,
  folder: FolderIcon,
  "git-branch": GitBranchIcon,
  globe: GlobeIcon,
  "hard-drive": HardDriveIcon,
  home: HomeIcon,
  hotel: HotelIcon,
  key: KeyIcon,
  laptop: LaptopIcon,
  layers: LayersIcon,
  link: LinkIcon,
  lock: LockIcon,
  mail: MailIcon,
  "map-pin": MapPinIcon,
  "memory-stick": MemoryStickIcon,
  monitor: MonitorIcon,
  network: NetworkIcon,
  package: PackageIcon,
  phone: PhoneIcon,
  plane: PlaneIcon,
  plug: PlugIcon,
  printer: PrinterIcon,
  radio: RadioIcon,
  router: RouterIcon,
  server: ServerIcon,
  "server-cog": ServerCogIcon,
  settings: SettingsIcon,
  "share-2": Share2Icon,
  shield: ShieldIcon,
  ship: ShipIcon,
  smartphone: SmartphoneIcon,
  store: StoreIcon,
  tablet: TabletIcon,
  terminal: TerminalIcon,
  truck: TruckIcon,
  user: UserIcon,
  "user-cog": UserCogIcon,
  users: UsersIcon,
  warehouse: WarehouseIcon,
  webhook: WebhookIcon,
  wifi: WifiIcon,
  wrench: WrenchIcon,
  zap: ZapIcon,
};

export type BoardStencil = {
  id: string;
  label: string;
  icon: BoardStencilIcon;
  category: BoardStencilCategory;
};

/** Static stencil library shown in the board Library picker. */
export const BOARD_STENCILS: readonly BoardStencil[] = [
  // Compute
  { id: "server", label: "Server", icon: "server", category: "compute" },
  {
    id: "server-rack",
    label: "Server rack",
    icon: "server-cog",
    category: "compute",
  },
  { id: "cpu", label: "CPU", icon: "cpu", category: "compute" },
  {
    id: "circuit-board",
    label: "Circuit board",
    icon: "circuit-board",
    category: "compute",
  },
  { id: "memory", label: "Memory", icon: "memory-stick", category: "compute" },
  { id: "container", label: "Container", icon: "container", category: "compute" },
  { id: "cluster", label: "Cluster", icon: "boxes", category: "compute" },
  { id: "terminal", label: "Terminal", icon: "terminal", category: "compute" },
  { id: "monitor", label: "Monitor", icon: "monitor", category: "compute" },
  { id: "laptop", label: "Laptop", icon: "laptop", category: "compute" },
  {
    id: "smartphone",
    label: "Smartphone",
    icon: "smartphone",
    category: "compute",
  },
  { id: "tablet", label: "Tablet", icon: "tablet", category: "compute" },

  // Storage
  { id: "database", label: "Database", icon: "database", category: "storage" },
  {
    id: "database-backup",
    label: "DB backup",
    icon: "database-backup",
    category: "storage",
  },
  {
    id: "hard-drive",
    label: "Hard drive",
    icon: "hard-drive",
    category: "storage",
  },
  { id: "archive", label: "Archive", icon: "archive", category: "storage" },
  { id: "folder", label: "Folder", icon: "folder", category: "storage" },
  { id: "file", label: "File", icon: "file", category: "storage" },
  { id: "box", label: "Box", icon: "box", category: "storage" },
  { id: "package", label: "Package", icon: "package", category: "storage" },

  // Network
  { id: "network", label: "Network", icon: "network", category: "network" },
  { id: "router", label: "Router", icon: "router", category: "network" },
  { id: "wifi", label: "Wi-Fi", icon: "wifi", category: "network" },
  { id: "globe", label: "Internet", icon: "globe", category: "network" },
  { id: "cable", label: "Cable", icon: "cable", category: "network" },
  { id: "antenna", label: "Antenna", icon: "antenna", category: "network" },
  { id: "radio", label: "Radio", icon: "radio", category: "network" },
  { id: "link", label: "Link", icon: "link", category: "network" },
  { id: "share", label: "Share", icon: "share-2", category: "network" },
  { id: "webhook", label: "Webhook", icon: "webhook", category: "network" },

  // Cloud
  { id: "cloud", label: "Cloud", icon: "cloud", category: "cloud" },
  { id: "cloud-service", label: "Cloud service", icon: "cloud-cog", category: "cloud" },
  { id: "app-window", label: "App", icon: "app-window", category: "cloud" },
  { id: "api", label: "API", icon: "code", category: "cloud" },
  { id: "git", label: "Git", icon: "git-branch", category: "cloud" },
  { id: "layers", label: "Layers", icon: "layers", category: "cloud" },

  // Facilities
  {
    id: "server-room",
    label: "Server room",
    icon: "warehouse",
    category: "facilities",
  },
  {
    id: "data-center",
    label: "Data center",
    icon: "building-2",
    category: "facilities",
  },
  { id: "office", label: "Office", icon: "building", category: "facilities" },
  { id: "factory", label: "Factory", icon: "factory", category: "facilities" },
  { id: "warehouse", label: "Warehouse", icon: "warehouse", category: "facilities" },
  { id: "home", label: "Home", icon: "home", category: "facilities" },
  { id: "hotel", label: "Hotel", icon: "hotel", category: "facilities" },
  { id: "store", label: "Store", icon: "store", category: "facilities" },
  { id: "location", label: "Location", icon: "map-pin", category: "facilities" },

  // People
  { id: "person", label: "Person", icon: "user", category: "people" },
  { id: "team", label: "Team", icon: "users", category: "people" },
  { id: "admin", label: "Admin", icon: "user-cog", category: "people" },
  { id: "agent", label: "Agent", icon: "bot", category: "people" },
  { id: "role", label: "Role", icon: "briefcase", category: "people" },

  // General
  { id: "shield", label: "Security", icon: "shield", category: "general" },
  { id: "lock", label: "Lock", icon: "lock", category: "general" },
  { id: "key", label: "Key", icon: "key", category: "general" },
  {
    id: "fingerprint",
    label: "Identity",
    icon: "fingerprint",
    category: "general",
  },
  { id: "settings", label: "Settings", icon: "settings", category: "general" },
  { id: "wrench", label: "Maintenance", icon: "wrench", category: "general" },
  { id: "power", label: "Power", icon: "zap", category: "general" },
  { id: "battery", label: "Battery", icon: "battery", category: "general" },
  { id: "plug", label: "Power plug", icon: "plug", category: "general" },
  { id: "mail", label: "Mail", icon: "mail", category: "general" },
  { id: "phone", label: "Phone", icon: "phone", category: "general" },
  { id: "printer", label: "Printer", icon: "printer", category: "general" },
  { id: "camera", label: "Camera", icon: "camera", category: "general" },
  { id: "truck", label: "Truck", icon: "truck", category: "general" },
  { id: "ship", label: "Ship", icon: "ship", category: "general" },
  { id: "plane", label: "Plane", icon: "plane", category: "general" },
  { id: "car", label: "Car", icon: "car", category: "general" },
] as const;

export function filterBoardStencils(
  query: string,
  category: BoardStencilCategory | "all" = "all",
): BoardStencil[] {
  const q = query.trim().toLowerCase();
  return BOARD_STENCILS.filter((stencil) => {
    if (category !== "all" && stencil.category !== category) return false;
    if (!q) return true;
    return (
      stencil.label.toLowerCase().includes(q) ||
      stencil.id.includes(q) ||
      stencil.icon.includes(q)
    );
  });
}
