# Peonies Boutique · Digital Catalog Guide

This guide covers everything you need to run and look after the in-store catalog. You don't need any technical knowledge.

---

## 1. What's in the folder

```
Peonies Catalog/
├─ Start Peonies Catalog.bat   ← double-click this to open the catalog full screen
├─ index.html                  ← the catalog itself (you can also open it directly in Edge or Chrome)
├─ Guide.html                  ← this guide
├─ css/                        ← design (do not edit)
├─ js/                         ← program files (do not edit)
├─ assets/
│  ├─ brand/                   ← logo, frame, textures and peony illustrations from your brand files
│  └─ fonts/                   ← fonts included so the catalog works offline
├─ sample-media/               ← a sample film and photo you can use to try uploading
└─ browser-data/               ← created automatically on first start; holds your saved catalog
```

Keep the folder together. Don't rename or move the files inside it.

---

## 2. Opening the catalog on the Windows touchscreen

1. Copy the whole **Peonies Catalog** folder to the computer, for example to `C:\Peonies Catalog`. Avoid temporary places like Downloads or the Desktop on a shared account.
2. Double-click **Start Peonies Catalog.bat**.
   - It opens the catalog **full screen** in Microsoft Edge, or Google Chrome if Edge isn't there.
   - It uses its own browser profile (the `browser-data` folder), so your catalog stays separate from normal web browsing.
   - Film sound is allowed, swiping back is turned off, and page pinch-zoom is turned off. Customers can still zoom into photos.
3. To **close** the catalog, press **Alt + F4** on a keyboard.

**Start automatically when the computer turns on (recommended):**
Press **Windows + R**, type `shell:startup` and press Enter. A folder opens. Right-click **Start Peonies Catalog.bat**, choose **Create shortcut**, and drag the shortcut into that folder.

**Tips for the screen:**
- Windows Settings → System → Power: set the screen to **never** turn off or sleep. The catalog's own screensaver takes over instead.
- Always start the catalog with the same launcher. Opening `index.html` another way (for example in your everyday Edge window) uses a different storage area, and it will look like the catalog is empty or showing samples.

On first start, the catalog shows **sample content**. Every sample is labelled "Sample" so you can tell it apart from your own designs.

---

## 2b. Installing on an Android screen (Taktik and similar)

The catalog can also be installed as an app on Android touchscreens. Once installed, it opens full screen, **works without internet** and keeps everything saved on the screen itself.

1. Connect the screen to Wi-Fi (needed only for installing and for updates).
2. Open **Chrome** on the screen and go to your catalog address, for example `https://YOUR-GITHUB-NAME.github.io/peonies-catalog/`.
3. Wait a few seconds, then tap Chrome's **⋮** menu → **Install app** (or **Add to Home screen**). You can also use **Admin → Display → Install as app on this screen**.
4. Open **Peonies Catalog** from the home screen. It now runs full screen. Do your Admin setup here (photos, film, PIN). Don't use the Chrome tab for this, because the installed app keeps its own saved data.
5. **Lock the screen to the catalog (free):** Android Settings → Security (or Security & privacy → More) → **App pinning / Screen pinning** → On. Then open the catalog, open the recent-apps view, tap the catalog's icon and choose **Pin**. To unpin, hold Back + Overview (or follow the message shown on screen).
6. The screen stays awake while the catalog is open. Also set the display's sleep or standby timer to its longest setting, or off.

**Where your content lives on Android:** photos, film and settings are stored inside the installed app on that screen. They are **never uploaded to GitHub**. GitHub only hosts the empty app (code, brand graphics and sample pictures). Backups download to the screen's **Download** folder. From there, copy them to a USB stick or upload them to Google Drive.

**Updates:** if the app files on GitHub are updated, the screen picks up the new version the next time it opens while connected to Wi-Fi. Your content is not affected.

---

## 3. Opening Admin Mode

- **Press and hold the Peonies Boutique logo for 3 seconds** (on the home screen, the top bar, or the film screen), then enter your PIN.
- With a keyboard you can also press **Ctrl + Alt + P**.
- The default PIN is **1234**. Change it right away under **Security**.
- To leave Admin Mode, tap **Return to catalog** at the bottom left. Admin Mode also locks itself after 10 minutes without activity (you can change this).
- **Preview catalog** lets you see the customer view and come back to Admin Mode with one tap.

---

## 4. Categories (collections)

