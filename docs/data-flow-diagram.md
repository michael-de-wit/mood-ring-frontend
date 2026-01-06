# Data Flow Diagram

## Complete System Data Flow

```mermaid
graph TB
    subgraph External["External APIs"]
        OuraAPI[Oura API]
        OuraHR["heartrate endpoint"]
        OuraSession["session endpoint"]
    end

    subgraph Backend["Backend-v2 Python/FastAPI"]
        Poller[Polling Service]
        HRTransform[Heart Rate Transform]
        SessionTransform[Session Data Transform]
        PydanticModel[BiosensorData Model]
        MongoDB[(MongoDB Database)]
        BiosensorColl[biosensor_data collection]
        WSEndpoint[WebSocket: /ws/ouratimeseries]
        RESTEndpoint[REST: /ouratimeseries/live]
    end

    subgraph Frontend["Frontend React/TypeScript"]
        WSHook[useBiosensorWebSocket Hook]
        WSConnection[WebSocket Connection]
        BiosensorState[biosensorTimeSeries State]
        CustomDataState[customData State]
        TypeFilter[Filter by measurement_type]
        TimeConvert[UTC to PST Conversion]
        BiosensorPlot[BiosensorPlot Component]
        DateInputs[Date Range Inputs]
        SeriesCheckboxes[Data Series Checkboxes]
        PlotlyChart[Plotly.js Chart]
    end

    OuraAPI --> OuraHR
    OuraAPI --> OuraSession
    OuraHR --> Poller
    OuraSession --> Poller
    Poller --> HRTransform
    Poller --> SessionTransform
    HRTransform --> PydanticModel
    SessionTransform --> PydanticModel
    PydanticModel --> MongoDB
    MongoDB --> BiosensorColl

    BiosensorColl -.triggers.-> WSEndpoint
    WSEndpoint --> WSConnection
    WSConnection --> WSHook
    WSHook --> RESTEndpoint
    RESTEndpoint -.queries.-> BiosensorColl
    RESTEndpoint --> WSHook
    WSHook --> BiosensorState

    DateInputs -.onChange.-> RESTEndpoint
    RESTEndpoint --> CustomDataState
    BiosensorState --> TypeFilter
    CustomDataState --> TypeFilter
    TypeFilter --> TimeConvert
    TimeConvert --> PlotlyChart

    BiosensorPlot --> DateInputs
    BiosensorPlot --> SeriesCheckboxes
    BiosensorPlot --> PlotlyChart
    SeriesCheckboxes -.controls.-> TypeFilter

    style OuraAPI fill:#ff6b6b
    style MongoDB fill:#4ecdc4
    style WSEndpoint fill:#95e1d3
    style RESTEndpoint fill:#95e1d3
    style BiosensorPlot fill:#ffe66d
    style PlotlyChart fill:#a8e6cf
```

## Data Transformation Details

```mermaid
graph LR
    subgraph "Oura API Response"
        OuraHRData["
        {
          bpm: 72,
          timestamp: '2026-01-05T10:30:00Z',
          source: 'awake'
        }
        "]
    end

    subgraph "Backend Transform"
        Transform["
        measurement_type: 'heartrate'
        measurement_value: 72
        measurement_unit: 'bpm'
        sensor_mode: 'awake'
        data_source: 'oura'
        device_source: 'oura_ring_4'
        "]
    end

    subgraph "MongoDB Document"
        MongoDoc["
        {
          timestamp: ISODate(...),
          measurement_type: 'heartrate',
          measurement_value: 72,
          measurement_unit: 'bpm',
          sensor_mode: 'awake',
          data_source: 'oura',
          device_source: 'oura_ring_4'
        }
        "]
    end

    subgraph "Frontend Type"
        TSType["
        BiosensorEntry {
          timestamp: '2026-01-05T10:30:00Z',
          measurement_type: 'heartrate',
          measurement_value: 72,
          measurement_unit: 'bpm',
          sensor_mode: 'awake',
          data_source: 'oura',
          device_source: 'oura_ring_4'
        }
        "]
    end

    subgraph "Display Processing"
        Display["
        Time: '2026-01-05T02:30:00' (PST)
        Value: 72
        Series: 'Heart Rate (Non-Session)'
        Color: red
        "]
    end

    OuraHRData --> Transform
    Transform --> MongoDoc
    MongoDoc --> TSType
    TSType --> Display
```

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

    style HR fill:#ff6b6b
    style HRSession fill:#ffa07a
    style HRV fill:#87ceeb
    style Motion fill:#90ee90
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

