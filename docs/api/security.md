# Security API

## Overview

The Security API provides endpoints for managing military-grade security features, threat detection, incident response, and security monitoring.

## Endpoints

### Get Security Status

```http
GET /api/v1/security/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "SECURE",
    "threatLevel": "LOW",
    "activeThreats": 0,
    "lastScan": "2025-01-01T12:00:00Z",
    "encryptionStatus": "ACTIVE",
    "intrusionDetection": "ACTIVE",
    "incidentResponse": "READY"
  }
}
```

### Get Threat Detection Status

```http
GET /api/v1/security/threats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeThreats": [
      {
        "id": "threat_001",
        "type": "SUSPICIOUS_LOGIN",
        "severity": "MEDIUM",
        "source": "192.168.1.100",
        "timestamp": "2025-01-01T12:00:00Z",
        "status": "INVESTIGATING"
      }
    ],
    "threatStatistics": {
      "totalThreats": 15,
      "blockedThreats": 14,
      "activeInvestigations": 1
    }
  }
}
```

### Get Security Incidents

```http
GET /api/v1/security/incidents
```

**Query Parameters:**
- `limit` (optional): Number of incidents to return (default: 50)
- `severity` (optional): Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `status` (optional): Filter by status (DETECTED, INVESTIGATING, CONTAINED, RESOLVED)

**Response:**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "inc_001",
        "type": "INTRUSION_ATTEMPT",
        "severity": "HIGH",
        "timestamp": "2025-01-01T12:00:00Z",
        "source": "external",
        "description": "Multiple failed login attempts detected",
        "status": "CONTAINED",
        "responseActions": [
          "IP_BLOCKED",
          "ALERT_SENT",
          "LOGS_PRESERVED"
        ],
        "evidence": [
          {
            "type": "LOG_ENTRY",
            "timestamp": "2025-01-01T12:00:00Z",
            "data": "Failed login attempt from 192.168.1.100"
          }
        ]
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50
    }
  }
}
```

### Trigger Security Scan

```http
POST /api/v1/security/scan
```

**Request Body:**
```json
{
  "type": "FULL_SYSTEM",
  "priority": "HIGH",
  "includeVulnerabilityAssessment": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scanId": "scan_001",
    "status": "INITIATED",
    "estimatedDuration": 300,
    "scanType": "FULL_SYSTEM"
  }
}
```

### Get Encryption Status

```http
GET /api/v1/security/encryption
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ACTIVE",
    "algorithm": "AES-256",
    "keyRotationStatus": "CURRENT",
    "lastKeyRotation": "2025-01-01T00:00:00Z",
    "nextKeyRotation": "2025-01-08T00:00:00Z",
    "encryptedDataSources": [
      "credentials",
      "trading_data",
      "audit_logs",
      "user_data"
    ]
  }
}
```

### Rotate Encryption Keys

```http
POST /api/v1/security/encryption/rotate
```

**Request Body:**
```json
{
  "keyType": "MASTER_KEY",
  "reason": "SCHEDULED_ROTATION"
}
```

### Get Audit Logs

```http
GET /api/v1/security/audit
```

**Query Parameters:**
- `startDate` (optional): Start date for log retrieval
- `endDate` (optional): End date for log retrieval
- `eventType` (optional): Filter by event type
- `severity` (optional): Filter by severity level

**Response:**
```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "audit_001",
        "timestamp": "2025-01-01T12:00:00Z",
        "eventType": "TRADE_EXECUTED",
        "severity": "INFO",
        "userId": "system",
        "details": {
          "symbol": "BTC/USDT",
          "quantity": 0.1,
          "price": 45000
        },
        "integrity": "sha256:abc123..."
      }
    ],
    "integrityStatus": "VERIFIED"
  }
}
```

### Emergency Security Lockdown

```http
POST /api/v1/security/lockdown
```

**Request Body:**
```json
{
  "reason": "SECURITY_BREACH_DETECTED",
  "level": "FULL",
  "duration": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lockdownId": "lockdown_001",
    "status": "ACTIVE",
    "level": "FULL",
    "activatedAt": "2025-01-01T12:00:00Z",
    "expiresAt": "2025-01-01T13:00:00Z"
  }
}
```

## WebSocket Events

### Security Alerts

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/security-alerts');

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('Security alert:', alert);
  // Handle security alert
};
```

### Threat Detection

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/threat-detection');

ws.onmessage = (event) => {
  const threat = JSON.parse(event.data);
  console.log('Threat detected:', threat);
  // Handle threat detection
};
```

## Error Codes

| Code | Description |
|------|-------------|
| `SEC_001` | Invalid security credentials |
| `SEC_002` | Encryption key not found |
| `SEC_003` | Security scan failed |
| `SEC_004` | Threat detection error |
| `SEC_005` | Incident response failure |
| `SEC_006` | Audit log corruption detected |
| `SEC_007` | Lockdown activation failed |

## Security Headers

All security API responses include additional security headers:

```
X-Security-Level: MILITARY_GRADE
X-Encryption-Status: ACTIVE
X-Threat-Level: LOW
X-Audit-Logged: true
```