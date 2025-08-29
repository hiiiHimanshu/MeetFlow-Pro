# 🚀 MeetFlow Pro

**AI-powered meeting intelligence platform that transforms conversations into actionable insights, automated summaries, and trackable action items for teams.**

*"Where meetings flow into results."*

## ✨ Features

- 🤖 **AI-Powered Summarization** - Automatically generate comprehensive meeting summaries
- 📋 **Action Item Extraction** - Identify and track actionable tasks and decisions  
- 🔄 **Workflow Automation** - Convert meeting tasks into trackable items
- 📱 **Multi-Platform Support** - Web app with mobile-responsive design
- 🔗 **Integration Ready** - Connect with Notion, Slack, and other tools
- 📊 **Progress Monitoring** - Track completion rates and team accountability

## 🏗️ Architecture

- **Frontend**: Next.js 14 with React, TypeScript, and shadcn/ui components
- **Backend**: Node.js/Express API with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management
- **Storage**: S3-compatible storage for file uploads
- **Queue**: BullMQ for background job processing
- **Styling**: Tailwind CSS with modern design system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm
- Docker & Docker Compose
- PostgreSQL, Redis, MinIO

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/hiiiHimanshu/MeetFlow-Pro.git
cd MeetFlow-Pro
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure services**
```bash
docker-compose up -d
```

5. **Run the development servers**
```bash
pnpm dev
```

The application will be available at:
- **Web App**: http://localhost:3000
- **API**: http://localhost:4000
- **Worker**: Background processing service

## 📁 Project Structure

```
MeetFlow-Pro/
├── apps/
│   ├── web/          # Next.js frontend application
│   ├── api/          # Express.js backend API
│   └── worker/       # Background job processor
├── packages/
│   ├── components/   # shadcn/ui component library
│   ├── config/       # Shared configuration
│   ├── lib/          # Utility functions
│   ├── types/        # TypeScript type definitions
│   └── ui/           # UI component library
├── docker-compose.yml
└── README.md
```

## 🎯 Use Cases

- **Project Kickoff Meetings** - Capture scope, timeline, and deliverables
- **Weekly Team Standups** - Track progress and identify blockers
- **Client Presentations** - Document requirements and follow-ups
- **Strategic Planning** - Track decisions and implementation milestones

## 🔧 Development

### Available Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages for production
- `pnpm test` - Run test suite
- `pnpm lint` - Lint code with ESLint

### Adding New Components

```bash
cd packages/components
pnpm dlx shadcn@latest add [component-name]
```

## 📱 Screenshots

*Coming soon - Beautiful UI screenshots will be added here*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



## 🆘 Support

- **Documentation**: [Coming soon]
- **Issues**: [GitHub Issues](https://github.com/hiiiHimanshu/MeetFlow-Pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hiiiHimanshu/MeetFlow-Pro/discussions)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hiiiHimanshu/MeetFlow-Pro&type=Date)](https://star-history.com/#hiiiHimanshu/MeetFlow-Pro&Date)

---

**Built with ❤️ by the MeetFlow Pro team**

*Transform your meetings into actionable intelligence today!*
