# Google Apps Script Email Notification Deployment & Update Guide

This service ensures all customer orders, contact requests, and inquiries are instantly emailed directly to **`globalherbsinc@gmail.com`**.

When an admin email arrives in `globalherbsinc@gmail.com`, clicking **Reply** in Gmail responds directly to the customer's email address.

---

## ⚡ How to Update the Live Deployment (Takes 1 Minute)

> **Important**: In Google Apps Script, editing code alone does not update the active Web App URL until you publish a **New Version** of the deployment. Follow these steps:

1. Go to **[script.google.com](https://script.google.com/)** and open your **Global Herbs Email Notifications** project (or sign in with `globalherbsinc@gmail.com`).
2. Open `Code.gs` in the editor.
3. Replace all code in `Code.gs` with the updated code from `/google-apps-script/Code.gs` in this repository.
4. Click the **Save** icon (diskette).
5. (Optional but recommended): In the function dropdown at the top, select **`testSendToGlobalHerbs`** and click **Run**. Check your `globalherbsinc@gmail.com` inbox to verify immediate delivery.
6. Click **Deploy** (top-right blue button) > **Manage deployments**.
7. In the left panel, select your active **Web app** deployment.
8. Click the **Edit** (pencil) icon at the top right.
9. In the **Version** dropdown, choose **New version**.
10. Ensure:
    - **Execute as**: **Me (`your-google-account`)**
    - **Who has access**: **Anyone** *(Crucial: allows the backend to send notifications)*
11. Click **Deploy**.
12. Copy the **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).
13. If your Web App URL changed, update the `GOOGLE_APPS_SCRIPT_URL` environment variable in Vercel and AI Studio Settings.

---

## Direct Test via Command Line or API

Once deployed, you can trigger a test email directly to `globalherbsinc@gmail.com`:

```bash
curl -X POST "https://globalherbs.site/api/test-email" \
  -H "Content-Type: application/json" \
  -d '{"email": "globalherbsinc@gmail.com"}'
```

Or view status at:
`https://globalherbs.site/api/notification-status`
