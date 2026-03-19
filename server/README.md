# EchEal Server API Notes

## Prescription Management (Phase 1)

Base URL: `/api`

Authentication: All endpoints below require `Authorization: Bearer <token>`.

### Doctor Endpoints

#### Create Prescription
- Method: `POST`
- Path: `/doctor/prescriptions`
- Body:

```json
{
  "patientId": "6650f1f3f2f3c11a67b01111",
  "appointmentId": "6650f1f3f2f3c11a67b02222",
  "status": "issued",
  "notes": "After meals",
  "medications": [
    {
      "medicationName": "Paracetamol 500mg",
      "dosage": "1 tablet",
      "frequency": "Twice daily",
      "durationDays": 5,
      "quantity": 10,
      "instructions": "Take after food",
      "inventoryItem": "6650f1f3f2f3c11a67b03333"
    }
  ]
}
```

#### List My Prescriptions
- Method: `GET`
- Path: `/doctor/prescriptions`
- Query: `page`, `limit`, `sortOrder`, `search`, `status`

#### Get Prescription By ID
- Method: `GET`
- Path: `/doctor/prescriptions/:prescriptionId`

#### Update Prescription
- Method: `PATCH`
- Path: `/doctor/prescriptions/:prescriptionId`
- Body (partial allowed): `status`, `notes`, `medications`

#### Cancel Prescription
- Method: `PATCH`
- Path: `/doctor/prescriptions/:prescriptionId/cancel`

#### List Patient Store Purchases (Doctor)
- Method: `GET`
- Path: `/doctor/patient-purchases`
- Query: `page`, `limit`, `sortOrder`, `search`

Behavior:
- Returns purchases made by patients linked to the doctor through appointments.
- Helps doctors track what their patients bought from inventory.

### Patient Endpoints

#### List My Prescriptions
- Method: `GET`
- Path: `/patient/prescriptions`
- Query: `page`, `limit`, `sortOrder`, `search`, `status`

#### Get My Prescription By ID
- Method: `GET`
- Path: `/patient/prescriptions/:prescriptionId`

#### List Store Inventory Items
- Method: `GET`
- Path: `/patient/store/items`
- Query: `page`, `limit`, `sortOrder`, `search`, `category`

Behavior:
- Returns only in-stock inventory (`quantity > 0`).
- Supports category filter: `medicine`, `equipment`, `supplies`.

#### Create Store Purchase
- Method: `POST`
- Path: `/patient/store/purchases`
- Body:

```json
{
  "items": [
    {
      "inventoryItemId": "6650f1f3f2f3c11a67b03333",
      "quantity": 2
    }
  ],
  "notes": "Need for home use"
}
```

Behavior:
- Decrements stock for all requested items.
- Rejects purchase if any item has insufficient stock.
- Uses rollback so partial stock deductions are restored on failure.

#### List My Store Purchases
- Method: `GET`
- Path: `/patient/store/purchases`
- Query: `page`, `limit`, `sortOrder`

### Admin Endpoints

#### List All Prescriptions
- Method: `GET`
- Path: `/admin/prescriptions`
- Query: `page`, `limit`, `sortOrder`, `search`, `status`

#### Get Prescription By ID
- Method: `GET`
- Path: `/admin/prescriptions/:prescriptionId`

#### Mark Prescription Dispensed
- Method: `PATCH`
- Path: `/admin/prescriptions/:prescriptionId/dispense`

#### List Store Purchases
- Method: `GET`
- Path: `/admin/inventory/purchases`
- Query: `page`, `limit`, `sortOrder`, `search`

#### Inventory Movement Feed
- Method: `GET`
- Path: `/admin/inventory/movements`
- Query: `limit`, `search`

Behavior:
- Merges stock outflow from:
  - Prescription dispensing (`issued -> dispensed` inventory deductions)
  - Direct patient store purchases
- Gives admins a consolidated "where inventory goes" view.

#### Import Inventory Stock From CSV
- Method: `POST`
- Path: `/admin/inventory/import-csv`
- Body:

```json
{
  "csvData": "name,category,quantity,unit,lowStockThreshold,supplierName\nParacetamol 500mg,medicine,25,tablets,40,MediSupply Co."
}
```

Behavior:
- Required CSV columns: `name`, `category`, `quantity`, `unit`
- Optional CSV columns: `lowStockThreshold`, `supplierName`
- For existing items (same `name` + `category`), stock is incremented by `quantity`.
- For new items, records are created.
- Returns import summary with row-level errors for skipped lines.

Behavior:
- Only prescriptions in `issued` status can be dispensed.
- Status is moved to `dispensed`.
- `dispensedAt` and `dispensedBy` are recorded.
- If any medication includes `inventoryItem`, stock is decremented by `quantity`.
- Dispense is rejected if linked stock is missing or insufficient.

### Status Rules

Allowed statuses:
- `draft`
- `issued`
- `dispensed`
- `cancelled`

Doctor transitions:
- `draft -> issued`
- `draft -> cancelled`
- `issued -> cancelled`

Admin transitions:
- `issued -> dispensed`

Blocked transitions:
- Any transition from `dispensed` or `cancelled`
- Doctor setting status to `dispensed`

### Standard Success Shape

List endpoints use the existing paginated response structure:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Common Error Responses

- `400`: validation errors or invalid status transitions
- `401`: missing/invalid token
- `403`: role not allowed
- `404`: record not found
- `500`: server error
