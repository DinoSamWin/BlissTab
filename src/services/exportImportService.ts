
import { QuickLink } from '../types';
import { canonicalizeUrl } from './urlCanonicalService';
import { COLORS } from '../constants';

interface ExportData {
    version: number;
    timestamp: number;
    source: 'focustab';
    links: QuickLink[];
}

export const exportUserData = (links: QuickLink[]): string => {
    const data: ExportData = {
        version: 1,
        timestamp: Date.now(),
        source: 'focustab',
        links: links
    };
    return JSON.stringify(data, null, 2);
};

export const parseImportData = (jsonString: string): QuickLink[] => {
    try {
        const data = JSON.parse(jsonString);
        let links: any[] = [];

        // Detect format
        if (data.source === 'focustab' && Array.isArray(data.links)) {
            links = data.links;
        } else if (Array.isArray(data)) {
            // Basic array check
            links = data;
        } else {
            throw new Error('Unknown format');
        }

        // Validate and sanitize
        return links.map((item: any, index: number) => {
            // Ensure required fields
            const url = item.url || '';
            const title = item.title || item.name || url; // Fallback

            // Basic validation
            if (!url) return null;

            return {
                id: item.id || `imported-${Date.now()}-${index}`,
                url: url,
                title: title,
                icon: item.icon || null,
                color: item.color || COLORS[Math.floor(Math.random() * COLORS.length)],
                category: item.category || undefined,
                canonicalUrl: item.canonicalUrl || undefined, // Will be recalculated if missing
                customTitle: item.customTitle || null,
                customLogoPath: item.customLogoPath || null,
                customLogoUrl: item.customLogoUrl || null,
                customLogoSignedUrl: item.customLogoSignedUrl || null,
                customLogoHash: item.customLogoHash || null,
            } as QuickLink;
        }).filter((l): l is QuickLink => l !== null);

    } catch (e) {
        console.error("Import parsing failed", e);
        throw new Error('Invalid file format');
    }
};

export const parseInfinityImport = (jsonString: string): QuickLink[] => {
    try {
        const data = JSON.parse(jsonString);
        let sites: any[] = [];

        // Infinity Tab Structure Analysis based on sample:
        // root -> data -> site -> sites (Array of arrays of objects)
        if (data.data && data.data.site && Array.isArray(data.data.site.sites)) {
            // Flatten the array of arrays
            data.data.site.sites.forEach((group: any[]) => {
                if (Array.isArray(group)) {
                    sites.push(...group);
                }
            });
        } else {
            throw new Error('Invalid Infinity Tab backup format: Missing sites data');
        }

        return sites.map((item: any, index: number) => {
            const url = item.target || item.url;
            // Basic validation
            if (!url) return null;

            // Generate a stable ID
            const id = `infinity-${item.id || Date.now() + '-' + index}`;

            // Try to use their bgImage (icon) if it's a valid URL, otherwise null
            // Infinity often uses 'bgImage' for custom icons
            let icon = null;
            if (item.bgImage && item.bgImage.startsWith('http')) {
                icon = item.bgImage;
            }

            // Calculate canonical URL
            let canonicalUrl = undefined;
            try {
                canonicalUrl = canonicalizeUrl(url);
            } catch (e) {
                // Ignore canonicalization errors
            }

            return {
                id: id,
                url: url,
                title: item.name || item.title || 'Untitled',
                icon: icon, // Use bgImage as icon
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                category: 'Imported', // Group them under "Imported" or verify if Infinity has groups
                canonicalUrl: canonicalUrl,
                customTitle: item.name || null, // Preserve their custom name
                customLogoUrl: icon, // Treat bgImage as custom logo
                // Reset other custom fields
                customLogoPath: null,
                customLogoSignedUrl: null,
                customLogoHash: null,
            } as QuickLink;
        }).filter((l): l is QuickLink => l !== null);

    } catch (e: any) {
        console.error("Infinity import parsing failed", e);
        throw new Error(e.message || 'Failed to parse Infinity Tab file');
    }
}
