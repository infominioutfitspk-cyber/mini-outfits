/**
 * Cloudflare Cache Rules Auto-Deployer
 * Automatically resolves the ruleset ID for the http_request_cache_settings phase
 * and deploys the 4 required storefront cache rules.
 */

// Environment variables are loaded natively using: node --env-file=.env.local scripts/deploy-cloudflare-rules.js

const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!zoneId || !apiToken) {
  console.error('Error: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN missing in .env.local');
  process.exit(1);
}

const payload = {
  rules: [
    {
      expression: '(http.request.uri.path contains "/cart") or (http.request.uri.path contains "/checkout") or (http.request.uri.path contains "/account") or (http.request.uri.path contains "/api") or (http.request.uri.path contains "/admin")',
      description: 'no-cache-dynamic',
      action: 'set_cache_settings',
      action_parameters: {
        cache: false
      }
    },
    {
      expression: '(http.request.uri.path contains "/_next/static/")',
      description: 'static-assets',
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: {
          mode: 'override_origin',
          default: 31536000
        }
      }
    },
    {
      expression: '(http.request.uri.path wildcard "/*")',
      description: 'html-pages',
      action: 'set_cache_settings',
      action_parameters: {
        cache: false
      }
    },
    {
      expression: '(http.request.full_uri contains "supabase.co")',
      description: 'supabase-images',
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: {
          mode: 'override_origin',
          default: 2592000
        }
      }
    }
  ]
};

async function getRulesetId() {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await res.json();
  if (!data.success) {
    throw new Error('Cloudflare API Error: ' + JSON.stringify(data.errors));
  }
  
  const cacheRuleset = data.result.find(r => r.phase === 'http_request_cache_settings');
  if (!cacheRuleset) {
    throw new Error('Could not find ruleset for phase http_request_cache_settings');
  }
  
  return cacheRuleset.id;
}

async function deployDNSRecord() {
  let verificationValue = process.env.GOOGLE_SITE_VERIFICATION || '';
  verificationValue = verificationValue.trim().replace(/^['"]|['"]$/g, '');
  
  if (!verificationValue) {
    console.log('No GOOGLE_SITE_VERIFICATION found in environment, skipping DNS record deployment.');
    return;
  }
  
  let dnsContent = verificationValue;
  if (!dnsContent.includes('google-site-verification')) {
    dnsContent = `google-site-verification=${dnsContent}`;
  } else {
    dnsContent = dnsContent.replace('google-site-verification:', 'google-site-verification=').replace(/\s+/g, '');
  }
  
  console.log(`Checking existing DNS TXT records for google-site-verification...`);
  const listUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT`;
  const listRes = await fetch(listUrl, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const listData = await listRes.json();
  if (!listData.success) {
    throw new Error('Failed to list DNS records: ' + JSON.stringify(listData.errors));
  }
  
  const existingRecord = listData.result.find(r => r.content.includes('google-site-verification'));
  
  if (existingRecord) {
    console.log(`Updating existing DNS record ${existingRecord.id} with content: ${dnsContent}...`);
    const updateUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'TXT',
        name: '@',
        content: dnsContent,
        ttl: 3600
      })
    });
    
    const updateData = await updateRes.json();
    if (updateData.success) {
      console.log(`SUCCESS: DNS TXT record updated successfully with content: ${dnsContent}`);
    } else {
      console.error(`FAILED to update DNS record:`, JSON.stringify(updateData.errors, null, 2));
    }
  } else {
    console.log(`Creating new DNS TXT record with content: ${dnsContent}...`);
    const createUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'TXT',
        name: '@',
        content: dnsContent,
        ttl: 3600
      })
    });
    
    const createData = await createRes.json();
    if (createData.success) {
      console.log(`SUCCESS: DNS TXT record created successfully with content: ${dnsContent}`);
    } else {
      console.error(`FAILED to create DNS record:`, JSON.stringify(createData.errors, null, 2));
    }
  }
}

async function proxyCNAMERecords() {
  console.log(`Checking CNAME records to enable Cloudflare Proxy (Orange Cloud)...`);
  const listUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME`;
  const listRes = await fetch(listUrl, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const listData = await listRes.json();
  if (!listData.success) {
    throw new Error('Failed to list CNAME DNS records: ' + JSON.stringify(listData.errors));
  }
  
  // Find CNAME records that are DNS-only (not proxied) and point to vercel or match the domain names
  const targetRecords = listData.result.filter(r => !r.proxied && (r.content.includes('vercel') || r.name.includes('minioutfits')));
  
  if (targetRecords.length === 0) {
    console.log('No DNS-only CNAME records found for proxying. All target records are already proxied (orange cloud).');
    return;
  }
  
  for (const record of targetRecords) {
    console.log(`Enabling proxy (Orange Cloud) for CNAME record ${record.name} (${record.id})...`);
    const updateUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${record.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: record.name,
        content: record.content,
        ttl: 1, // 'Auto' in Cloudflare requires TTL to be 1 when proxied is true
        proxied: true
      })
    });
    
    const updateData = await updateRes.json();
    if (updateData.success) {
      console.log(`SUCCESS: CNAME record ${record.name} is now proxied (Orange Cloud)!`);
    } else {
      console.error(`FAILED to proxy CNAME record ${record.name}:`, JSON.stringify(updateData.errors, null, 2));
    }
  }
}

async function deployRules() {
  try {
    console.log('Resolving Cloudflare Cache Ruleset ID...');
    const rulesetId = await getRulesetId();
    console.log(`Found ruleset ID: ${rulesetId}`);
    
    console.log('Deploying cache rules...');
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/rulesets/${rulesetId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (data.success) {
      console.log('SUCCESS: All 4 Cache Rules have been successfully deployed!');
      console.log(JSON.stringify(data.result.rules.map(r => r.description), null, 2));
    } else {
      console.error('FAILED to deploy rules:', JSON.stringify(data.errors, null, 2));
    }
    
    // Auto deploy the DNS record as requested by the user
    console.log('Deploying google-site-verification DNS record...');
    await deployDNSRecord();
    
    // Auto proxy the storefront CNAME records so cache rules actually execute
    console.log('Checking and enabling proxy (Orange Cloud) for CNAME records...');
    await proxyCNAMERecords();
  } catch (err) {
    console.error('Deployment script failed:', err.message);
  }
}

deployRules();
