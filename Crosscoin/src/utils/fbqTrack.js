// Facebook Pixel event tracking utility
export function fbqTrack(event, params = {}) {
  if (typeof window !== "undefined" && window.fbq) {
    try {
      const blockedEvents = ['SubscribedButtonClick'];
      if (blockedEvents.includes(event)) {
        return false;
      }
      window.fbq("track", event, params);
      return true;
    } catch (error) {
      return false;
    }
  }
  return false;
}
