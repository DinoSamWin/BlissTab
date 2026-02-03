
// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('StartlyTab Extension Installed');

    // Create context menu
    chrome.contextMenus.create({
        id: "add-to-startly",
        title: "Add page to StartlyTab",
        contexts: ["page", "link"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add-to-startly") {
        const url = info.linkUrl || info.pageUrl || tab?.url;
        const title = tab?.title || "New Gateway";
        const favIcon = tab?.favIconUrl || "";

        if (!url) return;

        // We can't open the action popup programmatically via script in most cases,
        // so we save it to pending and let the New Tab page (if open) or the next 
        // time the popup opens handle it. 
        // For now, let's treat it as a 'Quick Add' feature.
        const newGateway = {
            id: crypto.randomUUID(),
            url: url,
            title: title,
            icon: favIcon,
            color: '#cbd5e1',
            category: 'Shortcuts'
        };

        chrome.storage.local.set({ pendingGateway: newGateway }, () => {
            // Optional: Notify user
            console.log("Quick added gateway:", title);
        });
    }
});
