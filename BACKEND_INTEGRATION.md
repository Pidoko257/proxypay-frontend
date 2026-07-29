# Backend Integration Guide for Rate Limit Dashboard

This guide shows how to implement the backend API endpoint that the Rate Limit Dashboard consumes.

## API Specification

### Endpoint
```
GET /api/rate-limit-status
```

### Authentication
- Method: Bearer Token in Authorization header
- Header: `Authorization: Bearer {api_token}`
- Token source: Retrieved from `localStorage.getItem('api_token')` on client

### Response Format

```json
{
  "tier": "Pro",
  "requestsLimit": 5000,
  "requestsUsed": 1250,
  "requestsRemaining": 3750,
  "resetTime": "2024-07-30T15:30:00Z",
  "resetTimestamp": 1722352200000,
  "percentageUsed": 25,
  "endpoints": [
    {
      "path": "/api/transactions",
      "method": "GET",
      "requestsUsed": 500,
      "limit": 1000
    },
    {
      "path": "/api/webhooks",
      "method": "POST",
      "requestsUsed": 150,
      "limit": 500
    },
    {
      "path": "/api/keys",
      "method": "GET",
      "requestsUsed": 75,
      "limit": 200
    }
  ]
}
```

### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| `tier` | string | User's plan tier (e.g., "Pro", "Enterprise") |
| `requestsLimit` | number | Total requests allowed in period |
| `requestsUsed` | number | Requests already used |
| `requestsRemaining` | number | Requests still available |
| `resetTime` | string | ISO 8601 date when limit resets |
| `resetTimestamp` | number | Unix timestamp (milliseconds) |
| `percentageUsed` | number | 0-100 percentage of limit used |
| `endpoints` | array | Per-endpoint usage breakdown |
| `endpoints[].path` | string | API endpoint path |
| `endpoints[].method` | string | HTTP method (GET, POST, etc.) |
| `endpoints[].requestsUsed` | number | Requests used for this endpoint |
| `endpoints[].limit` | number | Request limit for this endpoint |

## Implementation Examples

### Node.js / Express

```typescript
import express from 'express';
import { verifyToken } from './auth';
import { getRateLimitStatus } from './rateLimiting';

const app = express();

app.get('/api/rate-limit-status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get rate limit data
    const rateLimitData = await getRateLimitStatus(userId);
    
    if (!rateLimitData) {
      return res.status(404).json({ 
        error: 'Rate limit data not found' 
      });
    }
    
    // Format response
    const response = {
      tier: rateLimitData.tier,
      requestsLimit: rateLimitData.limit,
      requestsUsed: rateLimitData.used,
      requestsRemaining: Math.max(0, rateLimitData.limit - rateLimitData.used),
      resetTime: rateLimitData.resetAt.toISOString(),
      resetTimestamp: rateLimitData.resetAt.getTime(),
      percentageUsed: Math.round(
        (rateLimitData.used / rateLimitData.limit) * 100
      ),
      endpoints: await getEndpointUsage(userId, rateLimitData),
    };
    
    res.json(response);
  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rate limit status' 
    });
  }
});

// Helper: Get endpoint-level usage
async function getEndpointUsage(userId: string, rateLimitData: any) {
  const endpoints = [
    '/api/transactions',
    '/api/webhooks',
    '/api/keys',
    '/api/users',
    '/api/rates',
  ];
  
  const usage = [];
  
  for (const endpoint of endpoints) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    
    for (const method of methods) {
      const count = await getUserEndpointUsage(
        userId,
        endpoint,
        method,
        rateLimitData.resetAt
      );
      
      if (count > 0) {
        usage.push({
          path: endpoint,
          method,
          requestsUsed: count,
          limit: rateLimitData.endpointLimits?.[`${method}:${endpoint}`] || 100,
        });
      }
    }
  }
  
  return usage;
}
```

### Python / FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List
from pydantic import BaseModel
from sqlalchemy import select
from .auth import get_current_user, User
from .models import RateLimit, EndpointUsage

router = APIRouter(prefix="/api", tags=["rate-limit"])

class EndpointUsageSchema(BaseModel):
    path: str
    method: str
    requestsUsed: int
    limit: int

class RateLimitStatusSchema(BaseModel):
    tier: str
    requestsLimit: int
    requestsUsed: int
    requestsRemaining: int
    resetTime: str
    resetTimestamp: int
    percentageUsed: int
    endpoints: List[EndpointUsageSchema]

