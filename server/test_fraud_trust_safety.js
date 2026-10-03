import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('TESTING ADMIN FRAUD DETECTION & TRUST/SAFETY APIS');
  console.log('====================================================\n');

  // Step 1: Admin Login
  console.log('Step 1: Admin Login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@worklink.com',
      password: 'Admin@123',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const adminToken = loginData.token;
  console.log('✓ Admin logged in successfully.\n');

  // Step 2: Test GET /api/admin/fraud/alerts
  console.log('Step 2: Testing GET /api/admin/fraud/alerts...');
  const fraudRes = await fetch(`${BASE_URL}/admin/fraud/alerts`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const fraudData = await fraudRes.json();
  console.log(`✓ Fraud alerts endpoint status: ${fraudRes.status}, success: ${fraudData.success}`);
  if (!fraudData.success) {
    throw new Error('Fraud alerts failed: ' + JSON.stringify(fraudData));
  }
  console.log('Summary metrics for Fraud Alerts:');
  console.log(JSON.stringify(fraudData.summary, null, 2));
  console.log(`Total fraud alerts returned: ${fraudData.alerts?.length}`);

  if (fraudData.alerts && fraudData.alerts.length > 0) {
    const sampleAlert = fraudData.alerts[0];
    console.log('\nSample Fraud Alert:');
    console.log(`- Alert ID: ${sampleAlert.alertId}`);
    console.log(`- User: ${sampleAlert.user?.name} (${sampleAlert.userType})`);
    console.log(`- Risk Level: ${sampleAlert.riskLevel}`);
    console.log(`- Reason: ${sampleAlert.detectionReason}`);
    console.log(`- Status: ${sampleAlert.status}`);

    // Step 3: Test status update on alert
    console.log('\nStep 3: Testing POST /api/admin/fraud/alerts/:id/status...');
    const updateRes = await fetch(`${BASE_URL}/admin/fraud/alerts/${sampleAlert.alertId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'investigating',
        note: 'Automated test note verifying investigation workflow',
      }),
    });
    const updateData = await updateRes.json();
    console.log(`✓ Alert status update status: ${updateRes.status}, success: ${updateData.success}`);
    if (!updateData.success) {
      throw new Error('Alert update failed: ' + JSON.stringify(updateData));
    }
  }

  // Step 4: Test GET /api/admin/trust-safety
  console.log('\nStep 4: Testing GET /api/admin/trust-safety...');
  const trustSafetyRes = await fetch(`${BASE_URL}/admin/trust-safety`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const trustSafetyData = await trustSafetyRes.json();
  console.log(`✓ Trust & Safety endpoint status: ${trustSafetyRes.status}, success: ${trustSafetyData.success}`);
  if (!trustSafetyData.success) {
    throw new Error('Trust & Safety failed: ' + JSON.stringify(trustSafetyData));
  }
  console.log('Summary metrics for Trust & Safety:');
  console.log(JSON.stringify(trustSafetyData.summary, null, 2));
  console.log(`- Total Workers: ${trustSafetyData.workers?.length}`);
  console.log(`- Total Employers: ${trustSafetyData.employers?.length}`);
  console.log(`- Total Safety Issues: ${trustSafetyData.safetyIssues?.length}`);

  console.log('\n====================================================');
  console.log('ALL FRAUD DETECTION & TRUST/SAFETY TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
