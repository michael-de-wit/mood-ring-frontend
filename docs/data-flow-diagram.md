# Architecture   Diagrams

## Data Flow

```mermaid
graph TB
    subgraph External["External APIs"]
        OuraAPI[Oura API]
        OuraHR["Endpoint: /heartrate"]
        OuraSession["Endpoint: /session"]
    end

    subgraph Backend["Backend-v2 Python/FastAPI"]
        subgraph Poller[Polling Service]
            HRPoller[Heartrate Polling]
            SessionPoller[Session Polling]
        end
        HRTransform[Heart Rate Transform]
        SessionTransform[Session Data Transform]
        PydanticModel[BiosensorData Model<br>Raw Data]
        BiosensorColl[Biosensor Data Handler]
        DBTrigger{New data<br/>in DB?}
        WSEndpoint[WebSocket: /ws/ouratimeseries]
        RESTEndpoint[REST: /ouratimeseries/live]
    end

    subgraph Database["Database Layer"]
        MongoDB[(MongoDB Database)]
    end

    subgraph Frontend["Frontend React/TypeScript"]
        WSHook[WebSocket Connection<br/>useBiosensorWebSocket Hook]
        LiveModeCheck{Live mode?}
        BiosensorDataState[Biosensor Data State]

        subgraph BiosensorPlot[BiosensorPlot Component]
            DateInputs[Date Range Inputs]
            SeriesCheckboxes[Data Series Checkboxes]
            PlotlyChart[Plotly.js Chart]
        end
    end

    OuraAPI --> OuraHR
    OuraAPI --> OuraSession
    HRPoller -.polls for new data.-> OuraHR
    OuraHR -.returns data.-> HRPoller
    SessionPoller -.polls for new data.-> OuraSession
    OuraSession -.returns data.-> SessionPoller
    HRPoller --> HRTransform
    SessionPoller --> SessionTransform
    HRTransform --> PydanticModel
    SessionTransform --> PydanticModel
    PydanticModel --> BiosensorColl
    BiosensorColl <--> MongoDB
    BiosensorColl --> DBTrigger
    DBTrigger -->|Yes| WSEndpoint

    WSEndpoint -.Send notification.-> WSHook
    WSHook --> LiveModeCheck
    DateInputs -.provides date range.-> LiveModeCheck
    LiveModeCheck -->|Yes| RESTEndpoint
    RESTEndpoint -.queries with date range.-> BiosensorColl
    BiosensorColl -.returns filtered data.-> RESTEndpoint
    RESTEndpoint --> BiosensorDataState
    DateInputs -.onChange.-> RESTEndpoint
    BiosensorDataState -.Filters by Datetime.-> PlotlyChart
    SeriesCheckboxes -.Filters by Measurement Type.-> PlotlyChart

    style OuraAPI fill:#c0392b
    style OuraHR fill:#c0392b
    style OuraSession fill:#c0392b
    style MongoDB fill:#16a085
    style DBTrigger fill:#176161
    style LiveModeCheck fill:#8C4C1F
    style WSEndpoint fill:#176161
    style RESTEndpoint fill:#176161
    style BiosensorPlot fill:#8C4C1F
```

### Legend

