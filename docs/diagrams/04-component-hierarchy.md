# Component Hierarchy

```mermaid
graph TD
    APP["App.tsx\nProviders setup"]
    APP --> GCP["GlobalConfirmProvider"]
    GCP --> AN["AppNavigator"]

    AN --> TP["TutorialProvider\nContext"]
    TP --> AH["AppHeader\ntop nav bar"]
    TP --> PAGES["Page Container\nlazy persistent mount"]
    TP --> BTB["BottomTabBar\nmobile only"]
    TP --> TS["TutorialSpotlight\noverlay"]

    subgraph PAGES_LIST["Screens (mounted once, hidden with display:none)"]
        VS["VisualizerScreen"]
        CS["CatalogScreen"]
        SS["SavedDesignsScreen"]
        IS["InventoryScreen"]
        DS["DashboardScreen"]
        AS["AdminScreen"]
    end

    PAGES --> PAGES_LIST

    VS --> TC["ThreeCanvas"]
    TC -->|Platform.OS === web| WC["WebCanvas\nHTML canvas"]
    TC -->|Platform.OS !== web| NC["NativeCanvas\nexpo-gl GLView"]
    WC --> CB["CtrlBtn × 6\n3D controls"]
    NC --> CB

    CS --> CSBAR["CatalogSidebar\nZone Arena"]
    CS --> CGRID["Catalog Grid\nFlatList of TileCard"]
    CGRID --> TCARD["TileCard\nimage + name"]

    CSBAR --> ZRC["ZoneRow Chips\nper surface row"]
    CSBAR --> PPK["PatternPicker\nkitchen + parking"]

    SS --> FL1["FlatList\nDesign cards"]
    IS --> FL2["FlatList\nInventory cards"]
    IS --> TG["ThumbnailGenerator\noffscreen 3D render"]
```

---

## Shared Components

```
Button          → used in: all screens
SearchBar       → used in: SavedDesigns, Inventory
RoleBadge       → used in: Dashboard, Admin
SkeletonLoader  → used in: loading states
SaveDesignModal → used in: Visualizer, Catalog
TileVizLogo     → used in: AppHeader, IntroScreen
FormInput       → used in: AuthScreen
```
