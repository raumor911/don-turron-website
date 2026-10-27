/**
 * In-process, bounded cache for public read-only catalog responses.
 *
 * A single concurrent MySQL query serves all simultaneous requests.
 * Success is cached briefly; errors invalidate prior data instead of
 * presenting stale inventory as available.
 * Per Node process only: no external service and no database mutations.
 */
export function createCatalogCache({ttlMs=5000,now=Date.now}={}){
  if(!Number.isInteger(ttlMs)||ttlMs<0)throw new Error('Invalid catalog cache TTL');
  let snapshot=null;
  let expiresAt=0;
  let inFlight=null;
  return {
    read(loader){
      if(snapshot!==null && now()<expiresAt)return Promise.resolve(snapshot);
      if(inFlight)return inFlight;
      inFlight=Promise.resolve()
        .then(loader)
        .then(value=>{
          snapshot=value;
          expiresAt=now()+ttlMs;
          return value;
        },error=>{
          // Never serve stock from an expired or failed refresh.
          snapshot=null;
          expiresAt=0;
          throw error;
        })
        .finally(()=>{inFlight=null;});
      return inFlight;
    }
  };
}
