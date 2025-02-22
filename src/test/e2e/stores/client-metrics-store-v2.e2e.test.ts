import dbInit from '../helpers/database-init';
import getLogger from '../../fixtures/no-logger';
import { IUnleashStores } from '../../../lib/types';
import {
    IClientMetricsEnv,
    IClientMetricsStoreV2,
} from '../../../lib/types/stores/client-metrics-store-v2';
import { roundDownToHour } from '../../../lib/db/client-metrics-store-v2';

let db;
let stores: IUnleashStores;
let clientMetricsStore: IClientMetricsStoreV2;

beforeEach(async () => {
    db = await dbInit('client_metrics_store_v2_e2e_serial', getLogger);
    stores = db.stores;
    clientMetricsStore = stores.clientMetricsStoreV2;
});

afterEach(async () => {
    await db.destroy();
});

test('Should store single list of metrics', async () => {
    const metrics: IClientMetricsEnv[] = [
        {
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: new Date(),
            yes: 2,
            no: 2,
        },
    ];
    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(1);
});

test('Should "increment" metrics within same hour', async () => {
    const metrics: IClientMetricsEnv[] = [
        {
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: new Date(),
            yes: 2,
            no: 2,
        },
        {
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: new Date(),
            yes: 1,
            no: 3,
        },
    ];
    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(1);
    expect(savedMetrics[0].yes).toBe(3);
    expect(savedMetrics[0].no).toBe(5);
});

test('Should get individual metrics outside same hour', async () => {
    const d1 = new Date();
    const d2 = new Date();
    d1.setHours(10, 10, 11);
    d2.setHours(11, 10, 11);
    const metrics: IClientMetricsEnv[] = [
        {
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: d1,
            yes: 2,
            no: 2,
        },
        {
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: d2,
            yes: 1,
            no: 3,
        },
    ];
    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(2);
    expect(savedMetrics[0].yes).toBe(2);
    expect(savedMetrics[0].no).toBe(2);
});

test('Should insert hundred metrics in a row', async () => {
    const metrics: IClientMetricsEnv[] = [];

    const date = new Date();

    for (let i = 0; i < 100; i++) {
        metrics.push({
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: date,
            yes: i,
            no: i + 1,
        });
    }

    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(1);
    expect(savedMetrics[0].yes).toBe(4950);
    expect(savedMetrics[0].no).toBe(5050);
});

test('Should insert individual rows for different apps', async () => {
    const metrics: IClientMetricsEnv[] = [];

    const date = new Date();

    for (let i = 0; i < 10; i++) {
        metrics.push({
            featureName: 'demo',
            appName: `web-${i}`,
            environment: 'dev',
            timestamp: date,
            yes: 2,
            no: 2,
        });
    }

    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(10);
    expect(savedMetrics[0].yes).toBe(2);
    expect(savedMetrics[0].no).toBe(2);
});

test('Should insert individual rows for different toggles', async () => {
    const metrics: IClientMetricsEnv[] = [];

    const date = new Date();

    for (let i = 0; i < 10; i++) {
        metrics.push({
            featureName: `app-${i}`,
            appName: `web`,
            environment: 'dev',
            timestamp: date,
            yes: 2,
            no: 2,
        });
    }

    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(10);
    expect(savedMetrics[0].yes).toBe(2);
    expect(savedMetrics[0].no).toBe(2);
});

test('Should get toggle metrics', async () => {
    const metrics: IClientMetricsEnv[] = [];

    const date = new Date();

    for (let i = 0; i < 100; i++) {
        metrics.push({
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: date,
            yes: i,
            no: i + 1,
        });
    }

    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getMetricsForFeatureToggle(
        'demo',
    );

    expect(savedMetrics).toHaveLength(1);
    expect(savedMetrics[0].yes).toBe(4950);
    expect(savedMetrics[0].no).toBe(5050);
});

test('Should insert 1500 feature toggle metrics', async () => {
    const metrics: IClientMetricsEnv[] = [];

    const date = new Date();

    for (let i = 0; i < 1500; i++) {
        metrics.push({
            featureName: `demo-${i}`,
            appName: `web`,
            environment: 'dev',
            timestamp: date,
            yes: 2,
            no: 2,
        });
    }

    await clientMetricsStore.batchInsertMetrics(metrics);
    const savedMetrics = await clientMetricsStore.getAll();

    expect(savedMetrics).toHaveLength(1500);
});

