import { useCallback, useEffect, useState } from 'react';
import { adminProfileAPI } from '../api/api';

const FALLBACK_WEBSITE_URL = 'https://shivacrackers.pattaz.com/';

function normalizeWebsiteUrl(url) {
  const value = String(url || '').trim();
  if (!value) return FALLBACK_WEBSITE_URL;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
}

export default function useWebsitePreviewUrl() {
  const [websiteUrl, setWebsiteUrl] = useState(FALLBACK_WEBSITE_URL);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await adminProfileAPI.getProfile();
        const profileUrl = normalizeWebsiteUrl(response?.data?.web_url);
        if (mounted) setWebsiteUrl(profileUrl);
      } catch (err) {
        if (mounted) setWebsiteUrl(FALLBACK_WEBSITE_URL);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getPreviewUrl = useCallback((previewVersion = 0) => {
    const cacheBuster = previewVersion || Date.now();
    try {
      const url = new URL(websiteUrl);
      url.searchParams.set('preview', String(cacheBuster));
      url.searchParams.set('_cb', String(cacheBuster));
      return url.toString();
    } catch (err) {
      return `${FALLBACK_WEBSITE_URL}?preview=${cacheBuster}&_cb=${cacheBuster}`;
    }
  }, [websiteUrl]);

  return { websiteUrl, getPreviewUrl };
}