@router.get(
    "/rate-limit-status",
    response_model=RateLimitStatusSchema,
    status_code=status.HTTP_200_OK
)
async def get_rate_limit_status(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current rate limit status for authenticated user"""
    try:
        # Get rate limit record
        rate_limit = db.execute(
            select(RateLimit).where(RateLimit.user_id == current_user.id)
        ).scalar_one_or_none()
        
        if not rate_limit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rate limit data not found"
            )
        
        # Get endpoint usage
        endpoint_usage = get_endpoint_usage_breakdown(
            db, current_user.id, rate_limit.reset_at
        )
        
        # Calculate percentages
        percentage_used = int((rate_limit.used / rate_limit.limit) * 100)
        remaining = max(0, rate_limit.limit - rate_limit.used)
        
        return RateLimitStatusSchema(
            tier=rate_limit.tier,
            requestsLimit=rate_limit.limit,
            requestsUsed=rate_limit.used,
            requestsRemaining=remaining,
            resetTime=rate_limit.reset_at.isoformat(),
            resetTimestamp=int(rate_limit.reset_at.timestamp() * 1000),
            percentageUsed=percentage_used,
            endpoints=[
                EndpointUsageSchema(
                    path=eu.path,
                    method=eu.method,
                    requestsUsed=eu.requests_used,
                    limit=eu.limit
                )
                for eu in endpoint_usage
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch rate limit status"
        )

def get_endpoint_usage_breakdown(db, user_id: int, reset_at: datetime):
    """Get per-endpoint usage breakdown"""
    # Query your logs/metrics table
    results = db.execute("""
        SELECT path, method, COUNT(*) as count
        FROM api_logs
        WHERE user_id = ? AND timestamp > ?
        GROUP BY path, method
    """, (user_id, reset_at)).fetchall()
    
    endpoint_limits = {
        "GET:/api/transactions": 1000,
        "POST:/api/webhooks": 500,
        "GET:/api/keys": 200,
        "GET:/api/users": 300,
        "GET:/api/rates": 250,
    }
    
    usage = []
    for path, method, count in results:
        key = f"{method}:{path}"
        usage.append(EndpointUsage(
            path=path,
            method=method,
            requests_used=count,
            limit=endpoint_limits.get(key, 100)
        ))
    
    return usage
```

### Go / Gin

```go
package main

import (
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
)

type EndpointUsage struct {
    Path         string `json:"path"`
    Method       string `json:"method"`
    RequestsUsed int    `json:"requestsUsed"`
    Limit        int    `json:"limit"`
}

type RateLimitStatus struct {
    Tier             string           `json:"tier"`
    RequestsLimit    int              `json:"requestsLimit"`
    RequestsUsed     int              `json:"requestsUsed"`
    RequestsRemaining int             `json:"requestsRemaining"`
    ResetTime        string           `json:"resetTime"`
    ResetTimestamp   int64            `json:"resetTimestamp"`
    PercentageUsed   int              `json:"percentageUsed"`
    Endpoints        []EndpointUsage  `json:"endpoints"`
}

func getRateLimitStatus(c *gin.Context) {
    userID := c.GetString("user_id")
    
    // Get rate limit data
    rateLimitData, err := getRateLimitForUser(userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to fetch rate limit status",
        })
        return
    }
    
    if rateLimitData == nil {
        c.JSON(http.StatusNotFound, gin.H{
            "error": "Rate limit data not found",
        })
        return
    }
    
    // Get endpoint usage
    endpoints, err := getEndpointBreakdown(userID, rateLimitData.ResetAt)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to fetch endpoint usage",
        })
        return
    }
    
    // Calculate percentages
    percentUsed := (rateLimitData.Used * 100) / rateLimitData.Limit
    remaining := rateLimitData.Limit - rateLimitData.Used
    if remaining < 0 {
        remaining = 0
    }
    
    response := RateLimitStatus{
        Tier:              rateLimitData.Tier,
        RequestsLimit:     rateLimitData.Limit,
        RequestsUsed:      rateLimitData.Used,
        RequestsRemaining: remaining,
        ResetTime:         rateLimitData.ResetAt.Format(time.RFC3339),
        ResetTimestamp:    rateLimitData.ResetAt.UnixMilli(),
        PercentageUsed:    percentUsed,
        Endpoints:         endpoints,
    }
    
    c.JSON(http.StatusOK, response)
}

func init() {
    router := gin.Default()
    
    // Apply auth middleware
    router.GET(
        "/api/rate-limit-status",
        authMiddleware(),
        getRateLimitStatus,
    )
}
```

### Java / Spring Boot

```java
@RestController
@RequestMapping("/api")
public class RateLimitController {
    
    @Autowired
    private RateLimitService rateLimitService;
    
    @Autowired
    private EndpointUsageService endpointUsageService;
    
    @GetMapping("/rate-limit-status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<RateLimitStatusDTO> getRateLimitStatus() {
        try {
            String userId = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();
            
            RateLimitData rateLimitData = rateLimitService
                .getRateLimitForUser(userId);
            
            if (rateLimitData == null) {
                return ResponseEntity
                    .notFound()
                    .build();
            }
            
            List<EndpointUsageDTO> endpoints = endpointUsageService
                .getEndpointBreakdown(userId, rateLimitData.getResetAt());
            
            RateLimitStatusDTO response = RateLimitStatusDTO.builder()
                .tier(rateLimitData.getTier())
                .requestsLimit(rateLimitData.getLimit())
                .requestsUsed(rateLimitData.getUsed())
                .requestsRemaining(
                    Math.max(0, rateLimitData.getLimit() - rateLimitData.getUsed())
                )
                .resetTime(rateLimitData.getResetAt().toInstant().toString())
                .resetTimestamp(rateLimitData.getResetAt().getTime())
                .percentageUsed(
                    (int) ((double) rateLimitData.getUsed() / 
                           rateLimitData.getLimit() * 100)
                )
                .endpoints(endpoints)
                .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity
                .internalServerError()
                .build();
        }
    }
}
```

## Data Collection

### Redis-based Rate Limiting

```python
import redis
from datetime import datetime, timedelta

redis_client = redis.Redis(host='localhost', port=6379)

def track_api_request(user_id: int, endpoint: str, method: str):
    """Track API request for rate limiting"""
    now = datetime.utcnow()
    period = now.replace(hour=0, minute=0, second=0, microsecond=0)
    next_period = period + timedelta(days=1)
    
    # Keys
    user_limit_key = f"rate_limit:{user_id}:{period.timestamp()}"
    endpoint_key = f"endpoint_usage:{user_id}:{method}:{endpoint}:{period.timestamp()}"
    
    # Increment counters
    redis_client.incr(user_limit_key)
    redis_client.incr(endpoint_key)
    
    # Set expiration to next period
    ttl = int((next_period - now).total_seconds())
    redis_client.expire(user_limit_key, ttl)
    redis_client.expire(endpoint_key, ttl)

def get_rate_limit_status(user_id: int):
    """Get current rate limit status"""
    now = datetime.utcnow()
    period = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    key = f"rate_limit:{user_id}:{period.timestamp()}"
    used = int(redis_client.get(key) or 0)
    
    # Get tier from database
    user = db.get_user(user_id)
    tier_limits = {
        'basic': 1000,
        'pro': 5000,
        'enterprise': 50000,
    }
    limit = tier_limits.get(user.tier, 1000)
    
    return {
        'used': used,
        'limit': limit,
        'remaining': max(0, limit - used),
        'reset_at': (period + timedelta(days=1)).isoformat(),
    }
```

### PostgreSQL with Time-Series

```sql
-- Create rate limit tracking table
CREATE TABLE api_usage (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INT,
    status_code INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create index for fast queries
CREATE INDEX idx_api_usage_user_period 
ON api_usage(user_id, timestamp DESC);

-- Query rate limit status
SELECT 
    COUNT(*) as total_requests,
    COUNT(DISTINCT DATE(timestamp)) as unique_days,
    method,
    path
FROM api_usage
WHERE user_id = $1
  AND timestamp > NOW() - INTERVAL '1 day'
GROUP BY method, path;
```

## Error Handling

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | Success | Valid rate limit data returned |
| 400 | Bad Request | Invalid query parameters |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | User doesn't have access |
| 404 | Not Found | Rate limit data not found |
| 429 | Too Many Requests | Rate limit exceeded on API itself |
| 500 | Server Error | Database/service failure |

### Error Response Format

```json
{
  "error": "Detailed error message",
  "status": 500,
  "timestamp": "2024-07-29T15:30:00Z"
}
```

## Performance Considerations

### Caching
```python
# Cache rate limit status for 30 seconds
@cache.cached(timeout=30, key_prefix='rate_limit_')
def get_rate_limit_status(user_id):
    # Expensive query
    pass
```

### Database Query Optimization
- Index on (user_id, timestamp)
- Partition by date for faster queries
- Use materialized views for summaries

### Response Time Target
- API should respond within 200ms
- Use caching for frequently accessed data
- Consider separating real-time vs historical data

## Security Considerations

1. **Authentication**: Verify Bearer token before returning data
2. **Authorization**: Ensure user can only see their own data
3. **Rate Limiting**: Apply rate limit to the status endpoint itself
4. **CORS**: Configure CORS headers appropriately
5. **Input Validation**: Validate any query parameters
6. **Logging**: Log all rate limit status requests for audit trail

## Testing

```javascript
// Test the endpoint
fetch('/api/rate-limit-status', {
  headers: {
    'Authorization': 'Bearer test-token-123'
  }
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

## Related Documentation

- Rate Limit Dashboard: `RATE_LIMIT_DASHBOARD.md`
- Implementation Guide: `RATE_LIMIT_DASHBOARD_IMPL.md`
- Component Code: `src/components/RateLimitDashboard.tsx`
