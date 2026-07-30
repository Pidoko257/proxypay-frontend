# Load Testing Framework - Setup & Usage Guide

## Overview

ProxyPay's comprehensive load testing framework enables you to validate system performance under various load conditions. It includes:

- **Multiple Load Profiles**: Smoke tests, normal load, stress tests, spike tests, and endurance tests
- **Custom Scenarios**: Define advanced test scenarios programmatically
- **Real-time Monitoring**: Track performance metrics and health during tests
- **Baseline Comparison**: Detect performance regressions automatically
- **Concurrent Execution**: Run multiple profiles in parallel
- **Multi-format Reporting**: HTML, JSON, CSV, and console reports

---

## Installation & Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Axios (for HTTP requests)
- TypeScript support

### Installation

1. **Install dependencies**:
   ```bash
   npm install --save-dev axios
   npm install --save-dev @types/node ts-node typescript
   ```

2. **Copy framework files** into your `src/` directory:
   - `load-test.ts` - CLI entry point
   - `load-test.config.ts` - Configuration definitions
   - `load-test-engine.ts` - Core execution engine
   - `load-test-reporter.ts` - Report generators
   - `metrics-collector.ts` - Monitoring module
   - `scenario-runner.ts` - Custom scenario support
   - `baseline-manager.ts` - Baseline comparison
   - `concurrent-executor.ts` - Parallel execution

3. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "load-test": "ts-node src/load-test.ts",
       "load-test:smoke": "ts-node src/load-test.ts --profile smoke-test",
       "load-test:normal": "ts-node src/load-test.ts --profile normal-load",
       "load-test:stress": "ts-node src/load-test.ts --profile stress-test",
       "load-test:spike": "ts-node src/load-test.ts --profile spike-test",
       "load-test:endurance": "ts-node src/load-test.ts --profile endurance-test",
       "load-test:all": "ts-node src/load-test.ts --concurrent",
       "load-test:baseline:save": "ts-node src/load-test.ts --save-baseline",
       "load-test:baseline:compare": "ts-node src/load-test.ts --compare-baseline"
     }
   }
   ```

---

## Quick Start

### Running a Basic Load Test

```bash
# Run smoke test
npm run load-test:smoke

# Run normal load profile
npm run load-test:normal

# Run stress test
npm run load-test:stress
```

### Running All Profiles Concurrently

```bash
npm run load-test:all
```

Output will include:
- Real-time test progress
- Performance metrics (throughput, response times, error rates)
- Test completion status
- Report files in `./load-test-results/`

---

## Configuration

### Default Profiles

The framework includes 5 pre-configured load profiles:

#### 1. **Smoke Test** (smoke-test)
- **Duration**: 30 seconds
- **Concurrency**: 1-5 users
- **Use Case**: Quick validation that system is operational
- **Endpoints**: Homepage, API reference, rate limits

#### 2. **Normal Load** (normal-load)
- **Duration**: 120 seconds (2 minutes)
- **Concurrency**: 10-50 users
- **Use Case**: Typical production load simulation
- **Endpoints**: All major endpoints with realistic weights

#### 3. **Stress Test** (stress-test)
- **Duration**: 300 seconds (5 minutes)
- **Concurrency**: 50-200 users
- **Use Case**: Find system breaking point
- **Endpoints**: All endpoints with heavy emphasis on rate limits

#### 4. **Spike Test** (spike-test)
- **Duration**: 180 seconds (3 minutes)
- **Concurrency**: 100-500 users
- **Use Case**: Test behavior during sudden traffic spikes
- **Endpoints**: Rate limit endpoints (most likely to spike)

#### 5. **Endurance Test** (endurance-test)
- **Duration**: 1800 seconds (30 minutes)
- **Concurrency**: 20-80 users
- **Use Case**: Detect memory leaks and stability issues
- **Endpoints**: All endpoints with realistic distribution

### Modifying Configuration

Create a custom config file:

```typescript
// custom-config.ts
import { LoadTestConfig } from './load-test.config';

