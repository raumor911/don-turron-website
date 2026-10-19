const rules=[
 [/OAI-SearchBot/i,'OAI-SearchBot','OpenAI','search'],
 [/ChatGPT-User/i,'ChatGPT-User','OpenAI','user_fetch'],
 [/GPTBot/i,'GPTBot','OpenAI','training_crawl'],
 [/Claude-SearchBot/i,'Claude-SearchBot','Anthropic','search'],
 [/Claude-User/i,'Claude-User','Anthropic','user_fetch'],
 [/ClaudeBot/i,'ClaudeBot','Anthropic','training_crawl'],
 [/PerplexityBot/i,'PerplexityBot','Perplexity','search'],
 [/Googlebot/i,'Googlebot','Google','search'],
 [/bingbot/i,'bingbot','Microsoft','search'],
 [/Applebot/i,'Applebot','Apple','search'],
 [/Meta-ExternalAgent/i,'Meta-ExternalAgent','Meta','crawl']
];
export function detectCrawler(ua){
 if(typeof ua!=='string'||!ua)return null;
 // Google-Extended is a robots control token, not a separate HTTP robot.
 if(/Google-Extended/i.test(ua) && !/Googlebot/i.test(ua)) return null;
 for(const [pattern,name,family,purpose] of rules){
  const token=pattern.source;
  if(new RegExp('(?:^|[^\\w-])'+token+'(?=$|[^\\w-])','i').test(ua))
   return {crawler_name:name,crawler_family:family,crawler_purpose:purpose,detection_method:'user_agent',verification_status:'claimed'};
 }
 if(/(?:^|[^a-z])(?:bot|crawler|spider|slurp)(?:$|[^a-z])/i.test(ua)||/[a-z]+bot(?:\b|\/)/i.test(ua))
  return {crawler_name:'generic-crawler',crawler_family:'Other',crawler_purpose:'unknown',detection_method:'user_agent',verification_status:'claimed'};
 return null;
}
