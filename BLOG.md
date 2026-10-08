# Blog editor setup

The `/blog/` application uses BlockNote, React, Firebase Authentication, and Firestore. It provides owner-only new pages, rich-text editing, topic creation via the topic field, dates, drafts, publishing/unpublishing, and deletion. Articles sort newest first within each topic. Visitors see only published documents. Saving is explicit; navigating away from unsaved edits prompts you first.

## Connect Firebase

1. Create or select a Firebase project and register a Web app.
2. Enable Authentication → Google sign-in. Add `ychuang2112sub.github.io` to authorized domains.
3. Create a Firestore database using locked/production rules.
4. Find your user UID under Authentication → Users. If needed, sign in with Google in another app connected to this project first, or temporarily set `ownerUid` to `SETUP` in the configuration to enable this app's sign-in. Sign in, then retrieve your UID from the Firebase console. Do not use an email address as the UID.
5. Replace `REPLACE_WITH_YOUR_FIREBASE_UID` in `firestore.rules` with that exact UID. Deploy the rules in the Firestore console. Merge these rules carefully if this Firebase project already stores other applications' data; replacing all rules can affect those applications.
6. Edit the root `blog-config.js`:

```js
window.BLOG_CONFIG = {
  firebase: {
    apiKey: 'YOUR_WEB_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT',
    appId: 'YOUR_WEB_APP_ID'
  },
  ownerUid: 'YOUR_FIREBASE_UID'
};
```

Firebase web configuration is public. Never commit service-account keys or private credentials. Rules enforce authorization regardless of whether visitors alter the UI.

7. Commit the configuration. GitHub Pages builds the editor automatically. Open `/blog/`, sign in, create a page, enter its title/topic/date, and save a draft or publish.

Until configuration is available, the existing blog remains readable and `/blog/` shows a setup message. After configuration, the Blog tab displays the new application. Previous static articles remain in `assets/js/blog-data.js`; they are not automatically migrated into Firestore.

## Local development

```sh
cd blog-app
npm install
npm run dev
```

For development, copy the root `blog-config.js` to `blog-app/public/blog-config.js`, and authorize localhost in Firebase Authentication. Do not commit local private credentials. `npm run build` writes the static app to `/blog` for deployment.

## Scope

Text, headings, lists, links, and standard BlockNote formatting are supported. Media storage/upload integration is not configured. There is no autosave or revision history yet. Drafts are stored in private Firestore documents; publishing changes their read permission. A signed-in non-owner has read-only access.