export default {
  baseUrl: 'http://your-api.local:3000',
  apiBaseUrl: 'http://your-api.local:3000',
  timeout: 30000,
  verbose: true,

  loadProfiles: [
    {
      name: 'custom-profile',
      description: 'My custom load test',
      duration: 60,
      rampUp: 10,
      concurrency: { min: 5, max: 20 },
      thinkTime: 150,
      requests: [
        {
          name: 'GET /api/users',
          method: 'GET',
          path: '/api/users',
          weight: 50,
          expectedStatus: [200],
        },
        {
          name: 'POST /api/users',
          method: 'POST',
          path: '/api/users',
          weight: 50,
          body: { name: 'Test User', email: 'test@example.com' },
          expectedStatus: [201],
        },
      ],
    },
  ],

  thresholds: {
    p50ResponseTime: 200,
    p95ResponseTime: 800,
    p99ResponseTime: 2000,
    maxResponseTime: 5000,
    errorRate: 1,
    minThroughput: 10,
    availabilityTarget: 99.5,
  },

  reporting: {
    outputDir: './load-test-results',
    format: ['html', 'json', 'csv', 'console'],
    generateGraphs: true,
  },
} as LoadTestConfig;
```

Use custom config:

```bash
npm run load-test -- --config ./custom-config.ts
```

---

## Advanced Features

### 1. Baseline Comparison

Save baseline results:

```bash
npm run load-test:baseline:save
```

This creates baseline files in `./baselines/` directory.

Compare against baseline:

```bash
npm run load-test:baseline:compare
```

Output shows:
- Response time changes (%)
- Throughput changes (%)
- Error rate changes
- Regression status

### 2. Custom Scenarios

Create scenario files in `scenarios/` directory:

```typescript
// scenarios/custom-flow.ts
import { TestScenario, ScenarioContext } from '../src/scenario-runner';
import { LoadProfile } from '../src/load-test.config';

export default {
  name: 'User Registration Flow',
  description: 'Tests user registration and login flow',
  
  async execute(context: ScenarioContext) {
    context.log('Starting user registration flow test');

    // Create a custom profile
    const profile: LoadProfile = {
      name: 'registration-flow',
      description: 'User registration and login',
      duration: 120,
      rampUp: 30,
      concurrency: { min: 10, max: 50 },
      thinkTime: 200,
      requests: [
        {
          name: 'Register User',
          method: 'POST',
          path: '/api/register',
          weight: 30,
          body: { email: 'user@example.com', password: 'password' },
        },
        {
          name: 'Login',
          method: 'POST',
          path: '/api/login',
          weight: 40,
          body: { email: 'user@example.com', password: 'password' },
        },
        {
          name: 'Get Profile',
          method: 'GET',
          path: '/api/profile',
          weight: 30,
        },
      ],
    };

    return await context.engine.runProfile(profile);
  },
} as TestScenario;
```

Run custom scenario:

```bash
npm run load-test -- --scenarios custom-flow
```

### 3. Advanced Scenario Types

```typescript
// Ramp-up scenario
const scenarioRunner = new ScenarioRunner(config);
const results = await scenarioRunner.runRampUpScenario(
  baseProfile,
  5,      // levels
  60      // duration per level (seconds)
);

// Spike scenario
const spikeResults = await scenarioRunner.runSpikeScenario(
  baseProfile,
  500,    // spike concurrency
  30,     // spike duration (seconds)
  60,     // cooldown duration (seconds)
  3       // repetitions
);

// Stress test scenario
const stressResults = await scenarioRunner.runStressTestScenario(
  baseProfile,
  10,     // initial concurrency
  500,    // max concurrency
  50,     // step
  60,     // duration per level
  5       // error rate threshold (%)
);

// Endurance scenario
const { results: enduranceResults, memoryTrend } = 
  await scenarioRunner.runEnduranceScenario(
    baseProfile,
    300000, // checkpoint interval (5 minutes)
    1800000 // total duration (30 minutes)
  );
```

### 4. Real-time Monitoring

```typescript
import { MetricsCollector } from './src/metrics-collector';

const collector = new MetricsCollector();

// Record results
collector.record(testResults);

