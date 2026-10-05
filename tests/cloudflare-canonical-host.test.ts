import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalHearthafterRedirect} from '../src/lib/cloudflare/canonical-host';

test('the www alias preserves the path and query on the established HTTPS canonical origin', () => {
  const response = canonicalHearthafterRedirect(new Request('https://www.hearthafter.homes/world?chapter=overlap'));
  assert.equal(response?.status, 308);
  assert.equal(response?.headers.get('Location'), 'https://hearthafter.homes/world?chapter=overlap');
  assert.equal(response?.headers.get('X-Content-Type-Options'), 'nosniff');
});
test('HEAD canonicalizes while writes retain their existing origin and authentication checks', () => {
  assert.equal(canonicalHearthafterRedirect(new Request('https://www.hearthafter.homes/desk/placements', {method:'HEAD'}))?.status, 308);
  assert.equal(canonicalHearthafterRedirect(new Request('https://www.hearthafter.homes/api/placements', {method:'POST', body:'{}'})), null);
});
test('canonical and unrelated hosts pass through; a path cannot create an external redirect', () => {
  assert.equal(canonicalHearthafterRedirect(new Request('https://hearthafter.homes/')), null);
  assert.equal(canonicalHearthafterRedirect(new Request('https://other.example/')), null);
  const location = canonicalHearthafterRedirect(new Request('https://www.hearthafter.homes:8443//other.example/path'))?.headers.get('Location');
  assert.equal(location, 'https://hearthafter.homes//other.example/path');
});