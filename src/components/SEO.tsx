import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  canonicalUrl?: string;
  children?: React.ReactNode;
}

const BASE_URL = "https://vinciai.lovable.app";
const DEFAULT_TITLE = "VinciAI - Create Stunning Images, Videos & 3D Models with AI";
const DEFAULT_DESCRIPTION = "Generate breathtaking images, videos, and 3D models up to Full HD with VinciAI. Powered by Renaissance-inspired artificial intelligence.";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  author,
  publishedTime,
  modifiedTime,
  section,
  noIndex = false,
  noFollow = false,
  canonicalUrl,
  children,
}: SEOProps) {
  const location = useLocation();
  
  const fullTitle = title ? `${title} | VinciAI` : DEFAULT_TITLE;
  const fullUrl = url || `${BASE_URL}${location.pathname}`;
  const canonical = canonicalUrl || fullUrl;

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement("meta");
        if (property) {
          meta.setAttribute("property", name);
        } else {
          meta.setAttribute("name", name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Helper to remove meta tag
    const removeMetaTag = (name: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      const meta = document.querySelector(selector);
      if (meta) meta.remove();
    };

    // Basic meta tags
    setMetaTag("description", description);
    
    if (keywords) {
      setMetaTag("keywords", keywords);
    }

    // Robots meta tag
    const robotsContent = [
      noIndex ? "noindex" : "index",
      noFollow ? "nofollow" : "follow"
    ].join(", ");
    setMetaTag("robots", robotsContent);

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonical);

    // Open Graph meta tags
    setMetaTag("og:title", fullTitle, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:type", type, true);
    setMetaTag("og:url", fullUrl, true);
    setMetaTag("og:image", image, true);
    setMetaTag("og:site_name", "VinciAI", true);
    setMetaTag("og:locale", "en_US", true);

    // Twitter meta tags
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", fullTitle);
    setMetaTag("twitter:description", description);
    setMetaTag("twitter:image", image);
    setMetaTag("twitter:site", "@VinciAI");

    // Article-specific meta tags
    if (type === "article") {
      if (author) {
        setMetaTag("article:author", author, true);
        setMetaTag("author", author);
      }
      if (publishedTime) {
        setMetaTag("article:published_time", publishedTime, true);
      }
      if (modifiedTime) {
        setMetaTag("article:modified_time", modifiedTime, true);
      }
      if (section) {
        setMetaTag("article:section", section, true);
      }
    } else {
      // Remove article-specific tags if not an article
      removeMetaTag("article:author", true);
      removeMetaTag("article:published_time", true);
      removeMetaTag("article:modified_time", true);
      removeMetaTag("article:section", true);
    }

    // Cleanup function - reset to defaults when component unmounts
    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag("description", DEFAULT_DESCRIPTION);
      setMetaTag("og:title", DEFAULT_TITLE, true);
      setMetaTag("og:description", DEFAULT_DESCRIPTION, true);
      setMetaTag("og:type", "website", true);
      setMetaTag("og:url", BASE_URL, true);
      setMetaTag("og:image", DEFAULT_IMAGE, true);
      setMetaTag("twitter:title", DEFAULT_TITLE);
      setMetaTag("twitter:description", DEFAULT_DESCRIPTION);
      setMetaTag("twitter:image", DEFAULT_IMAGE);
      setMetaTag("robots", "index, follow");
      
      // Remove article tags
      removeMetaTag("article:author", true);
      removeMetaTag("article:published_time", true);
      removeMetaTag("article:modified_time", true);
      removeMetaTag("article:section", true);
      removeMetaTag("author");
      
      // Reset canonical
      const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (canonicalLink) {
        canonicalLink.setAttribute("href", BASE_URL);
      }
    };
  }, [fullTitle, description, keywords, image, fullUrl, type, author, publishedTime, modifiedTime, section, noIndex, noFollow, canonical]);

  return <>{children}</>;
}

// Pre-configured SEO components for common page types
export function ArticleSEO({
  title,
  description,
  author,
  publishedTime,
  modifiedTime,
  section,
  image,
}: {
  title: string;
  description: string;
  author: string;
  publishedTime: string;
  modifiedTime?: string;
  section?: string;
  image?: string;
}) {
  return (
    <SEO
      title={title}
      description={description}
      type="article"
      author={author}
      publishedTime={publishedTime}
      modifiedTime={modifiedTime || publishedTime}
      section={section}
      image={image}
    />
  );
}

export function NoIndexSEO({ title, description }: { title?: string; description?: string }) {
  return <SEO title={title} description={description} noIndex noFollow />;
}
