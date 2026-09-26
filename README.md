## StockSense first demo flow
Receive 100 kg Steel Rods into Main Warehouse.
Transfer 30 kg to Production Rack.
Deliver 10 kg from Production Rack.
Adjust Production Rack to a physical count of 18 kg.
Expected final stock: Main Warehouse 70 kg; Production Rack 18 kg; total 88 kg.

## Integration rules
Draft operations do not change stock. Validating an operation changes stock once
and creates one move-history entry. An adjustment uses countedQuantity (the
physical count), not the amount to add or subtract.

## API contract
GET /api/products
GET /api/locations
GET /api/stock
POST /api/operations
POST /api/operations/:id/validate
GET /api/operations
GET /api/moves
GET /api/dashboard

Operation fields: type, productId, quantity, sourceLocationId,
destinationLocationId, supplier, countedQuantity, status.
Types: RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT.
Initial statuses: DRAFT, DONE.
