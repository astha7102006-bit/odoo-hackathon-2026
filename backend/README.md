# StockSense Backend

StockSense Inventory Management System Backend — Built for Odoo Hackathon 2026.

The backend is the **source of truth** for all inventory balances, operations, move history ledgers, and dashboard metrics.

---

## Tech Stack & Architecture

- **Runtime**: Node.js (v24 / v22+)
- **Framework**: Express.js
- **Database**: SQLite (ACID compliant with immediate transactions for zero race conditions)
- **CORS**: Enabled for seamless communication with the Vite/React frontend (`http://localhost:5173`)

---

## Project Structure

```
backend/
├── .env.example               # Template environment variables
├── .gitignore                 # Ignores node_modules, .env, *.db
├── package.json               # Dependencies & scripts
├── README.md                  # Documentation and API guide
├── server/
│   └── .env.example           # Monorepo / server convention template
├── src/
│   ├── index.js               # Server entry point
│   ├── app.js                 # Express application & middleware
│   ├── db/
│   │   ├── connection.js      # SQLite connection & schema initialization
│   │   └── seed.js            # Demo seed data (Steel Rods, Warehouses)
│   ├── routes/
│   │   ├── products.js        # GET /api/products
│   │   ├── locations.js       # GET /api/locations
│   │   ├── stock.js           # GET /api/stock
│   │   ├── operations.js      # POST /api/operations, POST /:id/validate, GET /api/operations
│   │   ├── moves.js           # GET /api/moves
│   │   └── dashboard.js       # GET /api/dashboard
│   └── services/
│       └── stockService.js    # Atomic stock mutations & business rules
└── test/
    └── demo_flow.test.js      # Automated test suite for demo flow & safety rules
```

---

## Quick Start & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a local `.env` file (optional, defaults to `PORT=5000` and `./stocksense.db`):
```bash
cp .env.example .env
```

### 3. Run the Server
```bash
npm start
```
For live reload during development:
```bash
npm run dev
```

Server will be running at: **`http://localhost:5000`**

### 4. Run Automated Verification Tests
```bash
npm test
```

---

## API Contract & Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List all catalog products |
| `GET` | `/api/locations` | List all locations (Main Warehouse, Production Rack) |
| `GET` | `/api/stock` | Current stock balances per product per location |
| `POST` | `/api/operations` | Create a new DRAFT operation (does not modify stock) |
| `POST` | `/api/operations/:id/validate` | Atomically validate operation and commit stock changes |
| `GET` | `/api/operations` | List all operations (newest first) |
| `GET` | `/api/moves` | Stock ledger / move history (audit trail) |
| `GET` | `/api/dashboard` | Aggregated dashboard KPI and stock summary |

---

## Core Business Rules & Safety

1. **RECEIPT**:
   - `POST /api/operations` creates a `DRAFT` receipt. Drafts **never** change stock.
   - When validated (`POST /api/operations/:id/validate`):
     - Increases stock at `destinationLocationId`.
     - Creates exactly one move history entry.
     - Operation transitions to `DONE`.

2. **DELIVERY**:
   - When validated, checks that `sourceLocationId` has sufficient stock.
   - If insufficient, aborts with `400 Bad Request` and no stock is changed.
   - If sufficient, subtracts quantity from source and creates 1 move entry.

3. **INTERNAL TRANSFER**:
   - Checks that source has sufficient stock.
   - Atomically subtracts from source and adds to destination.
   - Total company-wide inventory balance remains constant.

4. **ADJUSTMENT**:
   - Uses `countedQuantity` (physical count).
   - Computes `difference = countedQuantity - recordedQuantity`.
   - Sets stock at location to `countedQuantity`.
   - Records one ledger entry with the difference.

5. **SAFETY CONSTRAINTS**:
   - Operations marked `DONE` can **never** be validated again.
   - All mutations run within SQLite immediate transactions (`BEGIN IMMEDIATE ... COMMIT / ROLLBACK`).
   - Clean JSON error responses without stack traces.

---

## Hackathon Demo Flow Walkthrough (with curl)

### Step 1: Receive 100 kg Steel Rods into Main Warehouse
Create Draft:
```bash
curl -X POST http://localhost:5000/api/operations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RECEIPT",
    "productId": "prod-1",
    "quantity": 100,
    "destinationLocationId": "loc-1",
    "supplier": "Apex Steel Industries"
  }'
```
Validate:
```bash
curl -X POST http://localhost:5000/api/operations/<OPERATION_ID>/validate
```
*Result: Main Warehouse = 100 kg.*

### Step 2: Transfer 30 kg from Main Warehouse to Production Rack
```bash
# Create transfer draft
curl -X POST http://localhost:5000/api/operations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRANSFER",
    "productId": "prod-1",
    "quantity": 30,
    "sourceLocationId": "loc-1",
    "destinationLocationId": "loc-2"
  }'

# Validate
curl -X POST http://localhost:5000/api/operations/<OPERATION_ID>/validate
```
*Result: Main Warehouse = 70 kg, Production Rack = 30 kg.*

### Step 3: Deliver 10 kg from Production Rack
```bash
# Create delivery draft
curl -X POST http://localhost:5000/api/operations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DELIVERY",
    "productId": "prod-1",
    "quantity": 10,
    "sourceLocationId": "loc-2"
  }'

# Validate
curl -X POST http://localhost:5000/api/operations/<OPERATION_ID>/validate
```
*Result: Production Rack = 20 kg.*

### Step 4: Adjust Production Rack Physical Count to 18 kg
```bash
# Create adjustment draft
curl -X POST http://localhost:5000/api/operations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ADJUSTMENT",
    "productId": "prod-1",
    "destinationLocationId": "loc-2",
    "countedQuantity": 18
  }'

# Validate
curl -X POST http://localhost:5000/api/operations/<OPERATION_ID>/validate
```
*Expected Final State:*
- Main Warehouse: **70 kg**
- Production Rack: **18 kg**
- Total Stock: **88 kg**
- Adjustment Difference: **-2 kg**
