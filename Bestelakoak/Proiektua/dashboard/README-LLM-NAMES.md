# LLM Display Names Configuration

This document explains how to set up and use the dynamic LLM display names feature in the dashboard.

## Overview

The system now supports dynamic LLM display names from MongoDB. This means that you can:

1. Store display name mappings in MongoDB
2. Update display names without changing code
3. Add metadata about each LLM in a centralized database

## Setup Instructions

### 1. Environment Setup

Make sure your `.env.local` file has the MongoDB connection string:

```
MONGODB_URI=mongodb://localhost:27017
```

### 2. Load Initial LLM Metadata

Run the following command to load initial LLM metadata into MongoDB:

```powershell
cd dashboard
node scripts/load-llm-metadata.js
```

This will:
- Create the `llm_metadata` collection in the `llm_dashboard` database
- Insert display name mappings for common LLM models
- Add additional metadata such as provider and description

### 3. Verify API Endpoint

Once data is loaded, you can verify the endpoint is working by opening:
```
http://localhost:3000/api/llm-names
```

This should return a JSON object with normalized LLM names as keys and display names as values.

## How It Works

The system uses the following components:

1. **MongoDB Collection**: Stores LLM metadata with display name mappings
2. **API Endpoint**: `/api/llm-names` returns a mapping of normalized names to display names
3. **React Hook**: The component fetches display names on mount
4. **Fallback Logic**: If a name is not found in MongoDB, falls back to the default `getLlmDisplayName` function

## Adding New LLM Models

To add new LLM models or modify existing ones:

1. Edit the `scripts/load-llm-metadata.js` file to include the new model
2. Run the script again to reload the data
3. The dashboard will automatically use the new display names

## Data Structure

Each LLM metadata document includes:

- `normalizedName`: The normalized name used for matching (e.g., 'claude-3-opus')
- `displayName`: The user-friendly display name (e.g., 'Claude 3 Opus')
- `provider`: The company that created the model (e.g., 'Anthropic')
- `description`: Brief description of the model
- `capabilities`: Array of model capabilities/features

## Troubleshooting

If display names are not showing correctly:

1. Check MongoDB connection is working
2. Verify data exists in the `llm_metadata` collection
3. Check browser console for API errors
4. Ensure the normalized name used in your code matches the one in the database
