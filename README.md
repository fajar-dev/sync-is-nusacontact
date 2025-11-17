# Sync IS NusaContact

Data synchronization service between Information System (IS) and NusaContact. This service is used to sync customer contact data from IS to NusaContact.

## 📦 Installation

### Prerequisites

Make sure you have installed:
- [Bun](https://bun.sh/) latest version

### Installation Steps

1. Clone this repository:
```bash
git clone https://github.com/fajar-dev/sync-is-nusacontact.git
cd sync-is-nusacontact
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment variables (create `.env` file):
```env
# API Configuration
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=is

NUSACONTACT_SYNC_CONTACT_API_URL= http://nusacontact.com/api/contacts
NUSACONTACT_API_KEY=
NUSACONTACT_SYNC_CONTACT_MAX_ATTEMPTS=16
```

## 🚀 Usage

### Development Mode

Run the application in development mode:
```bash
bun run dev
```

Build the application:
```bash
bun run build
```

### Production Mode

Run the application in production mode:
```bash
bun run dist/main.js
```

## 📝 API Documentation

### Synchronization Endpoint

#### POST /sync-is-nusacontact
Perform contact data synchronization

**Request Body:**
```json
{
  "contactNumber": "08123456789",
  "custIds": "123,456,789",
  "contactName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contact created successfully",
}
```