Go to **Admin → Categories**.

| To… | Do this |
|---|---|
| Add a category | **Add category** → enter the English name (and Arabic, optional) → **Create category** |
| Rename / edit | Tap the category or the pencil icon → change it → **Save category** |
| Choose a cover image | In the editor: **Upload image** or **Choose existing**. **Use automatic** uses the first photo of the first arrangement |
| Reorder | Drag the ⠿ handle up or down. The new order is saved immediately |
| Hide / show | Tap the eye icon. Hidden categories and their arrangements are invisible to customers |
| Delete | Tap the bin icon. If it has arrangements, choose whether to **move them to another category** or **delete them too** |
| See its arrangements | **View arrangements** |

---

## 5. Arrangements

Go to **Admin → Arrangements**.

**Add an arrangement:**
1. Tap **Add arrangement**.
2. **Upload photos**. You can pick several at once, or drag image files from a folder onto the Photos box. Photos are previewed (marked "New") and only saved when you tap **Add to catalog**.
3. Enter a **name** (or a reference code) and choose a **category**. Everything else is optional: Arabic name, description, price, tags, Featured and Visible.
4. Tap **Add to catalog**.

**Photos:**
- The **first photo is the cover**. Reorder by dragging a photo, or with the ◀ ▶ arrows.
- **↻ Replace** swaps a photo. **🗑 Remove** takes it off the arrangement.
- **Choose from library** reuses photos you already have. Nothing is stored twice: if you upload the same photo again, the catalog spots it and reuses the copy it has.
- Large photos are resized automatically (longest side 2400 px), and small thumbnails are made for fast browsing.
- iPhone **HEIC** photos can't be read by browsers. Export them as JPG first. Damaged files are reported clearly and skipped.

**Other actions** (icons on each row):
- ☆ **Featured**: shows the design in *Featured* and in the screensaver slideshow.
- 👁 **Hide / show**: hides a design without deleting it.
- ⧉ **Duplicate**: makes a copy. The copy starts **hidden** so you can finish it first.
- ✎ **Edit** and 🗑 **Delete**. Deleting also removes its photos, unless another arrangement still uses them.
- **Several at once:** tick the boxes, then use **Move to…, Show, Hide, Feature, Unfeature** or **Delete**.
- **Change the display order:** choose one category in the filter at the top, then drag the ⠿ handles.

Empty optional fields (price, description, tags, code) are simply not shown to customers. You can also switch off prices, codes, tags and descriptions for everyone under **Display**.

---

## 6. The promotional film

Go to **Admin → Film & Screensaver**.

- **Upload film**: choose an **MP4 (H.264)** or **WebM** video. Most phone and editing apps export MP4. The film is saved on the computer and plays **without internet**.
- **Replace film** swaps it. **Remove film** deletes it, and the Film button disappears for customers until you add a new one.
- In the catalog, the film **starts automatically and loops**. Customers get discreet controls for play/pause, sound, a progress bar and full screen. The controls fade away after a few seconds.
- **Start with sound:** browsers sometimes block sound until the screen is touched. If that happens the film starts muted and customers can tap the speaker. The Windows launcher allows sound.
- Very large videos (over about 500 MB) make backups slow. A 1080p film of a few minutes is ideal.

**Screensaver (Attract Mode):** turn it on, choose how many seconds without a touch before it starts, and choose what it shows: the film, or a slideshow of your Featured arrangements. The **first touch** closes it and returns to the catalog. Use **Preview screensaver** to try it.

**Return to home screen:** after the set time without touches, the catalog closes open photos and search and switches back to the default language, so each customer starts fresh.

Tap **Save changes** in the bar at the bottom after changing settings.

---

## 7. Display, brand and language

- **Display:** choose the opening screen (Home, Featured, New Arrivals or Film), photos per row, which information is shown, Arabic on/off, and the default language.
- **Brand:** replace or restore the logo, edit all welcome and heading texts in English and Arabic, choose a colour scheme (Olive Classic, Ivory Light or Blush Romance), and turn the watercolour peony decorations on or off.
- **Arabic:** customers tap **العربية** to switch. The layout flips to right-to-left and shows the Arabic names and descriptions you entered. Where Arabic is empty, the English text is shown.

---

## 8. Backups and restoring

Go to **Admin → Backup & Data**.

