# Cinephage

A modern, self-hosted media acquisition and library management system. Think Radarr + Sonarr, rebuilt from scratch with a modern tech stack.

## Features

- **Content Discovery** - Browse and search movies/TV shows via TMDB integration
- **Multi-Indexer Search** - Search across multiple torrent indexers simultaneously (YTS, 1337x, EZTV, Torznab)
- **Smart Quality Scoring** - Sophisticated release scoring with customizable profiles (Best, Efficient, Compact, Micro)
- **Automated Downloads** - Grab releases and manage downloads via qBittorrent
- **Library Management** - Automatic file organization, metadata extraction, and duplicate detection
- **Monitoring** - Automated searches for missing content, quality upgrades, and new episodes
- **Real-time Updates** - Live download progress tracking and filesystem watching

## Tech Stack

- **Frontend**: SvelteKit 5 + Svelte 5 + TailwindCSS 4 + DaisyUI
- **Backend**: Node.js with SvelteKit server
- **Database**: SQLite via Drizzle ORM
- **External APIs**: TMDB (metadata), qBittorrent WebUI v2
- **Indexers**: Cardigann-based definitions (YAML)

## Requirements

- Node.js 20+
- qBittorrent with WebUI enabled
- TMDB API key (free at https://www.themoviedb.org/settings/api)
- ffprobe (optional, for media info extraction)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cinephage.git
cd cinephage

# Install dependencies
npm install

# Initialize the database
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Configuration

### First Run Setup

1. **TMDB API Key** - Go to Settings > Integrations and add your TMDB API key
2. **Download Client** - Add your qBittorrent connection (Settings > Download Clients)
3. **Root Folders** - Configure where your media files are stored (Settings > Root Folders)
4. **Indexers** - Enable indexers for searching (Settings > Integrations)

### Indexers

Cinephage has a built-in indexer system using Cardigann-style YAML definitions:

- **YTS** - Movie torrents (1080p/2160p)
- **EZTV** - TV show torrents
- **1337x** - General torrents
- **Torznab** - Native Torznab protocol support (can connect to your own Prowlarr/Jackett instances if desired)

All indexer logic runs natively within Cinephage - no external dependencies required.

### Quality Profiles

Four built-in scoring profiles:

- **Best** - Highest quality, largest files
- **Efficient** - Good quality/size balance
- **Compact** - Smaller files, good quality
- **Micro** - Smallest files, acceptable quality

## Development

```bash
# Run development server
npm run dev

# Type checking
npm run check

# Linting
npm run lint

# Run tests
npm run test

# Database commands
npm run db:push      # Push schema to database
npm run db:generate  # Generate migrations
npm run db:studio    # Open Drizzle Studio
```

## Project Structure

```
src/
├── routes/           # SvelteKit pages and API endpoints
│   ├── api/          # REST API endpoints
│   ├── movies/       # Movie browse/search pages
│   ├── tv/           # TV show pages
│   ├── queue/        # Download queue
│   ├── discover/     # Content discovery
│   └── settings/     # Configuration pages
├── lib/
│   ├── components/   # Reusable Svelte components
│   ├── server/       # Backend services
│   │   ├── db/       # Database schema and queries
│   │   ├── indexers/ # Torrent indexer system
│   │   ├── downloadClients/ # qBittorrent integration
│   │   ├── library/  # File scanning and matching
│   │   ├── monitoring/ # Automated search tasks
│   │   └── quality/  # Quality scoring system
│   └── utils/        # Utility functions
└── data/
    └── indexers/     # Cardigann YAML definitions
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Inspired by and learning from the excellent work of (reference implementations only - Cinephage runs standalone with no external \*arr dependencies):

- [Radarr](https://github.com/Radarr/Radarr)
- [Sonarr](https://github.com/Sonarr/Sonarr)
- [Prowlarr](https://github.com/Prowlarr/Prowlarr)
