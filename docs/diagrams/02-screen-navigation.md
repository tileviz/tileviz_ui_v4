# Screen Navigation Flow

```mermaid
flowchart TD
    START([App Launch]) --> SPLASH[SplashScreen\nanimation]
    SPLASH --> BOOT{Token in\nStorage?}

    BOOT -->|Yes| GETME[GET /auth/me]
    GETME -->|Success| MAIN
    GETME -->|401 Fail| INTRO

    BOOT -->|No| INTRO[IntroScreen\nWelcome]
    INTRO --> AUTH[AuthScreen\nLogin / Register]
    AUTH -->|Authenticated| MAIN

    MAIN[Main App\nAppNavigator] --> TABS

    subgraph TABS["Tab Navigation (lazy persistent mount)"]
        VIZ[VisualizerScreen\n3D Room View]
        CAT[CatalogScreen\nTile Grid + Zone Arena]
        SAVED[SavedDesignsScreen\nDesign Library]
        INV[InventoryScreen\nShop Inventory]
        DASH[DashboardScreen\nStats + Management]
        ADMIN[AdminScreen\nPlatform Admin]
    end

    VIZ -.->|Save Design| SAVED
    CAT -.->|Open Sidebar| ZONE[CatalogSidebar\nZone Arena]
    ZONE -.->|Tap row| CAT
    CAT -.->|Tap tile| VIZ
    SAVED -.->|Load design| VIZ
    INV -.->|Load design| VIZ

    DASH -.->|Admin only| ADMIN
```

---

## Screen Persistence

```mermaid
stateDiagram-v2
    [*] --> Visualizer : app opens (default)
    Visualizer --> Catalog : tap tab
    Catalog --> Visualizer : tap tab
    Catalog --> Saved : tap tab
    Saved --> [*] : screen NEVER unmounts\nonce visited
    note right of Saved : display:none hides it\nbut keeps it mounted\nand data in memory
```
