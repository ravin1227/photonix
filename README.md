# Photonix

A self-hosted, AI-powered personal photo gallery with a Rails backend API and React Native mobile app.

## Project Structure

This is a monorepo containing:

- **`photonix-backend/`** - Rails 8.1 API backend
- **`photonix-mobile/`** - React Native mobile application

## Quick Start

### Backend Setup

```bash
cd photonix-backend
bundle install
rails db:create db:migrate
rails server
```

See `photonix-backend/README.md` for detailed setup instructions.

### Mobile App Setup

```bash
cd photonix-mobile
npm install
cd ios && pod install && cd ..
npm start
```

See `photonix-mobile/README.md` for detailed setup instructions.

## Documentation

- `TECH_STACK.md` - Technology stack overview
- `WIREFRAME_SPEC.md` - UI/UX wireframe specifications
- `photonix-backend/` - Backend-specific documentation
- `photonix-mobile/` - Mobile app-specific documentation

## Development

Both projects can be developed independently but share the same API contract. The mobile app connects to the backend API for authentication, photo management, albums, and more.

## License

[Add your license here]

