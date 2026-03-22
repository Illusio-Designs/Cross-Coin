// Facebook Pixel event tracking utility
// options can include { eventID } for server-side deduplication
export function fbqTrack(event, params = {}, options = {}) {
  if (typeof window !== "undefined" && window.fbq) {
    try {
      const blockedEvents = ['SubscribedButtonClick'];
      if (blockedEvents.includes(event)) return false;
      // Pass options as 4th arg — Facebook uses eventID for deduplication with Conversions API
      if (options && Object.keys(options).length > 0) {
        window.fbq("track", event, params, options);
      } else {
        window.fbq("track", event, params);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  return false;
}
