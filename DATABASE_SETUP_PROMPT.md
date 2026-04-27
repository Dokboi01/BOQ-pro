# Database Setup Prompt — For Gemini / DeepSeek

Copy and paste the following prompt into Gemini or DeepSeek to have it set up the Firestore database for BOQ Pro:

---

```
You are helping set up a Firebase Firestore database for a BOQ (Bill of Quantities) web application called "BOQ Pro".

## Firebase Project
- Project ID: boq-pro-72332
- Firebase Console: https://console.firebase.google.com/project/boq-pro-72332/firestore

## Task 1: Create the Firestore Database
Go to the Firebase Console link above and:
1. Click "Create database"
2. Choose "Start in test mode" (for now)
3. Select location: eur3 (Europe-west)
4. Click "Done"

## Task 2: Create Required Composite Index
After the database is created, go to the Indexes tab and create:
- Collection: `projects`
- Fields: `user_id` (Ascending), `created_at` (Descending)
- This is needed for the query: `query(collection(db, 'projects'), where('user_id', '==', uid), orderBy('created_at', 'desc'))`

## Task 3: Apply Security Rules
Replace the default rules with these:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /projects/{projectId} {
      allow read: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        resource.data.collaborator_ids.hasAny([request.auth.token.email.lower()]) ||
        resource.data.company_key == request.auth.token.company_key
      );
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.user_id == request.auth.uid;
    }

    match /settings/{settingId} {
      allow read, write: if request.auth != null && settingId.startsWith(request.auth.uid);
    }

    match /materials/{materialId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /market_indices/{indexId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## Task 4: Seed Initial Data
The app needs initial data in the `materials` and `market_indices` collections. Create a script or manually add the following data:

### Materials Collection (sample entries):
Add these documents to the `materials` collection:

1. { name: "OPC Cement (50kg)", category: "Binder", price: 12500, unit: "Bag", trend: "up", benchmark: 11800, range: "₦11,200 - ₦13,500", delta: "+4.2%", history: [11000, 11500, 11800, 12500], usage: "Primary binder for all concrete works, plastering, and block making.", regions: { Lagos: 12500, Abuja: 13200, "Port Harcourt": 12900, Kano: 13800, Enugu: 13000 } }

2. { name: "Sharp Sand (Clean)", category: "Aggregates", price: 28000, unit: "Ton", trend: "stable", benchmark: 28000, range: "₦26,000 - ₦30,000", delta: "0.0%", history: [27500, 28000, 28000, 28000], usage: "Essential for concrete production and mortar mixes.", regions: { Lagos: 28000, Abuja: 30000, "Port Harcourt": 29000, Ibadan: 26000 } }

3. { name: "Granite (20mm)", category: "Aggregates", price: 35000, unit: "Ton", trend: "up", benchmark: 32000, range: "₦30,000 - ₦38,000", delta: "+3.5%", history: [30000, 31000, 32000, 35000], usage: "Coarse aggregate for structural concrete mixing.", regions: { Lagos: 35000, Abuja: 37000, "Port Harcourt": 36000, Ibadan: 32000 } }

4. { name: "Reinforcement Steel (12mm)", category: "Metal", price: 1150000, unit: "Ton", trend: "down", benchmark: 1200000, range: "₦1,120,000 - ₦1,250,000", delta: "-2.1%", history: [1250000, 1220000, 1200000, 1150000], usage: "High-tensile reinforcement for structural concrete elements.", regions: { Lagos: 1150000, Abuja: 1180000, "Port Harcourt": 1175000, Kano: 1200000 } }

5. { name: "9-Inch Hollow Block", category: "Masonry", price: 650, unit: "Block", trend: "up", benchmark: 580, range: "₦580 - ₦720", delta: "+5.8%", history: [520, 550, 580, 650], usage: "Load-bearing and non-load-bearing external and internal walls.", regions: { Lagos: 650, Abuja: 700, "Port Harcourt": 680, Kano: 620, Ibadan: 600 } }

6. { name: "Laterite (Filling)", category: "Earthworks", price: 12000, unit: "m³", trend: "stable", benchmark: 12000, range: "₦10,000 - ₦14,000", delta: "0.0%", history: [11500, 12000, 12000, 12000], usage: "Backfilling and sub-grade material for road construction.", regions: { Lagos: 12000, Abuja: 13000, "Port Harcourt": 12500, Ibadan: 11000 } }

7. { name: "Aluminium Long-Span Roofing (0.55mm)", category: "Roofing", price: 3800, unit: "m²", trend: "up", benchmark: 3500, range: "₦3,300 - ₦4,200", delta: "+4.5%", history: [3100, 3300, 3500, 3800], usage: "Industrial and commercial roofing; low-pitch roof covering.", regions: { Lagos: 3800, Abuja: 4000, "Port Harcourt": 3900 } }

8. { name: "Emulsion Paint (20L)", category: "Finishes", price: 28500, unit: "Bucket", trend: "up", benchmark: 26000, range: "₦24,000 - ₦31,000", delta: "+3.9%", history: [23000, 24500, 26000, 28500], usage: "Interior wall and ceiling paint finish — premium washable emulsion.", regions: { Lagos: 28500, Abuja: 30000, "Port Harcourt": 29500 } }

### Market Indices Collection:
Add these documents to the `market_indices` collection:

1. { label: "Overall CMCI", val: 148.3, delta: "+2.1%", trend: "up" }
2. { label: "Binder Index", val: 156.2, delta: "+3.2%", trend: "up" }
3. { label: "Metal Index", val: 128.9, delta: "-0.8%", trend: "down" }
4. { label: "Aggregates", val: 115.4, delta: "+0.2%", trend: "up" }
5. { label: "Masonry Index", val: 138.7, delta: "+5.5%", trend: "up" }
6. { label: "Surface & Roads", val: 162.4, delta: "+6.8%", trend: "up" }
7. { label: "MEP Index", val: 134.1, delta: "+3.7%", trend: "up" }
8. { label: "Finishes Index", val: 122.9, delta: "+1.9%", trend: "up" }

## Important Notes
- The app uses Firestore in Native mode (not Datastore mode)
- The app is local-first: it uses IndexedDB (Dexie) locally and syncs to Firestore
- All Firestore operations have try/catch error handling, so the app won't crash if Firestore is unavailable
- The `seed.mjs` file in the project is an OLD Supabase seed script — ignore it, the project now uses Firebase/Firestore
```
