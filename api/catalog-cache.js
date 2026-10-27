/**
 * In-process, bounded cache for public read-only catalog responses.
 *
 * A single concurrent MySQL query serves all simultaneous requests.
 * Success is cached briefly; errors invalidate prior data instead of
 * presenting stale inventory as available.
 * Per Node process only: no external service and no database mutations.
 */
export function createCatalogCache({ttlMs=5000,errorCooldownMs=1000,now=Date.now}={}){
  if(!Number.isInteger(ttlMs)||ttlMs<0)throw new Error('Invalid catalog cache TTL');
  if(!Number.isInteger(errorCooldownMs)||errorCooldownMs<0)throw new Error('Invalid catalog cooldown');
  let snapshot=null;
  let expiresAt=0;
  let inFlight=null;
  let lastError=null;
  let retryAt=0;
  return {
    read(loader){
      if(snapshot!==null && now()<expiresAt)return Promise.resolve(snapshot);
      if(inFlight)return inFlight;
      // Brief circuit breaker: do not hammer MySQL when a connection fails.
      if(lastError!==null && now()<retryAt)return Promise.reject(lastError);
      inFlight=Promise.resolve()
        .then(loader)
        .then(value=>{
          snapshot=value;
          expiresAt=now()+ttlMs;
          lastError=null;
          retryAt=0;
          return value;
        },error=>{
          // Never serve stock from an expired or failed refresh.
          snapshot=null;
          expiresAt=0;
          lastError=error;
          retryAt=now()+errorCooldownMs;
          throw error;
        })
        .finally(()=>{inFlight=null;});
      return inFlight;
    }
  };
}