**Saved on this computer vs. portable backup:**
- Every change you save is stored **inside the browser profile on this computer** (`browser-data` folder). It survives closing, refreshing and restarting. It is **not** shared with other computers, and it could be lost if the browser data is cleared, the folder is deleted or the disk fails.
- A **backup** is one **.zip** file with everything: categories, arrangements, settings, all photos and the film. It's the safe, portable copy.

**Create a backup:** tap **Download full backup**. The file (for example `Peonies-Catalog-Backup-2026-11-22-1430.zip`) goes to the **Downloads** folder. Copy it to a USB stick or cloud drive. Back up after every big round of changes. The Overview page reminds you if your last backup is more than 7 days old.

**Restore a backup:** tap **Choose backup file…** and select the .zip. You see what's inside before confirming. Restoring **replaces everything** currently in the catalog, so back up the current catalog first if you might need it. Don't unzip or edit the backup file.

**Sample content:** **Remove sample content** deletes all items marked "Sample", plus sample categories that are left empty. Categories you've added your own designs to are kept.

**Start over:** **Erase the whole catalog…** deletes everything except your PIN.

---

## 9. Moving the catalog to another computer or touchscreen

**Recommended method (always works):**
1. On the old computer: **Admin → Backup & Data → Download full backup**.
2. Copy the **Peonies Catalog** folder and the backup **.zip** to the new computer, for example with a USB stick.
3. On the new computer: start **Start Peonies Catalog.bat**. It opens with sample content.
4. Enter Admin Mode (PIN **1234** on a new computer) → **Backup & Data → Choose backup file…** → select the .zip → **Replace and restore**.
5. Your PIN, settings, photos and film are now on the new computer.

**Quick method (same Windows setup):** close the catalog (Alt+F4) and copy the entire **Peonies Catalog** folder, including `browser-data`. This usually carries everything over. It can fail between different browser versions, so keep a backup .zip as well.

---

## 10. Limitations

- **Where data lives:** the catalog runs entirely in the browser, with no server, internet or subscription. Content is stored with the browser's built-in database (IndexedDB) inside the `browser-data` profile. Photos and video are kept there as files, not in the small "localStorage". Storage space is a share of the free disk space, usually many gigabytes. **Admin → Media Library** shows how much is used.
- **Permanent storage:** the catalog asks the browser to protect its data from automatic clean-up. Media Library shows whether the browser said yes. On local files the browser often says "Not confirmed". Data is still saved normally (tested across restarts), but regular backups are your real safety net.
- **Don't clear browsing data** for the catalog's browser profile, and don't use InPrivate/Incognito or Edge's built-in "kiosk mode" (Windows *Assigned Access*). Those wipe data when they close, which is why the launcher uses its own normal profile instead.
- **PIN security:** the PIN stops customers from getting into Admin Mode. It is not strong security. It is stored only as a one-way fingerprint (hash), but someone with a keyboard, technical knowledge and access to the computer could get around it or clear the data. Keep the Windows account itself locked to staff.
- **Forgotten PIN:** with a keyboard, open the catalog in Edge or Chrome with `#reset-pin` added to the end of the address (for example `file:///C:/Peonies%20Catalog/index.html#reset-pin`) and confirm. The PIN goes back to **1234**. Your content isn't affected.
- **One window at a time:** don't open the catalog in two windows with the same profile.
- **Browsers:** made for current **Microsoft Edge** and **Google Chrome** on Windows, and **Chrome on Android**. Firefox and Safari aren't supported.
- **Android:** don't clear Chrome's data or storage for the catalog, and don't uninstall the app, without first downloading a backup.
- **Backup size:** a single backup file can't be bigger than 4 GB.

---

## 11. Quick troubleshooting

| Problem | Solution |
|---|---|
| The catalog shows only samples / looks empty | It was opened in a different browser or profile. Close it and use **Start Peonies Catalog.bat** |
| Film doesn't play | Use MP4 (H.264) or WebM. Re-export the video and upload it again |
| Film has no sound | Tap the speaker icon, or turn on **Start with sound** and use the launcher |
| A photo shows "This image could not be displayed" | The file is damaged or missing. Replace it in the arrangement editor |
| Touch keyboard of Windows covers the screen | The catalog has its own on-screen keyboard for search. In Admin Mode, use the Windows touch keyboard or a USB keyboard |
| Catalog stuck or looks odd | Press F5 to reload. Nothing saved is lost |
