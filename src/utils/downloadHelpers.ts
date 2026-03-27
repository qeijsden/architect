// Download helper utilities for the Architect app

export interface DownloadInfo {
  name: string;
  filename: string;
  url: string;
  size?: string;
  icon?: string;
}

// You can update these URLs to your actual release URLs
export const DOWNLOADS: Record<string, DownloadInfo> = {
  windows: {
    name: 'Windows',
    filename: 'Architect-Setup.exe',
    url: 'https://github.com/YOUR-USERNAME/architect/releases/download/v0.1.0/Architect-Setup-0.1.0.exe',
    size: '105MB',
  },
  linux: {
    name: 'Linux',
    filename: 'Architect.AppImage',
    url: 'https://github.com/YOUR-USERNAME/architect/releases/download/v0.1.0/Architect-0.1.0.AppImage',
    size: '100MB',
  },
};

/**
 * Initiates a file download
 * @param url - The URL of the file to download
 * @param filename - The filename to save as
 */
export const downloadFile = (url: string, filename: string) => {
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  
  // Add to DOM, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Opens the download URL in a new tab (for direct GitHub links)
 * @param url - The URL to open
 */
export const openDownloadPage = (url: string) => {
  window.open(url, '_blank');
};

/**
 * Gets the appropriate download link for the detected OS
 */
export const getOSDownload = (): DownloadInfo | null => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('win')) {
    return DOWNLOADS.windows;
  } else if (userAgent.includes('linux')) {
    return DOWNLOADS.linux;
  }
  
  return null;
};