// Get health status
const health = collector.getHealthStatus();
if (!health.healthy) {
  console.error('Critical alerts:', health.alerts);
}

// Get performance trends
const trends = collector.getTrends();
trends.forEach(trend => {
  console.log(`${trend.metric}: ${trend.trend}`);
});

// Get summary
const summary = collector.getSummary();
console.log(`Avg P95: ${summary.averageP95ResponseTime}ms`);
```

### 5. Concurrent Execution

```typescript
import { ConcurrentExecutor } from './src/concurrent-executor';

const executor = new ConcurrentExecutor(config, {
  maxConcurrentTests: 3,
  failFast: true,
  timeout: 600000, // 10 minutes
});

const { results, errors, summary } = await executor.executeProfiles(profiles);

executor.printSummary();
```

---

## CLI Options

```
Usage: load-test [options]

Options:
  --profile <name>              Run specific profile
  --config <path>               Load custom configuration file
  --environment <env>           Use preset environment (local, staging, production)
  --concurrent                  Run multiple profiles concurrently
  --scenarios <list>            Run specific scenario scripts
  --compare-baseline            Compare results against baseline
  --save-baseline               Save current results as baseline
  --duration-multiplier <value> Multiply test duration
  --verbose                     Enable verbose logging
  --list-profiles               List all available profiles
  --help, -h                    Show help message
  --version, -v                 Show version
```

### Examples

```bash
# List available profiles
npm run load-test -- --list-profiles

# Run with custom duration (half speed)
npm run load-test -- --profile normal-load --duration-multiplier 0.5

# Run staging environment with verbose output
npm run load-test -- --environment staging --verbose

# Run custom scenario
npm run load-test -- --scenarios user-flow,checkout-flow

# Compare and save baseline
npm run load-test -- --profile normal-load --compare-baseline --save-baseline
```

---

## Output & Reports

Reports are generated in `./load-test-results/` by default.

### Report Formats

#### 1. **HTML Report**
- Interactive charts and graphs
- Real-time metrics display
- Performance visualization
- Threshold violations highlighted

#### 2. **JSON Report**
- Complete test results
- All metrics in structured format
- For programmatic processing

#### 3. **CSV Report**
- Summary section
- Response time metrics
- Request breakdown
- Threshold violations

#### 4. **Console Report**
- Test summary
- Request statistics
- Response time percentiles
- Breakdown by endpoint

---

## Performance Thresholds

Default thresholds (configurable):

```
P50 Response Time:    200ms
P95 Response Time:    800ms
P99 Response Time:    2000ms
Max Response Time:    5000ms
Error Rate:           1%
Min Throughput:       10 req/s
Availability Target:  99.5%
```

Violations are reported in all output formats.

---

## Troubleshooting

### Connection Refused
- Ensure target service is running
- Check `baseUrl` configuration
- Verify port is correct

### High Error Rates
- Check error logs in test output
- Verify endpoint paths are correct
- Check request bodies/headers
- Review service logs for issues

### Memory Issues
- Reduce duration or concurrency
- Run endurance test to detect leaks
- Check for unclosed connections

### Slow Tests
- Reduce duration multiplier
- Lower concurrency for quicker feedback
- Check target service performance
- Review network connectivity

---

## Best Practices

1. **Start with smoke tests** - Verify basic functionality first
2. **Use baselines** - Establish performance baseline before making changes
3. **Run regularly** - Schedule load tests as part of CI/CD
4. **Monitor trends** - Use metrics collector to track changes over time
5. **Test staging first** - Validate in staging before production
6. **Combine profiles** - Run concurrent profiles for comprehensive testing
7. **Review reports** - Analyze HTML reports for actionable insights
8. **Set realistic thresholds** - Base thresholds on requirements, not current performance

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Tests

on: [push]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run load-test:smoke
      - run: npm run load-test:baseline:compare
      - uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: load-test-results/
```

---

## Next Steps

- Customize profiles for your specific endpoints
- Create scenario files for business-critical flows
- Establish baseline performance metrics
- Integrate into your CI/CD pipeline
- Monitor trends over time
- Use insights to identify optimization opportunities
