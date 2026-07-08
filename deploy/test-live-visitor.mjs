// test-live-visitor.mjs
// Verifies all public pages, API endpoints, and redirects of https://arise-ai.pusan.ac.kr
// Run this with Node.js 18+ to test the live server from a visitor's perspective.

import { performance } from 'perf_hooks';

const targets = [
  {
    name: 'Gateway (HTTPS)',
    url: 'https://arise-ai.pusan.ac.kr/',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Pre-application page',
    url: 'https://arise-ai.pusan.ac.kr/admission-v3-dark.html',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Eligibility check',
    url: 'https://arise-ai.pusan.ac.kr/eligibility.html',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Scholarship check',
    url: 'https://arise-ai.pusan.ac.kr/scholarship.html',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Department edit page',
    url: 'https://arise-ai.pusan.ac.kr/dept-edit-request',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Bymonolog landing',
    url: 'https://arise-ai.pusan.ac.kr/bymonolog',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Bymonolog hub',
    url: 'https://arise-ai.pusan.ac.kr/bymonolog/hub',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Bymonolog grad',
    url: 'https://arise-ai.pusan.ac.kr/bymonolog/grad',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Bymonolog aura',
    url: 'https://arise-ai.pusan.ac.kr/bymonolog/aura',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Google AI Ecosystem (Redirect)',
    url: 'https://arise-ai.pusan.ac.kr/google',
    expectedStatus: 301,
    redirect: 'manual',
    expectedLocation: '/google/'
  },
  {
    name: 'Google AI Ecosystem (Final)',
    url: 'https://arise-ai.pusan.ac.kr/google/',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Public API departments',
    url: 'https://arise-ai.pusan.ac.kr/api/departments',
    expectedStatus: 200,
    checkDepartments: true
  },
  {
    name: 'IP HTTP access check',
    url: 'http://164.125.19.178/',
    expectedStatus: 200,
    checkHtml: true
  },
  {
    name: 'Domain HTTP port 80 redirect',
    url: 'http://arise-ai.pusan.ac.kr/',
    expectedStatus: 301,
    redirect: 'manual',
    expectedLocation: 'https://arise-ai.pusan.ac.kr/'
  }
];

let passCount = 0;
let failCount = 0;
const results = [];

console.log(`[TEST START] Verifying https://arise-ai.pusan.ac.kr (Local Time: ${new Date().toISOString()})\n`);

for (const target of targets) {
  const start = performance.now();
  console.log(`Testing: ${target.name} (${target.url})...`);
  
  try {
    const fetchOptions = {};
    if (target.redirect) {
      fetchOptions.redirect = target.redirect;
    }
    
    const response = await fetch(target.url, fetchOptions);
    const duration = performance.now() - start;
    
    let isOk = true;
    const errors = [];
    
    // Check status code
    if (response.status !== target.expectedStatus) {
      isOk = false;
      errors.push(`Expected status ${target.expectedStatus}, but got ${response.status}`);
    }
    
    // Check redirect location if manual redirect
    let redirectLocation = null;
    if (target.redirect === 'manual') {
      redirectLocation = response.headers.get('location');
      if (target.expectedLocation) {
        if (!redirectLocation || !redirectLocation.includes(target.expectedLocation)) {
          isOk = false;
          errors.push(`Expected redirect Location to contain "${target.expectedLocation}", but got "${redirectLocation}"`);
        }
      }
    }
    
    // Check response body
    let bodySnippet = '';
    let responseText = '';
    if (response.status === 200) {
      responseText = await response.text();
      bodySnippet = responseText.substring(0, 100).replace(/\s+/g, ' ');
      
      if (target.checkHtml) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          isOk = false;
          errors.push(`Expected text/html content-type, but got "${contentType}"`);
        }
        if (!responseText.includes('<html') && !responseText.includes('<HTML') && !responseText.includes('<!doctype') && !responseText.includes('<!DOCTYPE')) {
          isOk = false;
          errors.push('Response body does not appear to contain HTML content');
        }
      }
      
      if (target.checkDepartments) {
        try {
          const depts = JSON.parse(responseText);
          if (!Array.isArray(depts)) {
            isOk = false;
            errors.push('Expected JSON array for departments list, but it is not an array');
          } else {
            const hasDept = depts.some(d => d.name === '정보융합공학과');
            if (!hasDept) {
              isOk = false;
              errors.push('Assert failed: departments list does not contain "정보융합공학과"');
            }
            const names = depts.slice(0, 5).map(d => d.name).join(', ');
            bodySnippet = `Array of ${depts.length} departments (sample: ${names})`;
          }
        } catch (e) {
          isOk = false;
          errors.push(`Failed to parse JSON response: ${e.message}`);
        }
      }
    }
    
    const resultObj = {
      name: target.name,
      url: target.url,
      status: response.status,
      expectedStatus: target.expectedStatus,
      durationMs: Math.round(duration),
      redirectLocation,
      snippet: bodySnippet,
      passed: isOk,
      errors
    };
    
    if (isOk) {
      passCount++;
      console.log(`  [PASS] status: ${response.status}, took ${Math.round(duration)}ms`);
    } else {
      failCount++;
      console.log(`  [FAIL] status: ${response.status}, took ${Math.round(duration)}ms\n         Errors: ${errors.join('; ')}`);
    }
    
    results.push(resultObj);
  } catch (err) {
    const duration = performance.now() - start;
    failCount++;
    console.log(`  [ERROR] Connection failed: ${err.message}, took ${Math.round(duration)}ms`);
    results.push({
      name: target.name,
      url: target.url,
      status: 'CONNECTION_ERROR',
      expectedStatus: target.expectedStatus,
      durationMs: Math.round(duration),
      passed: false,
      errors: [err.message]
    });
  }
  console.log();
}

console.log('--------------------------------------------------');
console.log(`[TEST REPORT SUMMARY]`);
console.log(`Total tests run: ${targets.length}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('--------------------------------------------------');

// Output JSON result string so it can be parsed or captured
console.log('\n===JSON_RESULTS_START===');
console.log(JSON.stringify(results, null, 2));
console.log('===JSON_RESULTS_END===');

process.exit(failCount > 0 ? 1 : 0);