## Live Mode Auto-Refresh Flow

```mermaid
sequenceDiagram
    participant User
    participant DateInputs as Date Range Inputs
    participant LiveCheckbox as Live Mode Checkbox
    participant Plot as BiosensorPlot
    participant WSHook as useBiosensorWebSocket
    participant API as Backend API

    Note over User,Plot: User Configures Date Range
    User->>DateInputs: Set start datetime
    User->>LiveCheckbox: Check "Live" mode

    Note over Plot,API: Initial Fetch (useEffect triggered)
    DateInputs->>Plot: onChange event
    Plot->>Plot: useEffect([startDatetime, endDatetime, isLiveMode])
    Plot->>API: GET /ouratimeseries/live<br/>?start_datetime=...&end_datetime=NOW
    API-->>Plot: Return biosensor data
    Plot->>Plot: Update customData state
    Plot->>Plot: Render chart

    Note over WSHook,Plot: WebSocket Notification Arrives
    WSHook->>WSHook: Receive {type: 'heartrate_update'}
    WSHook->>WSHook: Update biosensorTimeSeries state

    Note over Plot,API: Auto-Refresh in Live Mode
    Plot->>Plot: useEffect([biosensorTimeSeries]) triggers
    Plot->>Plot: Check: isLiveMode && biosensorTimeSeries changed?
    Plot->>API: GET /ouratimeseries/live<br/>?start_datetime=...&end_datetime=NOW
    API-->>Plot: Return updated biosensor data
    Plot->>Plot: Update customData state
    Plot->>Plot: Re-render with latest data

    Note over User,Plot: User sees live updates automatically
```

## State Management Architecture

```mermaid
graph TB
    subgraph "useBiosensorWebSocket Hook State"
        WSState[biosensorTimeSeries<br/>Last 24 hours via WebSocket]
        Connected[isConnected<br/>WebSocket connection status]
        Error[error<br/>Error messages]
    end

    subgraph "BiosensorPlot Component State"
        Custom[customData<br/>User-selected date range]
        Live[isLiveMode<br/>Live mode enabled?]
        Start[startDatetime<br/>Range start]
        End[endDatetime<br/>Range end]
        Series[selectedSeries<br/>Which data to show]
        Loading[isLoading<br/>Fetch in progress?]
    end

    subgraph "Data Selection Logic"
        Decision{customData<br/>exists?}
        UseCustom[Use customData]
        UseWS[Use biosensorTimeSeries]
    end

    subgraph "Display Pipeline"
        Filter[Filter by measurement_type]
        Convert[UTC → PST conversion]
        Extract[Extract timestamps & values]
        Render[Render Plotly chart]
    end

    Custom --> Decision
    WSState --> Decision
    Decision -->|Yes| UseCustom
    Decision -->|No| UseWS

    UseCustom --> Filter
    UseWS --> Filter

    Filter --> Convert
    Convert --> Extract
    Extract --> Render

    Series -.controls.-> Filter
    Live -.determines.-> Decision

    style Custom fill:#ffe66d
    style WSState fill:#95e1d3
    style Decision fill:#ff6b6b
    style Render fill:#a8e6cf
```

## File Organization

```mermaid
graph TB
    subgraph "Project Structure"
        subgraph "Types"
            BiosensorTS[biosensor.ts<br/>- BiosensorEntry<br/>- DataSeries]
        end

        subgraph "Constants"
            ApiTS[api.ts<br/>- API_ENDPOINTS<br/>- API_HEADERS<br/>- API_LIMITS]
        end

        subgraph "Hooks"
            WebSocketHook[useBiosensorWebSocket.tsx<br/>- WebSocket connection<br/>- Data fetching<br/>- State management]
        end

        subgraph "Components"
            PlotComponent[BiosensorPlot.tsx<br/>- Date controls<br/>- Series selection<br/>- Data visualization]
        end

        subgraph "App"
            AppTSX[App.tsx<br/>- Hook consumption<br/>- Component rendering]
        end
    end

    BiosensorTS -.types.-> WebSocketHook
    BiosensorTS -.types.-> PlotComponent
    ApiTS -.config.-> WebSocketHook
    ApiTS -.config.-> PlotComponent
    WebSocketHook -.data.-> AppTSX
    AppTSX -.props.-> PlotComponent
```

## Legend

- **Solid arrows (→)**: Data flow
- **Dotted arrows (-.->)**: Type definitions, configuration, or triggers
- **Red**: External APIs
- **Teal**: Backend services
- **Yellow**: Frontend components
- **Green**: Data display