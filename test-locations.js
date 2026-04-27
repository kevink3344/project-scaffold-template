import http from 'http';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': ''
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  try {
    console.log('Step 1: Login with dev credentials...');
    const loginRes = await makeRequest('POST', '/api/dev/login', {
      username: 'devadmin',
      password: 'localpass123'
    });
    
    console.log('Login status:', loginRes.status);
    
    const setCookie = loginRes.headers['set-cookie'];
    let sessionCookie = '';
    if (setCookie) {
      sessionCookie = setCookie[0].split(';')[0];
      console.log('Session established:', sessionCookie.substring(0, 20) + '...');
    }

    console.log('\nStep 2: Sync locations from WCPSS...');
    const syncRes = await makeRequest('POST', '/api/locations/sync', {});
    
    console.log('Sync status:', syncRes.status);
    
    if (syncRes.status === 200) {
      const syncData = JSON.parse(syncRes.body);
      console.log('✓ SUCCESS!');
      console.log('  Synced locations:', syncData.synced);
      console.log('  Total locations from WCPSS:', syncData.total);
    } else {
      console.log('✗ ERROR syncing locations');
      console.log('  Response:', syncRes.body);
    }

    console.log('\nStep 3: List all locations from database...');
    const listRes = await makeRequest('GET', '/api/locations');
    
    console.log('List status:', listRes.status);
    if (listRes.status === 200) {
      try {
        const locations = JSON.parse(listRes.body);
        if (Array.isArray(locations)) {
          console.log('✓ Total locations in database:', locations.length);
          if (locations.length > 0) {
            console.log('\nFirst 3 locations:');
            locations.slice(0, 3).forEach((loc, i) => {
              console.log('  ' + (i+1) + '.' + (loc.name || loc.Name || JSON.stringify(loc)));
            });
          }
        } else {
          console.log('Response is not an array:', JSON.stringify(locations, null, 2).substring(0, 200));
        }
      } catch (e) {
        console.log('Failed to parse response:', listRes.body.substring(0, 200));
      }
    } else {
      console.log('✗ Failed to list locations');
      console.log('  Response:', listRes.body.substring(0, 200));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