test('Should return seen applications using a feature toggle', async () => {
    const metrics: IClientMetricsEnv[] = [
        {
            featureName: 'demo',
            appName: 'web',
            environment: 'dev',
            timestamp: new Date(),
            yes: 2,
            no: 2,
        },
        {
            featureName: 'demo',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: new Date(),
            yes: 1,
            no: 3,
        },
        {
            featureName: 'demo',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: new Date(),
            yes: 1,
            no: 3,
        },
    ];
    await clientMetricsStore.batchInsertMetrics(metrics);
    const apps = await clientMetricsStore.getSeenAppsForFeatureToggle('demo');

    expect(apps).toHaveLength(2);
    expect(apps).toStrictEqual(['backend-api', 'web']);
});

test('Should not fail on empty list of metrics', async () => {
    await clientMetricsStore.batchInsertMetrics([]);
    const all = await clientMetricsStore.getAll();

    expect(all).toHaveLength(0);
});

test('Should not fail on undefined list of metrics', async () => {
    await clientMetricsStore.batchInsertMetrics(undefined);
    const all = await clientMetricsStore.getAll();

    expect(all).toHaveLength(0);
});

test('Should return delete old metric', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(-48);

    const metrics: IClientMetricsEnv[] = [
        {
            featureName: 'demo1',
            appName: 'web',
            environment: 'dev',
            timestamp: new Date(),
            yes: 2,
            no: 2,
        },
        {
            featureName: 'demo2',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: new Date(),
            yes: 1,
            no: 3,
        },
        {
            featureName: 'demo3',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: twoDaysAgo,
            yes: 1,
            no: 3,
        },
        {
            featureName: 'demo4',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: twoDaysAgo,
            yes: 1,
            no: 3,
        },
    ];
    await clientMetricsStore.batchInsertMetrics(metrics);
    await clientMetricsStore.clearMetrics(24);
    const all = await clientMetricsStore.getAll();

    expect(all).toHaveLength(2);
    expect(all[0].featureName).toBe('demo1');
    expect(all[1].featureName).toBe('demo2');
});

test('Should get metric', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(-48);

    const metrics: IClientMetricsEnv[] = [
        {
            featureName: 'demo1',
            appName: 'web',
            environment: 'dev',
            timestamp: new Date(),
            yes: 2,
            no: 2,
        },
        {
            featureName: 'demo2',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: new Date(),
            yes: 1,
            no: 3,
        },
        {
            featureName: 'demo3',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: twoDaysAgo,
            yes: 1,
            no: 3,
        },
        {
            featureName: 'demo4',
            appName: 'backend-api',
            environment: 'dev',
            timestamp: twoDaysAgo,
            yes: 41,
            no: 42,
        },
    ];
    await clientMetricsStore.batchInsertMetrics(metrics);
    const metric = await clientMetricsStore.get({
        featureName: 'demo4',
        timestamp: twoDaysAgo,
        appName: 'backend-api',
        environment: 'dev',
    });

    expect(metric.featureName).toBe('demo4');
    expect(metric.yes).toBe(41);
    expect(metric.no).toBe(42);
});

test('Should not exists after delete', async () => {
    const metric = {
        featureName: 'demo4',
        appName: 'backend-api',
        environment: 'dev',
        timestamp: new Date(),
        yes: 41,
        no: 42,
    };

    const metrics: IClientMetricsEnv[] = [metric];
    await clientMetricsStore.batchInsertMetrics(metrics);

    const existBefore = await clientMetricsStore.exists(metric);
    expect(existBefore).toBe(true);

    await clientMetricsStore.delete(metric);

    const existAfter = await clientMetricsStore.exists(metric);
    expect(existAfter).toBe(false);
});

test('should floor hours as expected', () => {
    expect(
        roundDownToHour(new Date('2019-11-12T08:44:32.499Z')).toISOString(),
    ).toBe('2019-11-12T08:00:00.000Z');
    expect(
        roundDownToHour(new Date('2019-11-12T08:59:59.999Z')).toISOString(),
    ).toBe('2019-11-12T08:00:00.000Z');
    expect(
        roundDownToHour(new Date('2019-11-12T09:01:00.999Z')).toISOString(),
    ).toBe('2019-11-12T09:00:00.000Z');
});
