# Anvil — Client

The React frontend for Anvil. Runs on Vite + React 19 + TypeScript + Tailwind CSS.

## Prerequisites

- Node.js 20+
- npm 10+
- The Anvil server running on port 3000 (see `packages/server`)

## Setup

Install dependencies from the **repo root** (not from this directory):

```bash
npm install
```

## Environment

Create a `.env` file in this directory if you need to override the API URL:

```env
VITE_API_URL=http://localhost:3000/api
```

The default points to `http://localhost:3000/api` and works without a `.env` file for local development.

## Running

From the repo root:

```bash
npm run dev
```

The client starts at `http://localhost:5173`.

## Building

```bash
npm run build
```

Output goes to `dist/`.

## Testing

```bash
npm test
```

## Stack

- React 19
- TypeScript (strict mode)
- Tailwind CSS v3
- React Router v7
- Vite v8
