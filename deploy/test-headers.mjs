import { argv } from 'process';

async function auditUrl(url, redirectManual = false) {
  console.log(`\nAuditing URL: ${url}`);
  try {
    const options = {};
    if (redirectManual) {
      options.redirect = 'manual';
    }
    const res = await fetch(url, options);
    console.log(`Status: ${res.status} ${res.statusText}`);
    
    // Print all headers
    console.log('Headers:');
    const headersObj = {};
    for (const [key, value] of res.headers.entries()) {
      headersObj[key] = value;
      console.log(`  ${key}: ${value}`);
    }

    // Specific security checks
    const hsts = res.headers.get('strict-transport-security');
    const xContentType = res.headers.get('x-content-type-options');
    const referrerPolicy = res.headers.get('referrer-policy');
    const location = res.headers.get('location');

    console.log('\nSecurity Header Assessment:');
    
    if (hsts) {
      console.log(`  [PASS] Strict-Transport-Security: ${hsts}`);
    } else {
      console.log('  [FAIL] Strict-Transport-Security is missing!');
    }

    if (xContentType) {
      if (xContentType.toLowerCase() === 'nosniff') {
        console.log(`  [PASS] X-Content-Type-Options: ${xContentType}`);
      } else {
        console.log(`  [WARNING] X-Content-Type-Options is present but set to "${xContentType}" instead of "nosniff"`);
      }
    } else {
      console.log('  [FAIL] X-Content-Type-Options is missing!');
    }

    if (referrerPolicy) {
      console.log(`  [PASS] Referrer-Policy: ${referrerPolicy}`);
    } else {
      console.log('  [FAIL] Referrer-Policy is missing!');
    }

    if (redirectManual) {
      if (res.status === 301) {
        console.log(`  [PASS] HTTP redirect status is 301.`);
      } else {
        console.log(`  [FAIL] HTTP redirect status is ${res.status} (expected 301).`);
      }
      if (location && location.startsWith('https://')) {
        console.log(`  [PASS] Redirect location is secure: ${location}`);
      } else {
        console.log(`  [FAIL] Redirect location: ${location || 'None'}`);
      }
    }

    return {
      status: res.status,
      headers: headersObj,
      hsts,
      xContentType,
      referrerPolicy,
      location
    };
  } catch (err) {
    console.error(`  [ERROR] Fetch failed:`, err.message);
    return { error: err.message };
  }
}

async function run() {
  console.log('=== Starting HTTP Header Security Audit ===');
  
  const results = {};
  
  // 1. HTTPS root
  results.httpsRoot = await auditUrl('https://arise-ai.pusan.ac.kr/');
  
  // 2. HTTPS health
  results.httpsHealth = await auditUrl('https://arise-ai.pusan.ac.kr/health');
  
  // 3. HTTP root (redirect test)
  results.httpRoot = await auditUrl('http://arise-ai.pusan.ac.kr/', true);
  
  console.log('\n=== Audit Summary ===');
  const checks = [
    { name: 'HTTPS Root HSTS', passed: !!results.httpsRoot?.hsts },
    { name: 'HTTPS Root X-Content-Type-Options', passed: results.httpsRoot?.xContentType?.toLowerCase() === 'nosniff' },
    { name: 'HTTPS Root Referrer-Policy', passed: !!results.httpsRoot?.referrerPolicy },
    { name: 'HTTPS Health HSTS', passed: !!results.httpsHealth?.hsts },
    { name: 'HTTPS Health X-Content-Type-Options', passed: results.httpsHealth?.xContentType?.toLowerCase() === 'nosniff' },
    { name: 'HTTPS Health Referrer-Policy', passed: !!results.httpsHealth?.referrerPolicy },
    { name: 'HTTP 301 Redirect to HTTPS', passed: results.httpRoot?.status === 301 && results.httpRoot?.location?.startsWith('https://') }
  ];

  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.passed ? '✓' : '✗'} ${check.name}`);
    if (!check.passed) allPassed = false;
  }
  
  console.log(`\nGlobal Audit Result: ${allPassed ? 'PASS' : 'FAIL'}`);
}

run();
