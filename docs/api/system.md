# System Monitoring API

## Overview

The System Monitoring API provides endpoints for monitoring Intel NUC hardware, system performance, and infrastructure health.

## Endpoints

### Get System Status

```http
GET /api/v1/system/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "HEALTHY",
    "uptime": 86400,
    "version": "1.0.0",
    "environment": "production",
    "components": {
      "trading": "ACTIVE",
      "security": "ACTIVE",
      "tunnel": "CONNECTED",
      "database": "HEALTHY"
    }
  }
}
```

### Get Hardware Metrics

```http
GET /api/v1/system/hardware
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cpu": {
      "usage": 45.2,
      "temperature": 65.5,
      "frequency": 2400,
      "cores": 4
    },
    "memory": {
      "total": 12884901888,
      "used": 8589934592,
      "free": 4294967296,
      "usage": 66.7
    },
    "storage": {
      "total": 274877906944,
      "used": 137438953472,
      "free": 137438953472,
      "usage": 50.0
    },
    "network": {
      "interfaces": [
        {
          "name": "eth0",
          "status": "UP",
          "speed": 1000,
          "rx_bytes": 1048576,
          "tx_bytes": 524288
        }
      ]
    }
  }
}
```

### Get Performance Metrics

```http
GET /api/v1/system/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "loadAverage": [1.2, 1.5, 1.8],
    "processes": 156,
    "threads": 892,
    "fileDescriptors": 1024,
    "networkConnections": 45,
    "diskIO": {
      "readOps": 1000,
      "writeOps": 500,
      "readBytes": 1048576,
      "writeBytes": 524288
    }
  }
}
```

### Get SSH Tunnel Status

```http
GET /api/v1/system/tunnel
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "CONNECTED",
    "host": "168.138.104.117",
    "port": 22,
    "uptime": 3600,
    "latency": 45.2,
    "throughput": {
      "upload": 1024000,
      "download": 2048000
    },
    "reconnections": 0,
    "lastReconnect": null
  }
}
```

### Restart System Component

```http
POST /api/v1/system/restart
```

**Request Body:**
```json
{
  "component": "trading",
  "reason": "Manual restart"
}
```

### Update System Configuration

```http
PUT /api/v1/system/config
```

**Request Body:**
```json
{
  "logLevel": "debug",
  "maxPositions": 10,
  "riskPercentage": 3.0
}
```