- **Solid arrows (→)**: Data flow
- **Dotted arrows (-.->)**: Control flow, triggers, or metadata (e.g., "provides date range", "onChange")
- **Bidirectional arrows (<-->)**: Two-way communication
- **Dark Red (#c0392b)**: External APIs (Oura API and endpoints)
- **Teal (#16a085)**: Database layer
- **Dark Teal (#176161)**: Backend endpoints and decision points
- **Brown (#8C4C1F)**: Frontend UI components and decision points
- **Decision diamonds {}**: Conditional logic points

## Database Architecture

```mermaid
graph TB
    subgraph MongoDB["MongoDB Database"]
        subgraph Collections["Collections"]
            ConsolidatedColl[(consolidated_biosensor_data)]
            RawHRColl[(raw_heartrate)]
            RawSessionColl[(raw_session)]
        end
    end

    subgraph Transform["Data Transformation"]
        HRTransform[Heart Rate Transform]
        SessionTransform[Session Transform]
    end

    RawHRColl --> HRTransform
    RawSessionColl --> SessionTransform

    HRTransform --> ConsolidatedColl
    SessionTransform --> ConsolidatedColl

    style MongoDB fill:#16a085
    style ConsolidatedColl fill:#45b7a0
    style RawHRColl fill:#e67e22
    style RawSessionColl fill:#e67e22
    style Transform fill:#2980b9
```

### Database Collections

#### 1. **consolidated_biosensor_data** (Processed Data)
Primary collection for querying and visualization. Contains normalized, time-series biosensor data.

**Example Document:**
```json
{
  "_id": "695c0207404b8d8589393553",
  "timestamp": "2025-12-16T01:07:42.002Z",
  "measurement_type": "heartrate",
  "measurement_value": 48,
  "measurement_unit": "bpm",
  "sensor_mode": "heartrate",
  "data_source": "live",
  "device_source": "oura_ring_4",
  "source_endpoint": "usercollection/heartrate",
  "inserted_at": "2026-01-05T18:25:11.627620+00:00"
}
```

**Indexes:**
- `timestamp` (ascending) - for time-range queries
- `measurement_type` (ascending) - for filtering by type
- `(timestamp, measurement_type)` (compound) - optimized filtered queries

**Query Patterns:**
- Time-range: `find({ timestamp: { $gte: start, $lte: end } })`
- Type-filtered: `find({ measurement_type: 'heartrate', timestamp: { $gte: start } })`
- Live data: `find({ timestamp: { $gte: start } }).limit(10000)`

#### 2. **raw_heartrate** (Raw API Data)
Stores raw responses from Oura API `/heartrate` endpoint. Used for data archival and reprocessing.

**Example Document:**
```json
{
  "_id": "6954b70c93934cd13492481e",
  "data": {
    "data": [
      {
        "timestamp": "2025-12-16T01:07:42.002Z",
        "bpm": 48,
        "source": "live"
      }
      // ... 11,698 total entries
    ]
  },
  "inserted_at": "2025-12-31T05:39:24.722544+00:00",
  "source": "oura_api",
  "endpoint": "usercollection/heartrate"
}
```

**Purpose:**
- Archive raw API responses
- Enable data reprocessing if transformation logic changes
- Debugging and data validation

#### 3. **raw_session** (Raw Session Data)
Stores raw responses from Oura API `/session` endpoint containing workout/activity sessions.

**Example Document:**
```json
{
  "_id": "6959891bb6a3b4f1c07f171e",
  "data": {
    "data": [
      {
        "id": "292a1e36-cdf0-4a2c-a227-e9c0242f2c70",
        "day": "2025-12-28",
        "start_datetime": "2025-12-28T08:31:18.000-08:00",
        "end_datetime": "2025-12-28T08:41:18.000-08:00",
        "type": "meditation",
        "mood": "same",
        "heart_rate": { 
            "interval": 5,
            "items": [
                50.9,
                50.7,
                /* ... */
            ]
         },
        "heart_rate_variability": {
            "interval": 5,
            "items": [
                97,
                96,
                /* ... */
            ]
        },
        "motion_count": { 
            "interval": 5,
            "items": [
                0,
                12,
                /* ... */
            ]
            /* ... */ 
            }
      }
      // ... 14 total sessions
    ],
    "next_token": null
  },
  "inserted_at": "2026-01-03T21:24:43.497404+00:00",
  "source": "oura_api",
  "endpoint": "usercollection/session"
}
```

**Purpose:**
- Store complete session data including HRV, motion, and HR during activities
- Track workout types and mood data
- Enable future feature development using session metadata

## Measurement Types Flow

```mermaid
graph TD
    subgraph "Backend Sources"
        OuraHR[Oura /heartrate<br/>Every 5 min]
        OuraSession[Oura /session<br/>After workouts]
    end

    subgraph "Measurement Types"
        HR[heartrate<br/>unit: bpm]
        HRSession[heartrate_session<br/>unit: bpm]
        HRV[hrv<br/>unit: ms]
        Motion[motion_count<br/>unit: count]
    end

    subgraph "Frontend Display"
        RedLine[Red Line:<br/>Heart Rate Non-Session]
        OrangeLine[Orange Line:<br/>Heart Rate Session]
        BlueLine[Blue Line:<br/>HRV]
        GreenLine[Green Line:<br/>Motion Count]
    end

    OuraHR --> HR
    OuraSession --> HRSession
    OuraSession --> HRV
    OuraSession --> Motion

    HR --> RedLine
    HRSession --> OrangeLine
    HRV --> BlueLine
    Motion --> GreenLine

    style HR fill:#c0392b
    style HRSession fill:#d35400
    style HRV fill:#2980b9
    style Motion fill:#27ae60
```

## Real-time Update Flow

```mermaid
sequenceDiagram
    participant Oura as Oura API
    participant Poller as Backend Poller
    participant Mongo as MongoDB
    participant WS as WebSocket Server
    participant WSHook as useBiosensorWebSocket
    participant Plot as BiosensorPlot

    Note over Oura,Mongo: Data Collection Phase
    Poller->>Oura: Poll /heartrate & /session
    Oura-->>Poller: New biosensor data
    Poller->>Mongo: Insert BiosensorData document

    Note over Mongo,WSHook: Notification Phase
    Mongo->>WS: Data inserted (trigger)
    WS->>WSHook: Send notification<br/>{type: 'heartrate_update'}<br/>or {type: 'session_update'}

    Note over WSHook,Plot: Fetch & Display Phase
    WSHook->>WSHook: Detect notification in Live mode
    WSHook->>Poller: GET /ouratimeseries/live<br/>?start_datetime=...&end_datetime=NOW
    Poller->>Mongo: Query biosensor_data collection
    Mongo-->>Poller: Return documents (max 10000)
    Poller-->>WSHook: {data: [...], count: 150, limit: 10000}
    WSHook->>WSHook: Update biosensorTimeSeries state
    WSHook->>Plot: Trigger re-render via props
    Plot->>Plot: Auto-fetch if Live mode
    Plot->>Plot: Filter by measurement_type
    Plot->>Plot: Convert UTC → PST (UTC-8)
    Plot->>Plot: Extract values & timestamps
    Plot->>Plot: Render Plotly chart with selected series
```

## API Query Parameters

```mermaid
graph LR
    subgraph "User Input"
        StartInput[Start DateTime Input<br/>2026-01-04T14:30]
        EndInput[End DateTime Input<br/>2026-01-05T14:30]
        LiveCheckbox[Live Checkbox<br/>checked]
    end

    subgraph "Query Construction"
        StartISO[start_datetime:<br/>2026-01-04T22:30:00Z]
        EndISO[end_datetime:<br/>2026-01-05T22:30:00Z or NOW]
    end

    subgraph "API Request"
        URL["/ouratimeseries/live<br/>?start_datetime=...&end_datetime=..."]
        Headers["ngrok-skip-browser-warning: true"]
    end

    subgraph "API Response"
        Response["
        {
          data: BiosensorEntry[],
          count: 150,
          limit: 10000
        }
        "]
    end

    StartInput --> StartISO
    EndInput --> EndISO
    LiveCheckbox -.overrides.-> EndISO

    StartISO --> URL
    EndISO --> URL
    Headers --> URL

    URL --> Response
```