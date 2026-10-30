// Meta ad placements named the way Ads Manager's "Platform, placement and
// device" breakdown names them (Facebook · Facebook feed · In-app,
// WhatsApp · Status…), for both sides of the traffic report:
//  - Meta's own delivery rows (publisher_platform / platform_position /
//    device_platform from the insights API), and
//  - our visits, whose ad link carried placement={{placement}}
//    (e.g. "Facebook_Mobile_Feed", "Instagram_Reels", "Whatsapp_Status").
// Both resolve to the same { platform, placement } so they line up.

const PLATFORM = {
  facebook: 'Facebook', instagram: 'Instagram', audience_network: 'Audience Network',
  messenger: 'Messenger', whatsapp: 'WhatsApp', threads: 'Threads', oculus: 'Meta Quest',
};

const POSITION = {
  facebook: {
    feed: 'Facebook feed', facebook_reels: 'Facebook Reels', facebook_reels_overlay: 'Facebook Reels overlay',
    facebook_stories: 'Facebook Stories', marketplace: 'Marketplace', video_feeds: 'Facebook video feeds',
    instream_video: 'Facebook in-stream videos', search: 'Facebook search results', right_hand_column: 'Right column',
    profile_feed: 'Facebook profile feed', notification: 'Facebook notifications', biz_disco_feed: 'Facebook Business Explore',
  },
  instagram: {
    stream: 'Feed', feed: 'Feed', instagram_reels: 'Instagram Reels', story: 'Instagram Stories', instagram_stories: 'Instagram Stories',
    explore: 'Instagram Explore', explore_home: 'Instagram Explore home', profile_feed: 'Instagram profile feed',
    ig_search: 'Instagram search results', instagram_search: 'Instagram search results', profile_reels: 'Instagram profile reels',
  },
  audience_network: {
    classic: 'Native, banner and interstitial', an_classic: 'Native, banner and interstitial',
    rewarded_video: 'Rewarded videos', instream_video: 'Audience Network in-stream videos',
  },
  whatsapp: { status: 'Status', whatsapp_status: 'Status' },
  messenger: { messenger_inbox: 'Messenger inbox', messenger_stories: 'Messenger Stories', messenger_sponsored_messages: 'Sponsored messages' },
  threads: { threads_stream: 'Threads feed', feed: 'Threads feed' },
};

const DEVICE = { mobile_app: 'In-app', mobile_web: 'Mobile web', desktop: 'Desktop' };

const pretty = (v) => String(v || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase()) || 'Unknown';

/** Meta insights row values → Ads Manager labels. */
function fromInsights(platform, position, device) {
  const p = String(platform || '').toLowerCase();
  const pos = String(position || '').toLowerCase();
  return {
    platform: PLATFORM[p] || pretty(p),
    placement: (POSITION[p] && POSITION[p][pos]) || pretty(pos),
    device: DEVICE[String(device || '').toLowerCase()] || (device ? pretty(device) : ''),
  };
}

/** Our visit's placement={{placement}} value → the same labels. */
function fromUrlValue(value) {
  let v = String(value || '');
  try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (_) { /* keep raw */ }
  const t = v.toLowerCase().replace(/[\s-]+/g, '_');
  if (!t) return { platform: 'Unknown', placement: 'Unknown' };
  let platform = null;
  if (/^(fb|facebook)/.test(t)) platform = 'facebook';
  else if (/^(ig|instagram)/.test(t)) platform = 'instagram';
  else if (/^(an|audience)/.test(t) || /audience_network/.test(t)) platform = 'audience_network';
  else if (/^(wa|whatsapp)/.test(t)) platform = 'whatsapp';
  else if (/^(msg|messenger)/.test(t)) platform = 'messenger';
  else if (/^threads/.test(t)) platform = 'threads';
  let pos = null;
  if (platform === 'facebook') {
    pos = /reels?_overlay/.test(t) ? 'facebook_reels_overlay' : /reel/.test(t) ? 'facebook_reels' : /stor/.test(t) ? 'facebook_stories'
      : /marketplace/.test(t) ? 'marketplace' : /instream|in_stream/.test(t) ? 'instream_video' : /right/.test(t) ? 'right_hand_column'
      : /search/.test(t) ? 'search' : /video_feed/.test(t) ? 'video_feeds' : /profile/.test(t) ? 'profile_feed' : /feed/.test(t) ? 'feed' : null;
  } else if (platform === 'instagram') {
    pos = /reel/.test(t) ? 'instagram_reels' : /stor/.test(t) ? 'instagram_stories' : /explore_home/.test(t) ? 'explore_home'
      : /explore/.test(t) ? 'explore' : /search/.test(t) ? 'ig_search' : /profile/.test(t) ? 'profile_feed' : /feed|stream/.test(t) ? 'feed' : null;
  } else if (platform === 'audience_network') {
    pos = /reward/.test(t) ? 'rewarded_video' : /instream|in_stream/.test(t) ? 'instream_video' : 'classic';
  } else if (platform === 'whatsapp') {
    pos = 'status';
  } else if (platform === 'messenger') {
    pos = /stor/.test(t) ? 'messenger_stories' : 'messenger_inbox';
  } else if (platform === 'threads') {
    pos = 'threads_stream';
  }
  if (!platform) return { platform: 'Other', placement: pretty(v) };
  return { platform: PLATFORM[platform], placement: (pos && POSITION[platform][pos]) || pretty(t.replace(/^[a-z]+_/, '')) };
}

module.exports = { fromInsights, fromUrlValue };
