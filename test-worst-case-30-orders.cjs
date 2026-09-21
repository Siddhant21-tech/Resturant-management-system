const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const opts = { ...options };
    opts.headers = { ...opts.headers };

    let payload = null;
    if (body !== null && body !== undefined) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
      if (!opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
      }
    }

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  RESTAURANT OS: WORST-CASE CONCURRENCY & VULNERABILITY SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Fetch tables and available menu items
  console.log('📋 STEP 1: Verifying active environment and menu items...');
  const tablesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/branches/branch-downtown-01/tables',
    method: 'GET',
  });
  assert(tablesRes.status === 200 && tablesRes.data.length > 0, 'Downtown tables fetched');

  const menuRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/branches/branch-downtown-01/menu',
    method: 'GET',
  });
  assert(menuRes.status === 200 && menuRes.data.length > 0, 'Menu categories and items loaded');

  // Extract valid menu items
  const allMenuItems = [];
  menuRes.data.forEach((cat) => {
    cat.items.forEach((item) => allMenuItems.push(item));
  });
  console.log(`     Found ${allMenuItems.length} menu items across categories.`);
  assert(allMenuItems.length >= 3, 'At least 3 menu items available for stress testing');

  // 2. Create a clean test table session
  console.log('\n🪑 STEP 2: Creating a fresh test dining session...');
  const table = tablesRes.data.find((t) => t.status === 'AVAILABLE') || tablesRes.data[0];
  const sessionCode = `T30-${Date.now().toString().slice(-4)}`;

  const createSessionRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sessions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      branchId: 'branch-downtown-01',
      tableId: table.id,
      waiterId: 'user-waiter-01',
      sessionCode,
      guestCount: 4,
    }
  );
  assert(createSessionRes.status === 201, `Dining session created: ${sessionCode}`);
  const sessionId = createSessionRes.data.id;

  // 3. Vulnerability check: Negative and invalid quantities
  console.log('\n🛡️ STEP 3: Testing input validation & vulnerability defenses...');
  
  // Test 3a: Negative quantity
  const negQtyRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      sessionId,
      items: [{ menuItemId: allMenuItems[0].id, quantity: -5 }],
    }
  );
  assert(negQtyRes.status === 400, 'Rejected negative item quantity with HTTP 400');

  // Test 3b: Zero quantity
  const zeroQtyRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      sessionId,
      items: [{ menuItemId: allMenuItems[0].id, quantity: 0 }],
    }
  );
  assert(zeroQtyRes.status === 400, 'Rejected zero item quantity with HTTP 400');

  // Test 3c: Floating point quantity
  const floatQtyRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      sessionId,
      items: [{ menuItemId: allMenuItems[0].id, quantity: 2.5 }],
    }
  );
  assert(floatQtyRes.status === 400, 'Rejected non-integer quantity with HTTP 400');

  // Test 3d: Non-existent menu item
  const ghostItemRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      sessionId,
      items: [{ menuItemId: 'non-existent-uuid-9999', quantity: 1 }],
    }
  );
  assert(ghostItemRes.status === 400, 'Rejected non-existent menu item with HTTP 400');

  // 4. WORST CASE: 30 SIMULTANEOUS ORDERS
  console.log('\n⚡ STEP 4: Executing worst-case test: 30 SIMULTANEOUS ORDERS IN PARALLEL...');
  const orderPromises = [];
  const startTs = Date.now();

  let expectedTotalQuantity = 0;
  let expectedSubtotal = 0;

  for (let i = 1; i <= 30; i++) {
    const item = allMenuItems[i % allMenuItems.length];
    const qty = 1 + (i % 3); // 1, 2, or 3
    expectedTotalQuantity += qty;
    expectedSubtotal += qty * item.price;

    const payload = {
      sessionId,
      source: 'WAITER',
      notes: `Worst-Case Stress Order #${i}`,
      items: [
        {
          menuItemId: item.id,
          quantity: qty,
          notes: `Batch item #${i}`,
        },
      ],
    };

    orderPromises.push(
      request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/orders',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        payload
      )
    );
  }

  const results = await Promise.all(orderPromises);
  const elapsedMs = Date.now() - startTs;
  console.log(`     🚀 Dispatched & resolved 30 orders concurrently in ${elapsedMs}ms!`);

  // Verify all 30 returned 201 Created
  const successCount = results.filter((r) => r.status === 201).length;
  assert(successCount === 30, `All 30 simultaneous orders succeeded (Status 201). Passed: ${successCount}/30`);

  // Verify round numbers are unique and non-colliding
  const roundNumbers = results.map((r) => r.data.roundNumber);
  const uniqueRoundNumbers = new Set(roundNumbers);
  assert(
    uniqueRoundNumbers.size === 30,
    `All 30 concurrent rounds received distinct, non-colliding round numbers (1 to 30)`
  );

  // 5. Verify live bill calculation after 30 orders
  console.log('\n💰 STEP 5: Verifying financial calculations and live bill accuracy...');
  const billRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/bills/session/${sessionId}`,
    method: 'GET',
  });
  assert(billRes.status === 200, 'Live bill calculated successfully');

  const latestBill = billRes.data.latestBill;
  assert(latestBill !== undefined && latestBill !== null, 'Latest bill object exists');
  console.log(`     Calculated Subtotal: ₹${latestBill.subtotal} (Expected: ₹${expectedSubtotal})`);
  assert(latestBill.subtotal === expectedSubtotal, 'Subtotal perfectly matches exact sum of all 30 orders');

  const expectedTax = Math.round(expectedSubtotal * 0.05 * 100) / 100;
  console.log(`     Calculated Tax (5% GST): ₹${latestBill.taxAmount} (Expected: ₹${expectedTax})`);
  assert(latestBill.taxAmount === expectedTax, 'GST tax is precisely 5.0% rounded to the cent');

  const expectedFinal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;
  console.log(`     Calculated Final Amount: ₹${latestBill.finalAmount} (Expected: ₹${expectedFinal})`);
  assert(latestBill.finalAmount === expectedFinal, 'Final amount matches subtotal + tax exactly');

  // 6. Kitchen display pipeline test
  console.log('\n🍳 STEP 6: Testing kitchen ticket retrieval and concurrent status progression...');
  const kitchenRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/orders/kitchen?branchId=branch-downtown-01&activeOnly=true`,
    method: 'GET',
  });
  assert(kitchenRes.status === 200, 'Kitchen queue retrieved');
  
  const sessionItems = kitchenRes.data.filter((it) => it.round?.session?.id === sessionId || it.round?.sessionId === sessionId);
  console.log(`     Found ${sessionItems.length} active tickets for this session in kitchen queue.`);
  assert(sessionItems.length === 30, 'Kitchen queue contains all 30 items from the 30 orders');

  // Concurrently accept all 30 items in the kitchen
  console.log('     Accepting all 30 kitchen items simultaneously...');
  const acceptPromises = sessionItems.map((it) =>
    request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/items/${it.id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
      { status: 'ACCEPTED' }
    )
  );
  const acceptResults = await Promise.all(acceptPromises);
  const acceptSuccesses = acceptResults.filter((r) => r.status === 200).length;
  assert(acceptSuccesses === 30, `All 30 kitchen tickets transitioned to ACCEPTED concurrently`);

  // Concurrently mark all 30 items READY
  console.log('     Marking all 30 kitchen items READY simultaneously...');
  const readyPromises = sessionItems.map((it) =>
    request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/items/${it.id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
      { status: 'READY' }
    )
  );
  const readyResults = await Promise.all(readyPromises);
  const readySuccesses = readyResults.filter((r) => r.status === 200).length;
  assert(readySuccesses === 30, `All 30 kitchen tickets transitioned to READY concurrently`);

  // 7. Settle payment & verify post-payment security
  console.log('\n🔒 STEP 7: Testing 3-minute modification lock defenses on kitchen-ready items...');
  const lockEditRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/items/${sessionItems[0].id}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    },
    { quantity: 5 }
  );
  assert(lockEditRes.status === 403, 'Editing READY item rejected with HTTP 403 (3-minute lock enforced)');

  const lockCancelRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/items/${sessionItems[0].id}`,
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    },
    { reason: 'Customer changed mind too late' }
  );
  assert(lockCancelRes.status === 403, 'Cancelling READY item rejected with HTTP 403 (3-minute lock enforced)');

  // 8. Testing Discount Defenses
  console.log('\n🏷️ STEP 8: Testing discount bounds & financial manipulation defenses...');
  const negDiscountRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/bills/${latestBill.id}/adjust`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      type: 'DISCOUNT',
      discountAmount: -200,
      reason: 'Malicious negative discount attempt',
    }
  );
  assert(negDiscountRes.status === 400, 'Negative discount attempt rejected with HTTP 400');

  // Valid discount application
  const validDiscountRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/bills/${latestBill.id}/adjust`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      type: 'DISCOUNT',
      discountAmount: 250,
      reason: 'VIP Corporate Guest Discount',
      userId: 'user-manager-01',
    }
  );
  assert(validDiscountRes.status === 201, 'Valid manager discount applied and logged to audit trail');
  const discountedBill = validDiscountRes.data;
  assert(discountedBill.discountAmount === 250, 'Discount amount recorded as ₹250');
  assert(
    discountedBill.finalAmount === Math.round((discountedBill.subtotal + discountedBill.taxAmount - 250) * 100) / 100,
    'Final amount adjusted accurately with discount deduction'
  );

  // 9. Settle payment & verify session termination defenses
  console.log('\n💳 STEP 9: Settling bill and verifying session termination defenses...');
  const payRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/bills/${discountedBill.id}/pay`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      method: 'UPI',
      referenceNumber: `UPI-TEST-${Date.now().toString().slice(-6)}`,
      receivedByUserId: 'user-manager-01',
    }
  );
  assert(payRes.status === 200, 'Discounted bill successfully paid and settled');

  // Test 9b: Double-payment attempt must be rejected
  const doublePayRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/bills/${discountedBill.id}/pay`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { method: 'CASH' }
  );
  assert(doublePayRes.status === 400, 'Double payment attempt rejected with HTTP 400');

  // Test 9c: Adding order to completed session must be rejected
  const orderOnCompletedRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      sessionId,
      items: [{ menuItemId: allMenuItems[0].id, quantity: 1 }],
    }
  );
  assert(orderOnCompletedRes.status === 400, 'Order on completed session rejected with HTTP 400');

  // 10. MULTI-TABLE CONCURRENCY: 30 Orders across 5 Different Tables in Parallel
  console.log('\n🌐 STEP 10: Executing Multi-Table Concurrency: 30 Orders across 5 Tables simultaneously...');
  const availableTables = tablesRes.data.filter((t) => t.id !== table.id).slice(0, 5);
  assert(availableTables.length >= 3, 'At least 3 other tables available for multi-table test');

  // Create sessions for each table concurrently
  const multiSessions = await Promise.all(
    availableTables.map((t, idx) =>
      request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/sessions',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          branchId: 'branch-downtown-01',
          tableId: t.id,
          waiterId: 'user-waiter-01',
          sessionCode: `MT-${idx}-${Date.now().toString().slice(-4)}`,
          guestCount: 2,
        }
      )
    )
  );

  const sessionList = multiSessions.map((res) => res.data);
  assert(sessionList.every((s) => s && s.id), 'All multi-table sessions opened concurrently');

  // Now fire 30 orders distributed across these tables in parallel (6 orders per table)
  const multiTableOrderPromises = [];
  const multiTableStart = Date.now();

  for (let i = 0; i < 30; i++) {
    const targetSession = sessionList[i % sessionList.length];
    const item = allMenuItems[i % allMenuItems.length];
    multiTableOrderPromises.push(
      request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/orders',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          sessionId: targetSession.id,
          source: 'CUSTOMER_QR',
          notes: `Multi-table concurrent order #${i + 1}`,
          items: [
            {
              menuItemId: item.id,
              quantity: 2,
              notes: 'Multi-table concurrent item',
            },
          ],
        }
      )
    );
  }

  const multiTableResults = await Promise.all(multiTableOrderPromises);
  const multiTableElapsed = Date.now() - multiTableStart;
  console.log(`     🚀 Dispatched 30 orders across ${sessionList.length} tables in ${multiTableElapsed}ms!`);

  const multiSuccessCount = multiTableResults.filter((r) => r.status === 201).length;
  assert(
    multiSuccessCount === 30,
    `All 30 multi-table orders created successfully (Status 201). Passed: ${multiSuccessCount}/30`
  );

  // Verify all tables have their live bills accurately populated
  const billChecks = await Promise.all(
    sessionList.map((s) =>
      request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/bills/session/${s.id}`,
        method: 'GET',
      })
    )
  );

  assert(
    billChecks.every((bc) => bc.status === 200 && bc.data.latestBill && bc.data.latestBill.subtotal > 0),
    'All multi-table bills generated accurately with positive subtotals'
  );

  console.log('\n===============================================================');
  console.log(`  🎉 ALL TESTS PASSED: ${passedTests}/${totalTests} ASSERTIONS VERIFIED!`);
  console.log('  System is 100% resilient under 30 concurrent orders & edge cases.');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
