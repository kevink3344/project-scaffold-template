# Project Scaffold - Development Guidelines

## Project Overview
This is a React + TypeScript + Vite scaffold project designed to serve as a template for building new web applications.

## Design System

### Design Principles
- **Flat Design**: Clean, minimal aesthetics without shadows or gradients
- **Border Radius**: All interactive elements (buttons, cards, tables, inputs) use a consistent 3px border-radius
- **Color Palette**: See CSS variables in `src/index.css`

### Global Styles
All UI components follow the flat design system defined in `src/index.css`:
- **Buttons**: Use `.btn` class or standard `<button>` tags
- **Cards**: Use `.card`, `.card-header`, `.card-body`, `.card-footer` classes
- **Tables**: Available with `.table` styling
- **Inputs**: All form inputs automatically styled with flat design
- **Forms**: Use `.form-group` and label classes

### CSS Variables (3px Border Radius)
```css
--border-radius: 3px;
--primary: #007bff;
--success: #28a745;
--danger: #dc3545;
--warning: #ffc107;
--info: #17a2b8;
```

## Environment Configuration

### .env File Structure
The `.env` file contains placeholders for:
- `VITE_DB_SERVER`: Database server hostname/IP (displayed on welcome page)
- `VITE_DB_NAME`: Database name (displayed on welcome page)
- `VITE_API_URL`: API endpoint for backend communication

### Accessing Environment Variables
Use `import.meta.env.VITE_*` to access variables in React components:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
const dbServer = import.meta.env.VITE_DB_SERVER;
```

## Project Structure
```
project-scaffold/
├── src/
│   ├── App.tsx          # Welcome page component
│   ├── App.css          # App-specific styles
│   ├── index.css        # Global styles and component library
│   ├── main.tsx         # React entry point
│   └── assets/          # Images, SVGs, etc.
├── public/              # Static assets
├── .env                 # Environment variables
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── .github/
    └── copilot-instructions.md  # This file
```

## Development Commands
- `npm install`: Install dependencies (required before first run)
- `npm run dev`: Start development server with Hot Module Replacement
- `npm run build`: Build for production
- `npm run preview`: Preview production build locally

## Future Development Guidelines

### Creating New Components
1. Keep components focused and reusable
2. Apply flat design principles (use 3px border-radius)
3. Use CSS classes from `index.css` for styling
4. Create component-specific CSS files alongside .tsx files

### Adding New Features
1. Update `.env` file if new environment variables are needed
2. Follow the existing design system for consistency
3. Ensure all buttons, cards, and inputs use the flat design styles

### API Integration
1. Update `VITE_API_URL` in `.env` when configuring backend
2. Create API service layer in `src/services/` directory
3. Use environment variable for dynamic API base URL

## TypeScript Best Practices
- Define interfaces for all props and state
- Use strict typing throughout components
- Avoid `any` type; use unions or generics instead

## Notes
- This scaffold prioritizes simplicity and consistency
- The welcome page displays database configuration at the bottom
- Designed to be extended with additional features as needed
