// Test script to verify 14-day trial enforcement

const BASE_URL = 'http://localhost:5000';

async function testTrialSystem() {
  console.log('Testing 14-day trial enforcement system...\n');

  try {
    // Test 1: Check current user status
    console.log('1. Testing current user status:');
    const userResponse = await fetch(`${BASE_URL}/api/user`);
    const userData = await userResponse.json();
    console.log('User data:', JSON.stringify(userData, null, 2));

    // Test 2: Try accessing protected business tool endpoint
    console.log('\n2. Testing access to protected endpoint (hourly rate calculations):');
    const calcResponse = await fetch(`${BASE_URL}/api/hourly-rate-calculations`);
    console.log('Response status:', calcResponse.status);
    
    if (calcResponse.status === 402) {
      console.log('✓ TRIAL EXPIRED - Access properly blocked');
      const errorData = await calcResponse.json();
      console.log('Error message:', errorData.message);
    } else if (calcResponse.status === 200) {
      console.log('✓ TRIAL ACTIVE - Access allowed');
      const calcData = await calcResponse.json();
      console.log('Data received:', calcData.length, 'records');
    } else {
      console.log('Unexpected status:', calcResponse.status);
      const responseText = await calcResponse.text();
      console.log('Response:', responseText);
    }

    // Test 3: Try accessing treatments endpoint
    console.log('\n3. Testing access to treatments endpoint:');
    const treatmentResponse = await fetch(`${BASE_URL}/api/treatments`);
    console.log('Response status:', treatmentResponse.status);
    
    if (treatmentResponse.status === 402) {
      console.log('✓ TRIAL EXPIRED - Treatments access properly blocked');
    } else if (treatmentResponse.status === 200) {
      console.log('✓ TRIAL ACTIVE - Treatments access allowed');
    }

    // Test 4: Check trial status endpoint
    console.log('\n4. Testing trial status endpoint:');
    const trialStatusResponse = await fetch(`${BASE_URL}/api/trial-status`);
    if (trialStatusResponse.ok) {
      const trialData = await trialStatusResponse.json();
      console.log('Trial status:', JSON.stringify(trialData, null, 2));
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testTrialSystem();