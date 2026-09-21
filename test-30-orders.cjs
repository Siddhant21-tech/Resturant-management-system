// Stress test: 30 simultaneous orders
const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('--- STARTING STRESS TEST: 30 CONCURRENT ORDERS ---');

  // 1. Fetch tables and menu
  const tablesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/branches/branch-downtown-01/tables',
    method: 'GET',
  });

  const menuRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/branches/branch-downtown-01/menu',
    method: 'GET',
  });

  const tables = tablesRes.body;
  const menuCategories = menuRes.body;
  const allMenuItems = menuCategories.flatMap((c) => c.items);

  console.log(`Found ${tables.length} tables and ${allMenuItems.length} menu items.`);

  // Find or create an active session
  let sessionTable = tables.find((t) => t.currentSessionId);
  let sessionId = sessionTable?.currentSessionId;

  if (!sessionId) {
    const newSessionRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/sessions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        branchId: 'branch-downtown-01',
        tableId: tables[0].id,
        guestCount: 4,
      }
    );
    sessionId = newSessionRes.body.id;
  }

  console.log(`Using target session: ${sessionId}`);

  // 2. Prepare 30 orders
  const orders = [];
  for (let i = 1; i <= 30; i++) {
    const menuItem = allMenuItems[i % allMenuItems.length];
    orders.push({
      sessionId,
      source: i % 2 === 0 ? 'WAITER' : 'CUSTOMER_QR',
      notes: `Stress Test Order #${i}`,
      items: [
        {
          menuItemId: menuItem.id,
          quantity: (i % 3) + 1,
          notes: `Batch item ${i}`,
        },
      ],
    });
  }

  console.log(`Firing 30 orders concurrently with Promise.all...`);
  const startTime = Date.now();

  const results = await Promise.all(
    orders.map((order, idx) =>
      request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/orders',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        order
      ).then((res) => ({ index: idx + 1, ...res }))
    )
  );

  const duration = Date.now() - startTime;
  console.log(`Completed in ${duration}ms.`);

  // 3. Analyze results
  const succeeded = results.filter((r) => r.status === 201);
  const failed = results.filter((r) => r.status !== 201);

  console.log(`Success: ${succeeded.length} / 30`);
  console.log(`Failed: ${failed.length} / 30`);

  if (failed.length > 0) {
    console.error('Failure samples:', failed.slice(0, 3));
  }

  // Check round numbers
  const roundNumbers = succeeded.map((s) => s.body.roundNumber);
  const uniqueRoundNumbers = new Set(roundNumbers);
  console.log(`Unique round numbers: ${uniqueRoundNumbers.size} out of ${succeeded.length}`);
  if (uniqueRoundNumbers.size < succeeded.length) {
    console.warn('⚠️ RACE CONDITION DETECTED: Duplicate round numbers assigned across concurrent orders!');
    console.log('Assigned round numbers:', roundNumbers);
  }

  // Check round IDs
  const roundIds = succeeded.map((s) => s.body.id);
  const uniqueRoundIds = new Set(roundIds);
  console.log(`Unique round IDs: ${uniqueRoundIds.size} out of ${succeeded.length}`);

  // Check item IDs
  const itemIds = succeeded.flatMap((s) => s.body.items.map((i) => i.id));
  const uniqueItemIds = new Set(itemIds);
  console.log(`Unique item IDs: ${uniqueItemIds.size} out of ${itemIds.length}`);

  // Check kitchen tickets
  const kitchenRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders/kitchen?branchId=branch-downtown-01',
    method: 'GET',
  });
  console.log(`Kitchen tickets status: ${kitchenRes.status}, count: ${kitchenRes.body.length}`);

  // Check bill aggregation
  const billRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/session/${sessionId}`,
    method: 'GET',
  });
  console.log(`Bill endpoint status: ${billRes.status}`);
  if (billRes.body?.latestBill) {
    console.log(`Bill items count: ${billRes.body.latestBill.items?.length}`);
    console.log(`Bill total: ₹${billRes.body.latestBill.finalAmount}`);
  }
}

run().catch(console.error);
